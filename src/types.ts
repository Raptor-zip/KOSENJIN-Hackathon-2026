import type { NormalizedLandmark } from '@mediapipe/tasks-vision';

export type AppState = 'start' | 'monitoring' | 'penalty' | 'dashboard';

export interface DrowsinessEvent {
  timestamp: number;
  durationMs: number;
}

export interface SquatEvent {
  timestamp: number;
  count: number;
  durationMs: number;
}

export interface Session {
  id: string;
  startedAt: number;
  endedAt: number | null;
  drowsinessEvents: DrowsinessEvent[];
  squatEvents: SquatEvent[];
}

export interface DailySummary {
  date: string;         // 'YYYY-MM-DD'
  totalWorkMs: number;
  totalDrowsy: number;
  totalSquats: number;
  sessions: string[];
}

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
  fullBodyVisible: boolean;
  segmentationMask: Float32Array | null;
  maskWidth: number;
  maskHeight: number;
}

export type ExerciseMode = 'fullbody' | 'upperbody';

export interface HeadTiltResult {
  isTilted: boolean;
  tiltAngle: number;       // degrees, 正=右傾き 負=左傾き
  landmarks: NormalizedLandmark[];
  upperBodyVisible: boolean;
  counted: boolean;
}
