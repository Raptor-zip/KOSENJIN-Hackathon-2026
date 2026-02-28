import { useRef, useEffect, useCallback } from 'react';
import type { Session, DailySummary } from '../types';
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

async function updateDailySummary(session: Session): Promise<void> {
  const date = dateKey(session.startedAt);
  const existing = await getDailySummary(date);

  const endTime = session.endedAt ?? Date.now();
  const workMs = endTime - session.startedAt;

  if (existing) {
    // Update if session already tracked, otherwise add
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
        : existing.totalSquats +
          session.squatEvents.reduce((sum, e) => sum + e.count, 0),
      sessions: hasSession
        ? existing.sessions
        : [...existing.sessions, session.id],
    };

    // If session was already tracked, recalculate from scratch
    if (hasSession) {
      // We just re-save — the values are already correct from initial add
      // But we should update the work time for the current session
      // Recalculate: remove old contribution and add new
      summary.totalWorkMs = existing.totalWorkMs; // keep as-is for finalized sessions
      summary.totalDrowsy = existing.totalDrowsy;
      summary.totalSquats = existing.totalSquats;
    }

    await saveDailySummary(summary);
  } else {
    await saveDailySummary({
      date,
      totalWorkMs: workMs,
      totalDrowsy: session.drowsinessEvents.length,
      totalSquats: session.squatEvents.reduce((sum, e) => sum + e.count, 0),
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

  const logSquatCompletion = useCallback(async (count: number) => {
    const id = sessionIdRef.current;
    if (!id) return;
    try {
      const session = await getSession(id);
      if (!session) return;
      const now = Date.now();
      session.squatEvents.push({
        timestamp: now,
        count,
        durationMs: penaltyStartRef.current
          ? now - penaltyStartRef.current
          : 0,
      });
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

  return { startSession, logDrowsiness, logSquatCompletion, endSession };
}
