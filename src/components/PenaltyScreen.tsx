import { AlarmIcon } from './Icons';

interface PenaltyScreenProps {
  squatCount: number;
  requiredSquats: number;
  isSquatting: boolean;
}

export function PenaltyScreen({
  squatCount,
  requiredSquats,
  isSquatting,
}: PenaltyScreenProps) {
  const progress = squatCount / requiredSquats;

  return (
    <div className="absolute inset-0 z-10 flex flex-col pointer-events-none">
      {/* Thin red border flash */}
      <div className="absolute inset-0 border-4 border-neon-red/80 animate-flash-red z-30 rounded-sm" />

      {/* Compact top banner */}
      <div className="relative z-20 mx-3 mt-3">
        <div className="bg-black/70 backdrop-blur-sm rounded-2xl px-4 py-3 flex items-center gap-3">
          {/* Alarm icon */}
          <div className="animate-shake">
            <AlarmIcon className="w-6 h-6 text-neon-red" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-neon-red leading-tight">
              スクワット {squatCount}/{requiredSquats}
            </p>
            <p className="text-[11px] text-gray-300">
              {isSquatting ? 'しゃがみ検知中...' : 'しゃがんで → 立つ = 1回'}
            </p>
          </div>
          {/* Progress ring */}
          <div className="relative w-12 h-12 shrink-0">
            <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
              <circle
                cx="18" cy="18" r="15"
                fill="none"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="3"
              />
              <circle
                cx="18" cy="18" r="15"
                fill="none"
                stroke={progress >= 1 ? '#39ff14' : '#ff2d55'}
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${progress * 94.2} 94.2`}
                className="transition-all duration-300"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-sm font-black text-white">
              {squatCount}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
