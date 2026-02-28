import { useState, useEffect, useCallback } from 'react';
import type { DailySummary, Session } from '../types';
import { getDailySummaries, getSessionsByDateRange } from '../utils/db';

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getLast7Days(): string[] {
  const dates: string[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dates.push(dateKey(d));
  }
  return dates;
}

const EMPTY_SUMMARY = (date: string): DailySummary => ({
  date,
  totalWorkMs: 0,
  totalDrowsy: 0,
  totalSquats: 0,
  sessions: [],
});

export function useDashboardData() {
  const [weeklySummaries, setWeeklySummaries] = useState<DailySummary[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(dateKey(new Date()));
  const [daySessions, setDaySessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  // Load 7-day summaries
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const dates = getLast7Days();
        const summaries = await getDailySummaries(dates);
        const summaryMap = new Map(summaries.map((s) => [s.date, s]));
        const filled = dates.map((d) => summaryMap.get(d) ?? EMPTY_SUMMARY(d));
        if (!cancelled) {
          setWeeklySummaries(filled);
        }
      } catch {
        if (!cancelled) {
          setWeeklySummaries(getLast7Days().map(EMPTY_SUMMARY));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, []);

  // Load sessions for selected date
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const dayStart = new Date(selectedDate + 'T00:00:00').getTime();
        const dayEnd = dayStart + 24 * 60 * 60 * 1000;
        const sessions = await getSessionsByDateRange(dayStart, dayEnd);
        if (!cancelled) setDaySessions(sessions);
      } catch {
        if (!cancelled) setDaySessions([]);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [selectedDate]);

  const goToPreviousDay = useCallback(() => {
    setSelectedDate((prev) => {
      const d = new Date(prev + 'T00:00:00');
      d.setDate(d.getDate() - 1);
      return dateKey(d);
    });
  }, []);

  const goToNextDay = useCallback(() => {
    setSelectedDate((prev) => {
      const d = new Date(prev + 'T00:00:00');
      d.setDate(d.getDate() + 1);
      const today = dateKey(new Date());
      const next = dateKey(d);
      return next > today ? prev : next;
    });
  }, []);

  return {
    weeklySummaries,
    selectedDate,
    setSelectedDate,
    daySessions,
    loading,
    goToPreviousDay,
    goToNextDay,
  };
}
