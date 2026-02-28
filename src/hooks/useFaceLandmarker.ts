import { useRef, useCallback } from 'react';
import {
  FaceLandmarker,
  FilesetResolver,
} from '@mediapipe/tasks-vision';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import type { EARResult } from '../types';

const RIGHT_EYE_INDICES = {
  top: [159, 158, 160],
  bottom: [145, 153, 144],
  left: 33,
  right: 133,
};

const LEFT_EYE_INDICES = {
  top: [386, 385, 387],
  bottom: [374, 380, 373],
  left: 362,
  right: 263,
};

function euclidean(
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function computeEAR(
  landmarks: { x: number; y: number }[],
  eye: typeof LEFT_EYE_INDICES,
): number {
  const verticalSum = eye.top.reduce((sum, topIdx, i) => {
    return sum + euclidean(landmarks[topIdx], landmarks[eye.bottom[i]]);
  }, 0);
  const horizontal = euclidean(landmarks[eye.left], landmarks[eye.right]);
  if (horizontal === 0) return 1;
  return verticalSum / (2 * horizontal);
}

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

export function useFaceLandmarker() {
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const wasmFilesetRef = useRef<Awaited<
    ReturnType<typeof FilesetResolver.forVisionTasks>
  > | null>(null);

  const init = useCallback(async () => {
    if (landmarkerRef.current) return landmarkerRef.current;

    if (!wasmFilesetRef.current) {
      wasmFilesetRef.current = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm',
      );
    }

    const landmarker = await FaceLandmarker.createFromOptions(
      wasmFilesetRef.current,
      {
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
      },
    );

    landmarkerRef.current = landmarker;
    return landmarker;
  }, []);

  const detectEAR = useCallback(
    (video: HTMLVideoElement, timestampMs: number): EARResult | null => {
      const landmarker = landmarkerRef.current;
      if (!landmarker || video.readyState < 2) return null;

      try {
        const result = landmarker.detectForVideo(video, timestampMs);
        if (!result.faceLandmarks || result.faceLandmarks.length === 0) {
          return null;
        }

        // Pick the face closest to screen center
        const landmarks = pickCenterFace(result.faceLandmarks);

        const leftEAR = computeEAR(landmarks, LEFT_EYE_INDICES);
        const rightEAR = computeEAR(landmarks, RIGHT_EYE_INDICES);
        const average = (leftEAR + rightEAR) / 2;

        return { left: leftEAR, right: rightEAR, average, landmarks };
      } catch {
        return null;
      }
    },
    [],
  );

  const close = useCallback(() => {
    landmarkerRef.current?.close();
    landmarkerRef.current = null;
  }, []);

  return { init, detectEAR, close, landmarkerRef };
}
