import type { DailySummary } from '../../types';

const DAYS = ['月', '火', '水', '木', '金', '土', '日'];

interface WeeklyBarChartProps {
  data: DailySummary[];
  selectedDate: string;
  onSelect: (date: string) => void;
}

export function WeeklyBarChart({ data, selectedDate, onSelect }: WeeklyBarChartProps) {
  const maxWork = Math.max(...data.map((d) => d.totalWorkMs), 1);

  const chartW = 560;
  const chartH = 200;
  const barW = 32;
  const gap = (chartW - barW * 7) / 8;
  const topPad = 28;
  const bottomPad = 24;
  const barMaxH = chartH - topPad - bottomPad;

  return (
    <div className="bg-dark-surface border border-dark-border rounded-xl p-4 animate-fade-slide-up">
      <h3 className="text-sm text-gray-400 mb-3">週間サマリー</h3>
      <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full max-w-md mx-auto" role="img" aria-label="Weekly bar chart">
        {/* Glow filter */}
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {data.map((d, i) => {
          const x = gap + i * (barW + gap);
          const h = (d.totalWorkMs / maxWork) * barMaxH;
          const y = chartH - bottomPad - h;
          const isSelected = d.date === selectedDate;
          const dayLabel = DAYS[new Date(d.date + 'T00:00:00').getDay() === 0 ? 6 : new Date(d.date + 'T00:00:00').getDay() - 1];

          return (
            <g
              key={d.date}
              onClick={() => onSelect(d.date)}
              style={{ cursor: 'pointer' }}
              role="button"
              aria-label={`${d.date}: ${Math.round(d.totalWorkMs / 60000)}分`}
            >
              {/* Bar */}
              <rect
                x={x}
                y={y}
                width={barW}
                height={Math.max(h, 2)}
                rx={4}
                fill={isSelected ? '#a855f7' : '#00d4ff'}
                opacity={isSelected ? 1 : 0.7}
                filter={isSelected ? 'url(#glow)' : undefined}
                className="animate-bar-grow"
                style={{ animationDelay: `${i * 80}ms` }}
              />

              {/* Drowsy count on top */}
              {d.totalDrowsy > 0 && (
                <text
                  x={x + barW / 2}
                  y={y - 6}
                  textAnchor="middle"
                  fill="#ff2d55"
                  fontSize="10"
                  fontWeight="bold"
                >
                  {d.totalDrowsy}
                </text>
              )}

              {/* Day label */}
              <text
                x={x + barW / 2}
                y={chartH - 8}
                textAnchor="middle"
                fill={isSelected ? '#a855f7' : '#6b7280'}
                fontSize="11"
                fontWeight={isSelected ? 'bold' : 'normal'}
              >
                {dayLabel}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
