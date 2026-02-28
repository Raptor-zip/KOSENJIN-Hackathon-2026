interface StartScreenProps {
  onStart: () => void;
  loading: boolean;
}

export function StartScreen({ onStart, loading }: StartScreenProps) {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-dark-bg relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-neon-blue/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-64 h-64 bg-neon-purple/10 rounded-full blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-8 px-6">
        {/* Logo / Title */}
        <div className="animate-float text-center">
          <div className="text-6xl mb-4">👁️</div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-neon-blue to-neon-purple bg-clip-text text-transparent">
            NEMUNAI
          </h1>
          <p className="text-gray-400 mt-2 text-sm tracking-widest uppercase">
            居眠り検知システム
          </p>
        </div>

        {/* Description */}
        <div className="text-center max-w-xs">
          <p className="text-gray-300 text-sm leading-relaxed">
            居眠りを検知したらアラームが鳴り、
            <br />
            <span className="text-neon-red font-bold">スクワット5回</span>
            で解除できます
          </p>
        </div>

        {/* Start Button */}
        <button
          onClick={onStart}
          disabled={loading}
          className="relative group mt-4"
        >
          <div className="absolute -inset-1 bg-gradient-to-r from-neon-blue to-neon-purple rounded-2xl blur opacity-60 group-hover:opacity-100 transition-opacity" />
          <div className="relative px-12 py-5 bg-dark-surface rounded-2xl border border-dark-border flex items-center gap-3">
            {loading ? (
              <>
                <div className="w-6 h-6 border-2 border-neon-blue border-t-transparent rounded-full animate-spin" />
                <span className="text-lg font-bold text-white">
                  準備中...
                </span>
              </>
            ) : (
              <>
                <span className="text-2xl">🚀</span>
                <span className="text-xl font-bold text-white">
                  監視スタート
                </span>
              </>
            )}
          </div>
        </button>

        {/* Info badges */}
        <div className="flex gap-3 mt-4">
          <span className="px-3 py-1 text-xs bg-dark-surface border border-dark-border rounded-full text-gray-400">
            📷 カメラ使用
          </span>
          <span className="px-3 py-1 text-xs bg-dark-surface border border-dark-border rounded-full text-gray-400">
            🔊 音声あり
          </span>
          <span className="px-3 py-1 text-xs bg-dark-surface border border-dark-border rounded-full text-gray-400">
            🤖 AI検知
          </span>
        </div>
      </div>
    </div>
  );
}
