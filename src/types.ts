import type { NormalizedLandmark } from '@mediapipe/tasks-vision';

export type AppState = 'start' | 'monitoring' | 'penalty';

export interface EARResult {
  left: number;
  right: number;
  average: number;
  landmarks: NormalizedLandmark[];
}

export interface SquatResult {
  isSquatting: boolean;
  hipY: number;
  kneeAngle: number;
  landmarks: NormalizedLandmark[];
}
