import { AlertTriangleIcon } from './Icons';

interface MonitoringScreenProps {
  ear: number;
  drowsySeconds: number;
  faceDetected: boolean;
}

function getDrowsinessLevel(ear: number): {
  label: string;
  color: string;
  bgColor: string;
  dotColor: string;
  percent: number;
} {
  if (ear >= 0.28) {
    return {
      label: 'ぱっちり',
      color: 'text-neon-green',
      bgColor: 'bg-neon-green',
      dotColor: 'bg-neon-green',
      percent: 100,
    };
  }
  if (ear >= 0.23) {
    return {
      label: '正常',
      color: 'text-neon-blue',
      bgColor: 'bg-neon-blue',
      dotColor: 'bg-neon-blue',
      percent: 75,
    };
  }
  if (ear >= 0.20) {
    return {
      label: '眠そう...',
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-400',
      dotColor: 'bg-yellow-400',
      percent: 40,
    };
  }
  return {
    label: '危険！',
    color: 'text-neon-red',
    bgColor: 'bg-neon-red',
    dotColor: 'bg-neon-red',
    percent: 15,
  };
}

export function MonitoringScreen({
  ear,
  drowsySeconds,
  faceDetected,
}: MonitoringScreenProps) {
  const isDrowsy = drowsySeconds > 0;
  const level = getDrowsinessLevel(ear);

  return (
    <div className="absolute inset-0 z-10 pointer-events-none flex flex-col">
      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-dark-bg/80 via-transparent to-dark-bg/80" />

      {/* Top status bar */}
      <div className="relative p-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full ${
              faceDetected ? 'bg-neon-green animate-pulse' : 'bg-red-500'
            }`}
          />
          <span className="text-sm font-medium text-white/80">
            {faceDetected ? '顔を検出中' : '顔が見つかりません'}
          </span>
        </div>
        <div className="px-3 py-1 bg-dark-surface/80 backdrop-blur rounded-full border border-dark-border">
          <span className="text-xs text-neon-blue font-mono">MONITORING</span>
        </div>
      </div>

      {/* Drowsy warning overlay */}
      {isDrowsy && (
        <div className="flex-1 flex items-center justify-center z-20">
          <div className="text-center animate-pulse">
            <AlertTriangleIcon className="w-16 h-16 mx-auto mb-3 text-yellow-400" />
            <p className="text-2xl font-bold text-yellow-400">
              眠気を検知中...
            </p>
            <p className="text-yellow-400/80 text-sm mt-1">
              {(3 - drowsySeconds).toFixed(1)}秒後にアラーム発動
            </p>
          </div>
        </div>
      )}

      {/* Spacer */}
      {!isDrowsy && <div className="flex-1" />}

      {/* Bottom HUD — drowsiness level */}
      <div className="relative p-4 z-10">
        <div className="bg-dark-surface/90 backdrop-blur rounded-2xl border border-dark-border px-5 py-4 flex items-center gap-4">
          {/* Status dot */}
          <div className={`w-8 h-8 rounded-full ${level.dotColor} shrink-0 flex items-center justify-center`}>
            <div className="w-3 h-3 rounded-full bg-dark-bg/40" />
          </div>

          {/* Label + bar */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1.5">
              <span className={`text-sm font-bold ${level.color}`}>
                {level.label}
              </span>
              <span className="text-[10px] text-gray-500 font-mono">
                覚醒レベル
              </span>
            </div>
            <div className="w-full h-2.5 bg-gray-800 rounded-full overflow-hidden">
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
