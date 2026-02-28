interface PenaltyScreenProps {
  squatCount: number;
  requiredSquats: number;
  isSquatting: boolean;
  kneeAngle: number;
}

export function PenaltyScreen({
  squatCount,
  requiredSquats,
  isSquatting,
  kneeAngle,
}: PenaltyScreenProps) {
  const progress = squatCount / requiredSquats;

  return (
    <div className="absolute inset-0 z-10 flex flex-col pointer-events-none">
      {/* Red flash overlay */}
      <div className="absolute inset-0 animate-flash-red z-30" />

      {/* Dark overlay to make text readable */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Main content overlay */}
      <div className="relative flex-1 flex flex-col items-center justify-center z-20">
        {/* Warning header */}
        <div className="animate-shake mb-6">
          <div className="text-5xl mb-2 text-center">🚨</div>
          <h1 className="text-3xl font-black text-neon-red text-center leading-tight">
            起きて！！
          </h1>
        </div>

        {/* Squat counter */}
        <div className="bg-dark-surface/90 backdrop-blur-lg rounded-3xl border-2 border-neon-red/50 p-6 mx-4 max-w-sm w-full">
          <p className="text-center text-white font-bold text-lg mb-4">
            スクワットを
            <span className="text-neon-red text-2xl mx-1">{requiredSquats}</span>
            回してアラームを止めろ！
          </p>

          {/* Big counter display */}
          <div className="text-center mb-4">
            <div className="text-7xl font-black text-white">
              {squatCount}
              <span className="text-3xl text-gray-400">/{requiredSquats}</span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full h-4 bg-gray-800 rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-gradient-to-r from-neon-red to-neon-green rounded-full transition-all duration-300"
              style={{ width: `${progress * 100}%` }}
            />
          </div>

          {/* Squat status */}
          <div className="flex items-center justify-center gap-2">
            <div
              className={`w-4 h-4 rounded-full transition-colors ${
                isSquatting ? 'bg-neon-blue' : 'bg-gray-600'
              }`}
            />
            <span
              className={`text-sm font-bold ${
                isSquatting ? 'text-neon-blue' : 'text-gray-400'
              }`}
            >
              {isSquatting ? 'しゃがみ検知中...' : '立って！'}
            </span>
          </div>

          {/* Knee angle debug info */}
          <div className="mt-3 text-center">
            <span className="text-xs text-gray-500 font-mono">
              膝角度: {kneeAngle.toFixed(0)}°
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
