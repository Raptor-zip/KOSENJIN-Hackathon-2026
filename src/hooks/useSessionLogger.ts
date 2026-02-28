import { useRef, useEffect, useCallback } from 'react';
import type { Session, DailySummary, ExerciseMode } from '../types';
import {
  saveSession,
  getSession,
  getActiveSession,
  saveDailySummary,
  getDailySummary,
} from '../utils/db';

function dateKey(ms: number): string {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function countExercises(session: Session): { squats: number; stretches: number } {
  // Count from new exerciseEvents field
  const events = session.exerciseEvents ?? [];
  let squats = events
    .filter((e) => e.mode === 'fullbody')
    .reduce((sum, e) => sum + e.count, 0);
  let stretches = events
    .filter((e) => e.mode === 'upperbody')
    .reduce((sum, e) => sum + e.count, 0);

  // Also count legacy squatEvents that have no corresponding exerciseEvent
  const legacySquats = (session.squatEvents ?? []).reduce((sum, e) => sum + e.count, 0);
  if (events.length === 0 && legacySquats > 0) {
    squats += legacySquats;
  }

  return { squats, stretches };
}

async function updateDailySummary(session: Session): Promise<void> {
  const date = dateKey(session.startedAt);
  const existing = await getDailySummary(date);

  const endTime = session.endedAt ?? Date.now();
  const workMs = endTime - session.startedAt;
  const { squats, stretches } = countExercises(session);

  if (existing) {
    const hasSession = existing.sessions.includes(session.id);
    const summary: DailySummary = {
      date,
      totalWorkMs: hasSession
        ? existing.totalWorkMs
        : existing.totalWorkMs + workMs,
      totalDrowsy: hasSession
        ? existing.totalDrowsy
        : existing.totalDrowsy + session.drowsinessEvents.length,
      totalSquats: hasSession
        ? existing.totalSquats
        : existing.totalSquats + squats,
      totalStretches: hasSession
        ? (existing.totalStretches ?? 0)
        : (existing.totalStretches ?? 0) + stretches,
      sessions: hasSession
        ? existing.sessions
        : [...existing.sessions, session.id],
    };

    if (hasSession) {
      summary.totalWorkMs = existing.totalWorkMs;
      summary.totalDrowsy = existing.totalDrowsy;
      summary.totalSquats = existing.totalSquats;
      summary.totalStretches = existing.totalStretches ?? 0;
    }

    await saveDailySummary(summary);
  } else {
    await saveDailySummary({
      date,
      totalWorkMs: workMs,
      totalDrowsy: session.drowsinessEvents.length,
      totalSquats: squats,
      totalStretches: stretches,
      sessions: [session.id],
    });
  }
}

export function useSessionLogger() {
  const sessionIdRef = useRef<string | null>(null);
  const penaltyStartRef = useRef<number>(0);

  // Recover orphan sessions on mount
  useEffect(() => {
    const recover = async () => {
      try {
        const orphan = await getActiveSession();
        if (orphan) {
          // Close using the last event timestamp or startedAt
          const lastEvent = Math.max(
            orphan.startedAt,
            ...orphan.drowsinessEvents.map((e) => e.timestamp),
            ...orphan.squatEvents.map((e) => e.timestamp),
          );
          orphan.endedAt = lastEvent;
          await saveSession(orphan);
          await updateDailySummary(orphan);
        }
      } catch {
        // IDB unavailable — silently continue
      }
    };
    recover();
  }, []);

  const startSession = useCallback(async () => {
    try {
      const id = crypto.randomUUID();
      const session: Session = {
        id,
        startedAt: Date.now(),
        endedAt: null,
        drowsinessEvents: [],
        squatEvents: [],
        exerciseEvents: [],
      };
      await saveSession(session);
      sessionIdRef.current = id;
    } catch {
      // IDB unavailable
    }
  }, []);

  const logDrowsiness = useCallback(async (durationMs: number) => {
    const id = sessionIdRef.current;
    if (!id) return;
    try {
      const session = await getSession(id);
      if (!session) return;
      session.drowsinessEvents.push({
        timestamp: Date.now(),
        durationMs,
      });
      await saveSession(session);
      penaltyStartRef.current = Date.now();
    } catch {
      // IDB unavailable
    }
  }, []);

  const logExerciseCompletion = useCallback(async (count: number, mode: ExerciseMode) => {
    const id = sessionIdRef.current;
    if (!id) return;
    try {
      const session = await getSession(id);
      if (!session) return;
      const now = Date.now();
      const durationMs = penaltyStartRef.current
        ? now - penaltyStartRef.current
        : 0;

      // Write to both legacy and new fields for compatibility
      session.squatEvents.push({ timestamp: now, count, durationMs });
      if (!session.exerciseEvents) session.exerciseEvents = [];
      session.exerciseEvents.push({ timestamp: now, count, durationMs, mode });

      await saveSession(session);
      penaltyStartRef.current = 0;
    } catch {
      // IDB unavailable
    }
  }, []);

  const endSession = useCallback(async () => {
    const id = sessionIdRef.current;
    if (!id) return;
    try {
      const session = await getSession(id);
      if (!session) return;
      session.endedAt = Date.now();
      await saveSession(session);
      await updateDailySummary(session);
      sessionIdRef.current = null;
    } catch {
      // IDB unavailable
    }
  }, []);

  return { startSession, logDrowsiness, logExerciseCompletion, endSession };
}
