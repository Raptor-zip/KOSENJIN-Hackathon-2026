import type { Session } from '../../types';

interface SessionTimelineProps {
  sessions: Session[];
  date: string;
}

const HOURS = [0, 6, 12, 18, 24];
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function timeToPercent(timestamp: number, dayStartMs: number): number {
  const offset = timestamp - dayStartMs;
  return Math.max(0, Math.min(100, (offset / MS_PER_DAY) * 100));
}

export function SessionTimeline({ sessions, date }: SessionTimelineProps) {
  const dayStart = new Date(date + 'T00:00:00').getTime();

  return (
    <div className="bg-dark-surface border border-dark-border rounded-xl p-4 animate-fade-slide-up">
      <h3 className="text-sm text-gray-400 mb-3">セッションタイムライン</h3>

      {sessions.length === 0 ? (
        <p className="text-xs text-gray-500 text-center py-4">この日のセッションはありません</p>
      ) : (
        <>
          {/* Timeline track */}
          <div className="relative h-8 bg-gray-800/50 rounded-full overflow-hidden">
            {sessions.map((s) => {
              const left = timeToPercent(s.startedAt, dayStart);
              const end = s.endedAt ?? Date.now();
              const width = timeToPercent(end, dayStart) - left;

              return (
                <div
                  key={s.id}
                  className="absolute top-0 h-full bg-neon-blue/40 rounded-full"
                  style={{ left: `${left}%`, width: `${Math.max(width, 0.5)}%` }}
                />
              );
            })}

            {/* Drowsiness markers */}
            {sessions.flatMap((s) =>
              s.drowsinessEvents.map((e, i) => {
                const pos = timeToPercent(e.timestamp, dayStart);
                return (
                  <div
                    key={`d-${s.id}-${i}`}
                    className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-neon-red rotate-45"
                    style={{ left: `${pos}%`, marginLeft: '-5px' }}
                    title={`居眠り ${new Date(e.timestamp).toLocaleTimeString()}`}
                  />
                );
              }),
            )}

            {/* Squat markers */}
            {sessions.flatMap((s) =>
              s.squatEvents.map((e, i) => {
                const pos = timeToPercent(e.timestamp, dayStart);
                return (
                  <div
                    key={`s-${s.id}-${i}`}
                    className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-neon-green rounded-full"
                    style={{ left: `${pos}%`, marginLeft: '-5px' }}
                    title={`スクワット ${new Date(e.timestamp).toLocaleTimeString()}`}
                  />
                );
              }),
            )}
          </div>

          {/* Hour labels */}
          <div className="relative h-4 mt-1">
            {HOURS.map((h) => (
              <span
                key={h}
                className="absolute text-[10px] text-gray-500 -translate-x-1/2"
                style={{ left: `${(h / 24) * 100}%` }}
              >
                {h}:00
              </span>
            ))}
          </div>
        </>
      )}

      {/* Legend */}
      <div className="flex gap-4 mt-3 text-[10px] text-gray-400">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-2 bg-neon-blue/40 rounded" />
          セッション
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 bg-neon-red rotate-45" />
          居眠り
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 bg-neon-green rounded-full" />
          スクワット
        </span>
      </div>
    </div>
  );
}
