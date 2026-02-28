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
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    if (open) {
      setUrl(getWebhookUrl());
      setSaved(false);
      setShowGuide(false);
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
        className="w-full max-w-md mx-4 bg-dark-surface border border-dark-border rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
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

        {/* Discord Webhook section */}
        <div className="border-t border-dark-border pt-4 mb-4">
          <h3 className="text-sm font-bold text-white mb-1">Discord通知</h3>
          <p className="text-xs text-gray-400 mb-3 leading-relaxed">
            Webhook URLを設定すると、居眠り検知時やエクササイズ完了時に、スクリーンショット付きの通知がDiscordチャンネルに自動送信されます。
          </p>
        </div>

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

        {/* Guide toggle */}
        <button
          onClick={() => setShowGuide(!showGuide)}
          className="mt-3 text-xs text-neon-blue hover:text-neon-blue/80 transition-colors flex items-center gap-1"
        >
          <svg className={`w-3 h-3 transition-transform ${showGuide ? 'rotate-90' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
          Webhook URLの取得方法
        </button>

        {/* Guide content */}
        {showGuide && (
          <div className="mt-3 p-3 bg-dark-bg rounded-lg border border-dark-border text-xs text-gray-300 leading-relaxed space-y-3">
            <div>
              <p className="font-bold text-white mb-1">1. サーバー設定を開く</p>
              <p className="text-gray-400">
                通知を送りたいDiscordサーバーの名前をクリック →「サーバー設定」を開きます。
              </p>
            </div>
            <div>
              <p className="font-bold text-white mb-1">2. 連携サービス → Webhook</p>
              <p className="text-gray-400">
                左メニューの「連携サービス」→「Webhook」を選択し、「新しいウェブフック」をクリックします。
              </p>
            </div>
            <div>
              <p className="font-bold text-white mb-1">3. チャンネルを選択</p>
              <p className="text-gray-400">
                作成されたWebhookをクリックして展開し、通知を送信したいチャンネルをプルダウンから選択します。名前は自由に変更できます。
              </p>
            </div>
            <div>
              <p className="font-bold text-white mb-1">4. URLをコピー</p>
              <p className="text-gray-400">
                「ウェブフックURLをコピー」ボタンを押して、上の入力欄に貼り付けてください。
              </p>
            </div>
            <div className="pt-2 border-t border-dark-border">
              <p className="text-gray-500">
                URLは <span className="text-gray-300 font-mono">https://discord.com/api/webhooks/...</span> の形式です。このURLは他人に共有しないでください。
              </p>
            </div>
          </div>
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
