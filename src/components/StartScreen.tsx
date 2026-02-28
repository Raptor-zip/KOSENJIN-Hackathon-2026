import { useState } from 'react';
import type { ExerciseMode } from '../types';
import { EyeIcon, PlayIcon, SettingsIcon, ChartIcon, GitHubIcon } from './Icons';
import { SettingsModal } from './SettingsModal';

interface StartScreenProps {
  onStart: () => void;
  loading: boolean;
  onDashboard: () => void;
  exerciseMode: ExerciseMode;
  onExerciseModeChange: (mode: ExerciseMode) => void;
}

export function StartScreen({ onStart, loading, onDashboard, exerciseMode, onExerciseModeChange }: StartScreenProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-dark-bg relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-neon-blue/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-64 h-64 bg-neon-purple/10 rounded-full blur-3xl" />
      </div>

      {/* Dashboard button — top-left */}
      <button
        onClick={onDashboard}
        className="absolute top-4 left-4 z-20 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-dark-surface border border-gray-600 text-gray-200 hover:border-neon-blue hover:text-white transition-colors"
        aria-label="ダッシュボード"
      >
        <ChartIcon className="w-4 h-4" />
        <span className="text-xs font-bold">ダッシュボード</span>
      </button>

      {/* Settings button — top-right */}
      <button
        onClick={() => setSettingsOpen(true)}
        className="absolute top-4 right-4 z-20 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-dark-surface border border-gray-600 text-gray-200 hover:border-neon-blue hover:text-white transition-colors"
        aria-label="設定"
      >
        <SettingsIcon className="w-4 h-4" />
        <span className="text-xs font-bold">設定</span>
      </button>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-8 px-6">
        {/* Logo / Title */}
        <div className="animate-float text-center">
          <EyeIcon className="w-16 h-16 mx-auto mb-4 text-neon-blue" />
          <h1 className="text-4xl font-bold text-white">
            NEMUKE BUSTER
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
            <span className="text-neon-red font-bold">
              {exerciseMode === 'fullbody' ? 'スクワット5回' : '首ストレッチ5回'}
            </span>
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
                <PlayIcon className="w-6 h-6 text-neon-blue" />
                <span className="text-xl font-bold text-white">
                  監視スタート
                </span>
              </>
            )}
          </div>
        </button>

      </div>

      {/* GitHub link — bottom */}
      <a
        href="https://github.com/Raptor-zip/KOSENJIN-Hackathon-2026"
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-dark-surface/80 border border-dark-border text-gray-400 hover:text-white transition-colors text-xs pointer-events-auto"
      >
        <GitHubIcon className="w-4 h-4" />
        GitHub
      </a>

      {/* Settings modal */}
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        exerciseMode={exerciseMode}
        onExerciseModeChange={onExerciseModeChange}
      />
    </div>
  );
}
