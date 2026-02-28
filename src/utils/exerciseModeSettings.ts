import type { ExerciseMode } from '../types';

const STORAGE_KEY = 'nemunai_exercise_mode';

export function getExerciseMode(): ExerciseMode {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'fullbody' || stored === 'upperbody') return stored;
  return 'fullbody';
}

export function setExerciseMode(mode: ExerciseMode): void {
  localStorage.setItem(STORAGE_KEY, mode);
}
