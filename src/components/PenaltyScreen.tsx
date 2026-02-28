import { useEffect, useRef, useState } from 'react';
import type { ExerciseMode } from '../types';
import { AlarmIcon, AlertTriangleIcon } from './Icons';

const STROKE_SHADOW = '3px 3px 0 #000, -3px 3px 0 #000, 3px -3px 0 #000, -3px -3px 0 #000, 0 3px 0 #000, 0 -3px 0 #000, 3px 0 0 #000, -3px 0 0 #000';

interface PenaltyScreenProps {
  squatCount: number;
  requiredSquats: number;
  isSquatting: boolean;
  fullBodyVisible: boolean;
  exerciseMode: ExerciseMode;
  isTilted: boolean;
  tiltAngle: number;
  upperBodyVisible: boolean;
  penaltyComplete: boolean;
}

export function PenaltyScreen({
  squatCount,
  requiredSquats,
  isSquatting,
  fullBodyVisible,
  exerciseMode,
  isTilted,
  tiltAngle,
  upperBodyVisible,
  penaltyComplete,
}: PenaltyScreenProps) {
  const remaining = requiredSquats - squatCount;
  const progress = squatCount / requiredSquats;
  const [popRemaining, setPopRemaining] = useState<number | null>(null);
  const prevCount = useRef(squatCount);

  useEffect(() => {
    if (squatCount > 0 && squatCount !== prevCount.current) {
      prevCount.current = squatCount;
      const rem = requiredSquats - squatCount;
      setPopRemaining(rem);
      const timer = setTimeout(() => setPopRemaining(null), 1800);
      return () => clearTimeout(timer);
    }
  }, [squatCount, requiredSquats]);

  // --- Completion overlay ---
  if (penaltyComplete) {
    return (
      <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative z-10 flex flex-col items-center animate-count-pop">
          <span
            className="text-[120px] leading-none font-black text-white"
            style={{
              WebkitTextStroke: '6px #39ff14',
              paintOrder: 'stroke fill',
              textShadow: '6px 6px 0 #000, -6px 6px 0 #000, 6px -6px 0 #000, -6px -6px 0 #000',
            }}
          >
            CLEAR!
          </span>
          <span
            className="text-3xl font-black text-neon-green tracking-[0.2em] mt-4"
            style={{ textShadow: STROKE_SHADOW }}
          >
            {exerciseMode === 'fullbody' ? 'スクワット' : '首ストレッチ'} {requiredSquats}回 完了!
          </span>
          <span
            className="text-lg font-bold text-gray-300 mt-3"
            style={{ textShadow: STROKE_SHADOW }}
          >
            監視モードに戻ります...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-10 flex flex-col pointer-events-none">
      {/* Thin red border flash */}
      <div className="absolute inset-0 border-4 border-neon-red/80 animate-flash-red z-30 rounded-sm" />

      {/* Center pop — remaining count */}
      {popRemaining !== null && (
        <div className="absolute inset-0 flex items-center justify-center z-40" key={squatCount}>
          <div className="animate-count-pop flex flex-col items-center">
            {popRemaining > 0 ? (
              <span className="flex items-baseline gap-2">
                <span
                  className="text-5xl font-black text-gray-200"
                  style={{ textShadow: STROKE_SHADOW }}
                >
                  残り
                </span>
                <span
                  className="text-[160px] leading-none font-black text-white"
                  style={{
                    WebkitTextStroke: '8px #39ff14',
                    paintOrder: 'stroke fill',
                    textShadow: '6px 6px 0 #000, -6px 6px 0 #000, 6px -6px 0 #000, -6px -6px 0 #000',
                  }}
                >
                  {popRemaining}
                </span>
                <span
                  className="text-5xl font-black text-gray-200"
                  style={{ textShadow: STROKE_SHADOW }}
                >
                  回
                </span>
              </span>
            ) : (
              <>
                <span
                  className="text-[160px] leading-none font-black text-white"
                  style={{
                    WebkitTextStroke: '8px #39ff14',
                    paintOrder: 'stroke fill',
                    textShadow: '6px 6px 0 #000, -6px 6px 0 #000, 6px -6px 0 #000, -6px -6px 0 #000',
                  }}
                >
                  0
                </span>
                <span
                  className="text-5xl font-black text-neon-green tracking-wider mt-2"
                  style={{ textShadow: STROKE_SHADOW }}
                >
                  CLEAR!
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Body not visible warning */}
      {(exerciseMode === 'fullbody' ? !fullBodyVisible : !upperBodyVisible) && (
        <div className="absolute inset-0 flex items-center justify-center z-50">
          <div className="bg-black/85 backdrop-blur-sm rounded-2xl px-8 py-6 mx-6 text-center border-2 border-yellow-400/60">
            <AlertTriangleIcon className="w-16 h-16 mx-auto mb-3 text-yellow-400" />
            <p
              className="text-3xl font-black text-yellow-400"
              style={{ textShadow: STROKE_SHADOW }}
            >
              {exerciseMode === 'fullbody' ? 'お腹から足まで映してください' : '顔を映してください'}
            </p>
            <p
              className="text-lg text-gray-200 mt-2 font-bold"
              style={{ textShadow: STROKE_SHADOW }}
            >
              {exerciseMode === 'fullbody' ? (
                <>
                  お腹から足元まで画面に入るように
                  <br />
                  カメラの位置を調整してください
                </>
              ) : (
                <>
                  顔が画面に入るように
                  <br />
                  カメラの位置を調整してください
                </>
              )}
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
              {exerciseMode === 'fullbody' ? 'スクワット' : '首ストレッチ'} 残り{remaining}回
            </p>
            <p className="text-base text-gray-200 mt-1 font-medium">
              {exerciseMode === 'fullbody'
                ? (isSquatting ? 'しゃがみ検知中...' : 'しゃがんで → 立つ = 1回')
                : (isTilted ? '傾き検知中...' : '首を傾けて → 戻す = 1回')
              }
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
              {remaining}
            </span>
          </div>
        </div>
      </div>

      {/* Tilt angle display */}
      {exerciseMode === 'upperbody' && upperBodyVisible && (
        <div className="relative z-20 mx-3 mt-2 flex justify-center">
          <div className="bg-black/70 backdrop-blur-sm rounded-xl px-4 py-2 flex items-center gap-3">
            <span className="text-sm font-bold text-gray-400">角度</span>
            <span
              className={`text-3xl font-black tabular-nums ${
                Math.abs(tiltAngle) > 12 ? 'text-neon-green' : 'text-white'
              }`}
              style={{ textShadow: STROKE_SHADOW, minWidth: '5ch', textAlign: 'right' }}
            >
              {tiltAngle >= 0 ? '+' : ''}{tiltAngle.toFixed(1)}°
            </span>
            <span className="text-sm font-bold text-gray-400">
              {Math.abs(tiltAngle) > 12 ? (tiltAngle > 0 ? '← 左傾き' : '→ 右傾き') : '正面'}
            </span>
          </div>
        </div>
      )}

      {/* Bottom instruction guide */}
      <div className="relative z-20 mt-auto mx-3 mb-4">
        <div className="bg-black/75 backdrop-blur-sm rounded-2xl px-5 py-4">
          {exerciseMode === 'upperbody' ? (
            <div className="flex items-center gap-4">
              {/* Animated head tilt demo */}
              <div className="animate-head-tilt-demo shrink-0">
                <svg className="w-16 h-16" viewBox="0 0 64 64" fill="none">
                  {/* Head */}
                  <circle cx="32" cy="22" r="14" stroke="#a855f7" strokeWidth="2.5" fill="rgba(168,85,247,0.15)" />
                  {/* Eyes */}
                  <circle cx="26" cy="20" r="2" fill="#a855f7" />
                  <circle cx="38" cy="20" r="2" fill="#a855f7" />
                  {/* Mouth */}
                  <path d="M27 27 Q32 31 37 27" stroke="#a855f7" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                  {/* Neck */}
                  <line x1="32" y1="36" x2="32" y2="46" stroke="#a855f7" strokeWidth="2.5" strokeLinecap="round" />
                  {/* Shoulders */}
                  <line x1="18" y1="50" x2="46" y2="50" stroke="#a855f7" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>
              {/* Step-by-step instructions */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 rounded-full bg-neon-purple/30 border border-neon-purple text-neon-purple text-xs font-bold flex items-center justify-center shrink-0">1</span>
                  <span className="text-sm text-white font-bold">首を左 or 右に傾ける</span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-1 h-4 ml-[10px] border-l-2 border-dashed border-gray-500" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-neon-green/30 border border-neon-green text-neon-green text-xs font-bold flex items-center justify-center shrink-0">2</span>
                  <span className="text-sm text-white font-bold">正面に戻す = 1回!</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              {/* Animated squat demo */}
              <div className="animate-squat-demo shrink-0">
                <svg className="w-16 h-16" viewBox="0 0 64 64" fill="none">
                  {/* Head */}
                  <circle cx="32" cy="10" r="7" stroke="#00d4ff" strokeWidth="2.5" fill="rgba(0,212,255,0.15)" />
                  {/* Body */}
                  <line x1="32" y1="17" x2="32" y2="36" stroke="#00d4ff" strokeWidth="2.5" strokeLinecap="round" />
                  {/* Arms */}
                  <line x1="32" y1="22" x2="20" y2="30" stroke="#00d4ff" strokeWidth="2.5" strokeLinecap="round" />
                  <line x1="32" y1="22" x2="44" y2="30" stroke="#00d4ff" strokeWidth="2.5" strokeLinecap="round" />
                  {/* Legs */}
                  <line x1="32" y1="36" x2="22" y2="52" stroke="#00d4ff" strokeWidth="2.5" strokeLinecap="round" />
                  <line x1="32" y1="36" x2="42" y2="52" stroke="#00d4ff" strokeWidth="2.5" strokeLinecap="round" />
                  {/* Feet */}
                  <line x1="22" y1="52" x2="18" y2="52" stroke="#00d4ff" strokeWidth="2.5" strokeLinecap="round" />
                  <line x1="42" y1="52" x2="46" y2="52" stroke="#00d4ff" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>
              {/* Step-by-step instructions */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 rounded-full bg-neon-blue/30 border border-neon-blue text-neon-blue text-xs font-bold flex items-center justify-center shrink-0">1</span>
                  <span className="text-sm text-white font-bold">深くしゃがむ</span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-1 h-4 ml-[10px] border-l-2 border-dashed border-gray-500" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-neon-green/30 border border-neon-green text-neon-green text-xs font-bold flex items-center justify-center shrink-0">2</span>
                  <span className="text-sm text-white font-bold">まっすぐ立つ = 1回!</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
