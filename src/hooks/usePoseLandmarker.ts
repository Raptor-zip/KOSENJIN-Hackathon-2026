import { useRef, useCallback } from 'react';
import {
  PoseLandmarker,
  FilesetResolver,
} from '@mediapipe/tasks-vision';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import type { SquatResult } from '../types';

// MediaPipe Pose landmark indices
const LEFT_SHOULDER = 11;
const RIGHT_SHOULDER = 12;
const LEFT_HIP = 23;
const RIGHT_HIP = 24;
const LEFT_KNEE = 25;
const RIGHT_KNEE = 26;
const LEFT_ANKLE = 27;
const RIGHT_ANKLE = 28;

/** Required landmarks for full body: shoulders, hips, knees, ankles */
const FULL_BODY_INDICES = [
  LEFT_SHOULDER, RIGHT_SHOULDER,
  LEFT_HIP, RIGHT_HIP,
  LEFT_KNEE, RIGHT_KNEE,
  LEFT_ANKLE, RIGHT_ANKLE,
];

/** Min visibility score per landmark to consider it "visible" */
const VISIBILITY_THRESHOLD = 0.5;

/** Angle thresholds with hysteresis to prevent flickering */
const SQUAT_ANGLE_ENTER = 100;   // Both knees must bend below this to enter squat
const SQUAT_ANGLE_EXIT = 150;    // Both knees must straighten above this to count as stood up

// --- Squat detection stabilization ---
const SQUAT_COOLDOWN_MS = 1500;        // min time between counted squats
const STABLE_FRAMES_REQUIRED = 6;      // frames a state must hold to be "real" (~200ms at 30fps)

// --- Full-body visibility stabilization ---
const BODY_VISIBLE_FRAMES = 10;        // frames body must be visible to flip to "visible" (~330ms)
const BODY_HIDDEN_FRAMES = 15;         // frames body must be hidden to flip to "hidden" (~500ms)

function computeAngle(
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number },
): number {
  const ba = { x: a.x - b.x, y: a.y - b.y };
  const bc = { x: c.x - b.x, y: c.y - b.y };
  const dot = ba.x * bc.x + ba.y * bc.y;
  const magBA = Math.sqrt(ba.x ** 2 + ba.y ** 2);
  const magBC = Math.sqrt(bc.x ** 2 + bc.y ** 2);
  if (magBA === 0 || magBC === 0) return 180;
  const cosAngle = Math.max(-1, Math.min(1, dot / (magBA * magBC)));
  return (Math.acos(cosAngle) * 180) / Math.PI;
}

/** Pick the pose whose hip center-X is closest to 0.5. */
function pickCenterPose(poses: NormalizedLandmark[][]): NormalizedLandmark[] {
  if (poses.length === 1) return poses[0];

  let bestIdx = 0;
  let bestDist = Infinity;
  for (let i = 0; i < poses.length; i++) {
    const cx = (poses[i][LEFT_HIP].x + poses[i][RIGHT_HIP].x) / 2;
    const dist = Math.abs(cx - 0.5);
    if (dist < bestDist) {
      bestDist = dist;
      bestIdx = i;
    }
  }
  return poses[bestIdx];
}

export function usePoseLandmarker() {
  const landmarkerRef = useRef<PoseLandmarker | null>(null);

  // Stabilization state
  const rawSquatFrames = useRef(0);       // consecutive frames raw=squatting
  const rawStandFrames = useRef(0);       // consecutive frames raw=standing
  const stableSquatting = useRef(false);   // debounced squat state
  const lastCountTime = useRef(0);         // timestamp of last counted squat

  // Full-body visibility stabilization
  const rawBodyVisibleFrames = useRef(0);
  const rawBodyHiddenFrames = useRef(0);
  const stableBodyVisible = useRef(false);

  const resetStabilization = useCallback(() => {
    rawSquatFrames.current = 0;
    rawStandFrames.current = 0;
    stableSquatting.current = false;
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

  const detectSquat = useCallback(
    (
      video: HTMLVideoElement,
      timestampMs: number,
    ): (SquatResult & { counted: boolean }) | null => {
      const landmarker = landmarkerRef.current;
      if (!landmarker || video.readyState < 2) return null;

      try {
        const result = landmarker.detectForVideo(video, timestampMs);
        if (!result.landmarks || result.landmarks.length === 0) return null;

        const landmarks = pickCenterPose(result.landmarks);

        const leftHip = landmarks[LEFT_HIP];
        const rightHip = landmarks[RIGHT_HIP];
        const leftKnee = landmarks[LEFT_KNEE];
        const rightKnee = landmarks[RIGHT_KNEE];
        const leftAnkle = landmarks[LEFT_ANKLE];
        const rightAnkle = landmarks[RIGHT_ANKLE];

        // Check full body visibility (raw per-frame)
        const rawBodyVisible = FULL_BODY_INDICES.every(
          (idx) => (landmarks[idx].visibility ?? 0) >= VISIBILITY_THRESHOLD,
        );

        // Stabilize full-body visibility to prevent flickering
        if (rawBodyVisible) {
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
        const fullBodyVisible = stableBodyVisible.current;

        const hipY = (leftHip.y + rightHip.y) / 2;
        const leftAngle = computeAngle(leftHip, leftKnee, leftAnkle);
        const rightAngle = computeAngle(rightHip, rightKnee, rightAnkle);
        const kneeAngle = (leftAngle + rightAngle) / 2;

        let counted = false;

        // Only run squat detection when full body is visible
        if (!fullBodyVisible) {
          // Reset everything — noisy partial detections must not accumulate
          rawSquatFrames.current = 0;
          rawStandFrames.current = 0;
        } else {
          // Hysteresis: different thresholds for entering/exiting squat
          const rawIsSquatting =
            leftAngle < SQUAT_ANGLE_ENTER &&
            rightAngle < SQUAT_ANGLE_ENTER;

          const rawIsStanding =
            leftAngle > SQUAT_ANGLE_EXIT &&
            rightAngle > SQUAT_ANGLE_EXIT;

          // --- Stabilization: require N consecutive frames to confirm state ---
          if (rawIsSquatting) {
            rawSquatFrames.current++;
            rawStandFrames.current = 0;
          } else if (rawIsStanding) {
            rawStandFrames.current++;
            rawSquatFrames.current = 0;
          } else {
            // In the dead zone — don't count toward either state
            rawSquatFrames.current = 0;
            rawStandFrames.current = 0;
          }

          const prevStable = stableSquatting.current;
          if (!stableSquatting.current && rawSquatFrames.current >= STABLE_FRAMES_REQUIRED) {
            stableSquatting.current = true;
          }
          if (stableSquatting.current && rawStandFrames.current >= STABLE_FRAMES_REQUIRED) {
            stableSquatting.current = false;
          }

          // Count a squat: stable transition squat→stand with cooldown
          if (prevStable && !stableSquatting.current) {
            const now = performance.now();
            if (now - lastCountTime.current >= SQUAT_COOLDOWN_MS) {
              counted = true;
              lastCountTime.current = now;
            }
          }
        }

        return {
          isSquatting: stableSquatting.current,
          hipY,
          kneeAngle,
          landmarks,
          counted,
          fullBodyVisible,
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

  return { init, detectSquat, close, landmarkerRef };
}
