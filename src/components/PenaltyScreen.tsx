import { useEffect, useRef, useState } from 'react';
import { AlarmIcon, AlertTriangleIcon } from './Icons';

const STROKE_SHADOW = '3px 3px 0 #000, -3px 3px 0 #000, 3px -3px 0 #000, -3px -3px 0 #000, 0 3px 0 #000, 0 -3px 0 #000, 3px 0 0 #000, -3px 0 0 #000';

interface PenaltyScreenProps {
  squatCount: number;
  requiredSquats: number;
  isSquatting: boolean;
  fullBodyVisible: boolean;
}

export function PenaltyScreen({
  squatCount,
  requiredSquats,
  isSquatting,
  fullBodyVisible,
}: PenaltyScreenProps) {
  const progress = squatCount / requiredSquats;
  const [popCount, setPopCount] = useState<number | null>(null);
  const prevCount = useRef(squatCount);

  useEffect(() => {
    if (squatCount > 0 && squatCount !== prevCount.current) {
      prevCount.current = squatCount;
      setPopCount(squatCount);
      const timer = setTimeout(() => setPopCount(null), 1800);
      return () => clearTimeout(timer);
    }
  }, [squatCount]);

  return (
    <div className="absolute inset-0 z-10 flex flex-col pointer-events-none">
      {/* Thin red border flash */}
      <div className="absolute inset-0 border-4 border-neon-red/80 animate-flash-red z-30 rounded-sm" />

      {/* Center pop number */}
      {popCount !== null && (
        <div className="absolute inset-0 flex items-center justify-center z-40" key={popCount}>
          <div className="animate-count-pop flex flex-col items-center">
            <span
              className="text-[200px] leading-none font-black text-white"
              style={{
                WebkitTextStroke: '8px #39ff14',
                paintOrder: 'stroke fill',
                textShadow: '6px 6px 0 #000, -6px 6px 0 #000, 6px -6px 0 #000, -6px -6px 0 #000',
              }}
            >
              {popCount}
            </span>
            <span
              className="text-4xl font-black text-neon-green tracking-[0.3em] mt-2"
              style={{ textShadow: STROKE_SHADOW }}
            >
              NICE!
            </span>
          </div>
        </div>
      )}

      {/* Full body not visible warning */}
      {!fullBodyVisible && (
        <div className="absolute inset-0 flex items-center justify-center z-50">
          <div className="bg-black/85 backdrop-blur-sm rounded-2xl px-8 py-6 mx-6 text-center border-2 border-yellow-400/60">
            <AlertTriangleIcon className="w-16 h-16 mx-auto mb-3 text-yellow-400" />
            <p
              className="text-3xl font-black text-yellow-400"
              style={{ textShadow: STROKE_SHADOW }}
            >
              全身を映してください
            </p>
            <p
              className="text-lg text-gray-200 mt-2 font-bold"
              style={{ textShadow: STROKE_SHADOW }}
            >
              頭からつま先まで画面に入るように
              <br />
              カメラから離れてください
            </p>
          </div>
        </div>
      )}

      {/* Top banner */}
      <div className="relative z-20 mx-3 mt-3">
        <div className="bg-black/75 backdrop-blur-sm rounded-2xl px-5 py-4 flex items-center gap-4">
          <div className="animate-shake">
            <AlarmIcon className="w-9 h-9 text-neon-red" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xl font-black text-neon-red leading-tight">
              スクワット {squatCount}/{requiredSquats}
            </p>
            <p className="text-base text-gray-200 mt-1 font-medium">
              {isSquatting ? 'しゃがみ検知中...' : 'しゃがんで → 立つ = 1回'}
            </p>
          </div>
          {/* Progress ring */}
          <div className="relative w-20 h-20 shrink-0">
            <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
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
            <span className="absolute inset-0 flex items-center justify-center text-2xl font-black text-white">
              {squatCount}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
