import { useEffect, useState } from 'react';
import { CheckCircleIcon, XCircleIcon } from './Icons';

interface WebhookToastProps {
  imageUrl: string | null;
  message: string;
  success: boolean;
  onDone: () => void;
}

export function WebhookToast({ imageUrl, message, success, onDone }: WebhookToastProps) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLeaving(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleAnimationEnd = () => {
    if (leaving) onDone();
  };

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-lg border border-dark-border bg-dark-surface/95 px-4 py-3 shadow-lg backdrop-blur ${
        leaving ? 'animate-toast-out' : 'animate-toast-in'
      }`}
      onAnimationEnd={handleAnimationEnd}
    >
      {imageUrl && (
        <img
          src={imageUrl}
          alt="Screenshot"
          className="h-16 w-16 shrink-0 rounded object-cover"
        />
      )}

      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-white">{message}</p>
        <span className={`flex items-center gap-1 text-xs ${success ? 'text-neon-green' : 'text-neon-red'}`}>
          {success ? (
            <>
              <CheckCircleIcon className="h-4 w-4" />
              Discord に送信しました
            </>
          ) : (
            <>
              <XCircleIcon className="h-4 w-4" />
              送信に失敗しました
            </>
          )}
        </span>
      </div>
    </div>
  );
}
