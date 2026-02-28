import { useState, useEffect } from 'react';
import type { ExerciseMode } from '../types';
import {
  getWebhookUrl,
  setWebhookUrl,
  isValidWebhookUrl,
} from '../utils/webhookSettings';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  exerciseMode: ExerciseMode;
  onExerciseModeChange: (mode: ExerciseMode) => void;
}

export function SettingsModal({ open, onClose, exerciseMode, onExerciseModeChange }: SettingsModalProps) {
  const [url, setUrl] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (open) {
      setUrl(getWebhookUrl());
      setSaved(false);
    }
  }, [open]);

  if (!open) return null;

  const trimmed = url.trim();
  const valid = trimmed === '' || isValidWebhookUrl(trimmed);

  const handleSave = () => {
    setWebhookUrl(trimmed);
    setSaved(true);
    setTimeout(() => onClose(), 600);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md mx-4 bg-dark-surface border border-dark-border rounded-2xl p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <h2 className="text-lg font-bold text-white mb-1">設定</h2>

        {/* Exercise mode toggle */}
        <label className="block text-sm text-gray-300 mb-2">
          エクササイズモード
        </label>
        <div className="flex gap-2 mb-5">
          <button
            onClick={() => onExerciseModeChange('fullbody')}
            className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-bold border transition-colors ${
              exerciseMode === 'fullbody'
                ? 'bg-neon-blue/20 border-neon-blue text-neon-blue'
                : 'bg-dark-bg border-dark-border text-gray-400 hover:text-white'
            }`}
          >
            全身モード
            <span className="block text-xs font-normal mt-0.5 opacity-70">スクワット</span>
          </button>
          <button
            onClick={() => onExerciseModeChange('upperbody')}
            className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-bold border transition-colors ${
              exerciseMode === 'upperbody'
                ? 'bg-neon-purple/20 border-neon-purple text-neon-purple'
                : 'bg-dark-bg border-dark-border text-gray-400 hover:text-white'
            }`}
          >
            上半身モード
            <span className="block text-xs font-normal mt-0.5 opacity-70">首ストレッチ</span>
          </button>
        </div>

        <p className="text-xs text-gray-400 mb-5">
          Discord Webhookを設定すると、居眠り検知・エクササイズ完了時にスクリーンショットが自動送信されます。
        </p>

        {/* URL input */}
        <label className="block text-sm text-gray-300 mb-1.5">
          Webhook URL
        </label>
        <input
          type="url"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setSaved(false);
          }}
          placeholder="https://discord.com/api/webhooks/..."
          className={`w-full px-3 py-2.5 rounded-lg bg-dark-bg border text-sm text-white placeholder-gray-500 outline-none transition-colors ${
            valid
              ? 'border-dark-border focus:border-neon-blue'
              : 'border-neon-red'
          }`}
        />
        {!valid && (
          <p className="text-xs text-neon-red mt-1">
            有効なDiscord Webhook URLを入力してください
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            disabled={!valid || saved}
            className="px-5 py-2 text-sm font-bold rounded-lg bg-gradient-to-r from-neon-blue to-neon-purple text-white disabled:opacity-40 transition-opacity"
          >
            {saved ? '保存しました' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
