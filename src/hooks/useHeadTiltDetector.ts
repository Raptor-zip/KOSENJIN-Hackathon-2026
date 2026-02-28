import { useRef, useCallback } from 'react';
import {
  FaceLandmarker,
  FilesetResolver,
} from '@mediapipe/tasks-vision';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import type { HeadTiltResult } from '../types';

// FaceMesh landmark indices for tilt calculation
// Silhouette outer contour — left/right edges of the face
const RIGHT_CHEEK = 234;   // right edge of face
const LEFT_CHEEK = 454;    // left edge of face

/** Tilt angle thresholds with hysteresis (degrees) */
const TILT_ANGLE_ENTER = 12;  // |angle| > 12° to enter tilted state
const TILT_ANGLE_EXIT = 6;    // |angle| < 6° to return to center

// --- Stabilization ---
const TILT_COOLDOWN_MS = 1200;
const STABLE_FRAMES_REQUIRED = 5;

// --- Face visibility stabilization ---
const FACE_VISIBLE_FRAMES = 6;
const FACE_HIDDEN_FRAMES = 10;

/** Pick the face whose center-X is closest to 0.5 (screen center). */
function pickCenterFace(faces: NormalizedLandmark[][]): NormalizedLandmark[] {
  if (faces.length === 1) return faces[0];

  let bestIdx = 0;
  let bestDist = Infinity;
  for (let i = 0; i < faces.length; i++) {
    const cx =
      faces[i].reduce((sum, lm) => sum + lm.x, 0) / faces[i].length;
    const dist = Math.abs(cx - 0.5);
    if (dist < bestDist) {
      bestDist = dist;
      bestIdx = i;
    }
  }
  return faces[bestIdx];
}

/**
 * Calculate head roll angle using face landmarks.
 * Uses the line between left and right cheek edges for robust measurement.
 * Falls back to nose-forehead line if cheek landmarks are unreliable.
 */
function calculateRollAngle(landmarks: NormalizedLandmark[]): number {
  const rightCheek = landmarks[RIGHT_CHEEK];
  const leftCheek = landmarks[LEFT_CHEEK];

  // Primary: cheek-to-cheek horizontal line
  const angle = Math.atan2(
    leftCheek.y - rightCheek.y,
    leftCheek.x - rightCheek.x,
  ) * (180 / Math.PI);

  return angle;
}

export function useHeadTiltDetector() {
  const landmarkerRef = useRef<FaceLandmarker | null>(null);

  // Tilt detection stabilization state
  const rawTiltedFrames = useRef(0);
  const rawCenterFrames = useRef(0);
  const stableTilted = useRef(false);
  const lastCountTime = useRef(0);

  // Face visibility stabilization
  const rawFaceVisibleFrames = useRef(0);
  const rawFaceHiddenFrames = useRef(0);
  const stableFaceVisible = useRef(false);

  const resetStabilization = useCallback(() => {
    rawTiltedFrames.current = 0;
    rawCenterFrames.current = 0;
    stableTilted.current = false;
    lastCountTime.current = 0;
    rawFaceVisibleFrames.current = 0;
    rawFaceHiddenFrames.current = 0;
    stableFaceVisible.current = false;
  }, []);

  const init = useCallback(async () => {
    if (landmarkerRef.current) return landmarkerRef.current;

    const fileset = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm',
    );

    const landmarker = await FaceLandmarker.createFromOptions(fileset, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numFaces: 4,
      minFaceDetectionConfidence: 0.5,
      minFacePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
      outputFaceBlendshapes: false,
      outputFacialTransformationMatrixes: false,
    });

    landmarkerRef.current = landmarker;
    resetStabilization();
    return landmarker;
  }, [resetStabilization]);

  const detectTilt = useCallback(
    (
      video: HTMLVideoElement,
      timestampMs: number,
    ): (HeadTiltResult & { counted: boolean }) | null => {
      const landmarker = landmarkerRef.current;
      if (!landmarker || video.readyState < 2) return null;

      try {
        const result = landmarker.detectForVideo(video, timestampMs);
        if (!result.faceLandmarks || result.faceLandmarks.length === 0) {
          // No face detected — update visibility stabilization
          rawFaceHiddenFrames.current++;
          rawFaceVisibleFrames.current = 0;
          if (stableFaceVisible.current && rawFaceHiddenFrames.current >= FACE_HIDDEN_FRAMES) {
            stableFaceVisible.current = false;
          }
          return null;
        }

        const landmarks = pickCenterFace(result.faceLandmarks);

        // Face detected — update visibility stabilization
        rawFaceVisibleFrames.current++;
        rawFaceHiddenFrames.current = 0;
        if (!stableFaceVisible.current && rawFaceVisibleFrames.current >= FACE_VISIBLE_FRAMES) {
          stableFaceVisible.current = true;
        }
        const upperBodyVisible = stableFaceVisible.current;

        // Calculate tilt angle from face mesh landmarks
        const tiltAngle = calculateRollAngle(landmarks);

        let counted = false;

        if (!upperBodyVisible) {
          // Reset — noisy partial detections must not accumulate
          rawTiltedFrames.current = 0;
          rawCenterFrames.current = 0;
        } else {
          // Hysteresis: different thresholds for entering/exiting tilt
          const rawIsTilted = Math.abs(tiltAngle) > TILT_ANGLE_ENTER;
          const rawIsCenter = Math.abs(tiltAngle) < TILT_ANGLE_EXIT;

          // Stabilization: require N consecutive frames to confirm state
          if (rawIsTilted) {
            rawTiltedFrames.current++;
            rawCenterFrames.current = 0;
          } else if (rawIsCenter) {
            rawCenterFrames.current++;
            rawTiltedFrames.current = 0;
          } else {
            // In the dead zone
            rawTiltedFrames.current = 0;
            rawCenterFrames.current = 0;
          }

          const prevStable = stableTilted.current;
          if (!stableTilted.current && rawTiltedFrames.current >= STABLE_FRAMES_REQUIRED) {
            stableTilted.current = true;
          }
          if (stableTilted.current && rawCenterFrames.current >= STABLE_FRAMES_REQUIRED) {
            stableTilted.current = false;
          }

          // Count a tilt: stable transition tilted→center with cooldown
          if (prevStable && !stableTilted.current) {
            const now = performance.now();
            if (now - lastCountTime.current >= TILT_COOLDOWN_MS) {
              counted = true;
              lastCountTime.current = now;
            }
          }
        }

        return {
          isTilted: stableTilted.current,
          tiltAngle,
          landmarks,
          upperBodyVisible,
          counted,
        };
      } catch {
        return null;
      }
    },
    [],
  );

  const close = useCallback(() => {
    landmarkerRef.current?.close();
    landmarkerRef.current = null;
    resetStabilization();
  }, [resetStabilization]);

  return { init, detectTilt, close, landmarkerRef };
}
