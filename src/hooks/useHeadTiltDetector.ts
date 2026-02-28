import { useRef, useCallback } from 'react';
import {
  PoseLandmarker,
  FilesetResolver,
} from '@mediapipe/tasks-vision';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import type { HeadTiltResult } from '../types';

// MediaPipe Pose landmark indices
const LEFT_EYE = 2;
const RIGHT_EYE = 5;
const LEFT_SHOULDER = 11;
const RIGHT_SHOULDER = 12;

/** Required landmarks for upper body: eyes + shoulders */
const UPPER_BODY_INDICES = [LEFT_EYE, RIGHT_EYE, LEFT_SHOULDER, RIGHT_SHOULDER];

/** Min visibility score per landmark to consider it "visible" */
const VISIBILITY_THRESHOLD = 0.5;

/** Tilt angle thresholds with hysteresis (degrees) */
const TILT_ANGLE_ENTER = 15;  // |angle| > 15° to enter tilted state
const TILT_ANGLE_EXIT = 8;    // |angle| < 8° to return to center

// --- Stabilization ---
const TILT_COOLDOWN_MS = 1500;
const STABLE_FRAMES_REQUIRED = 6;

// --- Upper-body visibility stabilization ---
const BODY_VISIBLE_FRAMES = 10;
const BODY_HIDDEN_FRAMES = 15;

/** Pick the pose whose shoulder center-X is closest to 0.5. */
function pickCenterPoseByShoulder(poses: NormalizedLandmark[][]): NormalizedLandmark[] {
  if (poses.length === 1) return poses[0];

  let bestIdx = 0;
  let bestDist = Infinity;
  for (let i = 0; i < poses.length; i++) {
    const cx = (poses[i][LEFT_SHOULDER].x + poses[i][RIGHT_SHOULDER].x) / 2;
    const dist = Math.abs(cx - 0.5);
    if (dist < bestDist) {
      bestDist = dist;
      bestIdx = i;
    }
  }
  return poses[bestIdx];
}

export function useHeadTiltDetector() {
  const landmarkerRef = useRef<PoseLandmarker | null>(null);

  // Tilt detection stabilization state
  const rawTiltedFrames = useRef(0);
  const rawCenterFrames = useRef(0);
  const stableTilted = useRef(false);
  const lastCountTime = useRef(0);

  // Upper-body visibility stabilization
  const rawBodyVisibleFrames = useRef(0);
  const rawBodyHiddenFrames = useRef(0);
  const stableBodyVisible = useRef(false);

  const resetStabilization = useCallback(() => {
    rawTiltedFrames.current = 0;
    rawCenterFrames.current = 0;
    stableTilted.current = false;
    lastCountTime.current = 0;
    rawBodyVisibleFrames.current = 0;
    rawBodyHiddenFrames.current = 0;
    stableBodyVisible.current = false;
  }, []);

  const init = useCallback(async () => {
    if (landmarkerRef.current) return landmarkerRef.current;

    const fileset = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm',
    );

    const landmarker = await PoseLandmarker.createFromOptions(fileset, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numPoses: 4,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
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
        if (!result.landmarks || result.landmarks.length === 0) return null;

        const landmarks = pickCenterPoseByShoulder(result.landmarks);

        const leftEye = landmarks[LEFT_EYE];
        const rightEye = landmarks[RIGHT_EYE];

        // Check upper body visibility (raw per-frame)
        const rawVisible = UPPER_BODY_INDICES.every(
          (idx) => (landmarks[idx].visibility ?? 0) >= VISIBILITY_THRESHOLD,
        );

        // Stabilize visibility
        if (rawVisible) {
          rawBodyVisibleFrames.current++;
          rawBodyHiddenFrames.current = 0;
        } else {
          rawBodyHiddenFrames.current++;
          rawBodyVisibleFrames.current = 0;
        }
        if (!stableBodyVisible.current && rawBodyVisibleFrames.current >= BODY_VISIBLE_FRAMES) {
          stableBodyVisible.current = true;
        }
        if (stableBodyVisible.current && rawBodyHiddenFrames.current >= BODY_HIDDEN_FRAMES) {
          stableBodyVisible.current = false;
        }
        const upperBodyVisible = stableBodyVisible.current;

        // Calculate tilt angle from eye positions
        const tiltAngle =
          Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x) * (180 / Math.PI);

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
