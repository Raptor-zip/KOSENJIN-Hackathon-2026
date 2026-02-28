import { useState } from 'react';
import { ArrowLeftIcon, ClockIcon, MoonIcon, ZapIcon, ChevronLeftIcon, ChevronRightIcon } from './Icons';
import { StatCard } from './charts/StatCard';
import { WeeklyBarChart } from './charts/WeeklyBarChart';
import { SessionTimeline } from './charts/SessionTimeline';
import { useDashboardData } from '../hooks/useDashboardData';
import { sendDailyReport } from '../utils/sendDiscordWebhook';
import { getWebhookUrl, isValidWebhookUrl } from '../utils/webhookSettings';

interface DashboardScreenProps {
  onBack: () => void;
}

function formatMs(ms: number): string {
  const totalMin = Math.floor(ms / 60000);
  if (totalMin < 60) return `${totalMin}分`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}時間${m}分`;
}


export function DashboardScreen({ onBack }: DashboardScreenProps) {
  const {
    weeklySummaries,
    selectedDate,
    setSelectedDate,
    daySessions,
    loading,
    goToPreviousDay,
    goToNextDay,
  } = useDashboardData();

  const [shareState, setShareState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const todaySummary = weeklySummaries[weeklySummaries.length - 1];
  const selectedSummary = weeklySummaries.find((s) => s.date === selectedDate);

  const webhookConfigured = isValidWebhookUrl(getWebhookUrl());

  const handleShare = async () => {
    if (!selectedSummary) return;
    setShareState('sending');
    const ok = await sendDailyReport({
      date: selectedSummary.date,
      totalWorkMs: selectedSummary.totalWorkMs,
      totalDrowsy: selectedSummary.totalDrowsy,
      totalSquats: selectedSummary.totalSquats,
    });
    setShareState(ok ? 'sent' : 'error');
    setTimeout(() => setShareState('idle'), 2000);
  };

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-dark-bg">
        <div className="w-8 h-8 border-2 border-neon-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-dark-bg relative overflow-hidden flex flex-col">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-neon-blue/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-64 h-64 bg-neon-purple/10 rounded-full blur-3xl" />
      </div>

      {/* Sticky header */}
      <div className="relative z-10 flex items-center gap-3 px-4 py-4 bg-dark-bg/80 backdrop-blur border-b border-dark-border">
        <button
          onClick={onBack}
          className="p-2 rounded-lg bg-dark-surface border border-dark-border text-gray-400 hover:text-white transition-colors"
          aria-label="戻る"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold text-white flex-1">ダッシュボード</h1>
        {webhookConfigured && (
          <button
            onClick={handleShare}
            disabled={shareState === 'sending' || shareState === 'sent'}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors flex items-center gap-1.5 ${
              shareState === 'sent'
                ? 'bg-neon-green/20 border-neon-green text-neon-green'
                : shareState === 'error'
                  ? 'bg-neon-red/20 border-neon-red text-neon-red'
                  : 'bg-dark-surface border-gray-600 text-gray-200 hover:border-neon-blue hover:text-white'
            }`}
          >
            {shareState === 'sending' ? (
              <>
                <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                送信中
              </>
            ) : shareState === 'sent' ? (
              '送信済み'
            ) : shareState === 'error' ? (
              '送信失敗'
            ) : (
              <>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03Z" />
                </svg>
                共有
              </>
            )}
          </button>
        )}
      </div>

      {/* Scrollable content */}
      <div className="relative z-10 flex-1 overflow-y-auto px-4 pb-8">
        {/* Today's stats */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <StatCard
            icon={<ClockIcon className="w-6 h-6" />}
            value={formatMs(todaySummary?.totalWorkMs ?? 0)}
            label="作業時間"
            color="text-neon-blue"
          />
          <StatCard
            icon={<MoonIcon className="w-6 h-6" />}
            value={String(todaySummary?.totalDrowsy ?? 0)}
            label="居眠り"
            color="text-neon-red"
          />
          <StatCard
            icon={<ZapIcon className="w-6 h-6" />}
            value={String(todaySummary?.totalSquats ?? 0)}
            label="スクワット"
            color="text-neon-green"
          />
        </div>

        {/* Weekly bar chart */}
        <div className="mt-4">
          <WeeklyBarChart
            data={weeklySummaries}
            selectedDate={selectedDate}
            onSelect={setSelectedDate}
          />
        </div>

        {/* Date selector */}
        <div className="flex items-center justify-center gap-4 mt-4">
          <button
            onClick={goToPreviousDay}
            className="p-2 rounded-lg bg-dark-surface border border-dark-border text-gray-400 hover:text-white transition-colors"
            aria-label="前日"
          >
            <ChevronLeftIcon className="w-4 h-4" />
          </button>
          <span className="text-sm font-mono text-white min-w-[110px] text-center">
            {selectedDate}
          </span>
          <button
            onClick={goToNextDay}
            className="p-2 rounded-lg bg-dark-surface border border-dark-border text-gray-400 hover:text-white transition-colors"
            aria-label="翌日"
          >
            <ChevronRightIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Session timeline */}
        <div className="mt-4">
          <SessionTimeline sessions={daySessions} date={selectedDate} />
        </div>
      </div>
    </div>
  );
}
