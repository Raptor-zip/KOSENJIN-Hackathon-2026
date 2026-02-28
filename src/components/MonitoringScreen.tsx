import { useState, useEffect } from 'react';
import { AlertTriangleIcon, StopIcon } from './Icons';

const STROKE_SHADOW = '3px 3px 0 #000, -3px 3px 0 #000, 3px -3px 0 #000, -3px -3px 0 #000, 0 3px 0 #000, 0 -3px 0 #000, 3px 0 0 #000, -3px 0 0 #000';
const STROKE_SHADOW_SM = '2px 2px 0 #000, -2px 2px 0 #000, 2px -2px 0 #000, -2px -2px 0 #000, 0 2px 0 #000, 0 -2px 0 #000, 2px 0 0 #000, -2px 0 0 #000';

interface MonitoringScreenProps {
  ear: number;
  drowsySeconds: number;
  faceDetected: boolean;
  onStop: () => void;
  sessionStartedAt: number;
}

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  if (h > 0) return `${h}:${mm}:${ss}`;
  return `${mm}:${ss}`;
}

function useClock() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function getDrowsinessLevel(ear: number): {
  label: string;
  color: string;
  bgColor: string;
  dotColor: string;
  percent: number;
} {
  if (ear >= 0.28) {
    return { label: 'ぱっちり', color: 'text-neon-green', bgColor: 'bg-neon-green', dotColor: 'bg-neon-green', percent: 100 };
  }
  if (ear >= 0.23) {
    return { label: '正常', color: 'text-neon-blue', bgColor: 'bg-neon-blue', dotColor: 'bg-neon-blue', percent: 75 };
  }
  if (ear >= 0.20) {
    return { label: '眠そう...', color: 'text-yellow-400', bgColor: 'bg-yellow-400', dotColor: 'bg-yellow-400', percent: 40 };
  }
  return { label: '危険！', color: 'text-neon-red', bgColor: 'bg-neon-red', dotColor: 'bg-neon-red', percent: 15 };
}

export function MonitoringScreen({
  ear,
  drowsySeconds,
  faceDetected,
  onStop,
  sessionStartedAt,
}: MonitoringScreenProps) {
  const isDrowsy = drowsySeconds > 0;
  const level = getDrowsinessLevel(ear);
  const now = useClock();

  const dateObj = new Date(now);
  const dateStr = `${dateObj.getFullYear()}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${String(dateObj.getDate()).padStart(2, '0')}`;
  const weekday = ['日', '月', '火', '水', '木', '金', '土'][dateObj.getDay()];
  const timeStr = dateObj.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const elapsed = sessionStartedAt > 0 ? now - sessionStartedAt : 0;

  return (
    <div className="absolute inset-0 z-10 pointer-events-none flex flex-col">
      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-dark-bg/80 via-transparent to-dark-bg/80" />

      {/* Top status bar */}
      <div className="relative p-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <div
            className={`w-4 h-4 rounded-full ${
              faceDetected ? 'bg-neon-green animate-pulse' : 'bg-red-500'
            }`}
          />
          <span
            className="text-lg font-bold text-white"
            style={{ textShadow: STROKE_SHADOW_SM }}
          >
            {faceDetected ? '顔を検出中' : '顔が見つかりません'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-4 py-1.5 bg-dark-surface/80 backdrop-blur rounded-full border border-dark-border">
            <span className="text-base text-neon-blue font-mono font-bold">MONITORING</span>
          </div>
          <button
            onClick={onStop}
            className="pointer-events-auto p-2 bg-dark-surface/80 backdrop-blur rounded-full border border-dark-border text-gray-400 hover:text-neon-red transition-colors"
            aria-label="停止"
          >
            <StopIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Clock / work timer bar */}
      <div className="relative px-4 pb-2 z-10 flex items-center justify-between">
        {/* Date & time */}
        <div className="bg-dark-surface/80 backdrop-blur rounded-xl border border-dark-border px-3 py-2">
          <p className="text-xs text-gray-400 font-mono leading-none">{dateStr} ({weekday})</p>
          <p
            className="text-2xl font-bold text-white font-mono leading-tight mt-0.5"
            style={{ textShadow: STROKE_SHADOW_SM }}
          >
            {timeStr}
          </p>
        </div>
        {/* Elapsed work time */}
        <div className="bg-dark-surface/80 backdrop-blur rounded-xl border border-dark-border px-3 py-2 text-right">
          <p className="text-xs text-gray-400 font-mono leading-none">作業時間</p>
          <p
            className="text-2xl font-bold text-neon-blue font-mono leading-tight mt-0.5"
            style={{ textShadow: STROKE_SHADOW_SM }}
          >
            {formatElapsed(elapsed)}
          </p>
        </div>
      </div>

      {/* Drowsy warning overlay */}
      {isDrowsy && (
        <div className="flex-1 flex items-center justify-center z-20">
          <div className="text-center">
            <AlertTriangleIcon
              className="w-24 h-24 mx-auto mb-4 text-yellow-400"
              style={{ filter: 'drop-shadow(3px 3px 0 #000) drop-shadow(-3px -3px 0 #000)' }}
            />
            <p
              className="text-5xl font-black text-yellow-400"
              style={{ textShadow: STROKE_SHADOW }}
            >
              眠気を検知中...
            </p>
            <p
              className="text-3xl font-black text-white mt-4"
              style={{ textShadow: STROKE_SHADOW }}
            >
              {(3 - drowsySeconds).toFixed(1)}秒後にアラーム
            </p>
          </div>
        </div>
      )}

      {/* Spacer */}
      {!isDrowsy && <div className="flex-1" />}

      {/* Bottom HUD — drowsiness level */}
      <div className="relative p-4 z-10">
        <div className="bg-dark-surface/90 backdrop-blur rounded-2xl border border-dark-border px-5 py-5 flex items-center gap-4">
          <div className={`w-12 h-12 rounded-full ${level.dotColor} shrink-0 flex items-center justify-center`}>
            <div className="w-5 h-5 rounded-full bg-dark-bg/40" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xl font-black ${level.color}`}>
                {level.label}
              </span>
              <span className="text-sm text-gray-400 font-mono font-bold">
                覚醒レベル
              </span>
            </div>
            <div className="w-full h-3.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ease-out ${level.bgColor}`}
                style={{ width: `${level.percent}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
