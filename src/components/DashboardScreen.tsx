import { ArrowLeftIcon, ClockIcon, MoonIcon, ZapIcon, ChevronLeftIcon, ChevronRightIcon } from './Icons';
import { StatCard } from './charts/StatCard';
import { WeeklyBarChart } from './charts/WeeklyBarChart';
import { SessionTimeline } from './charts/SessionTimeline';
import { useDashboardData } from '../hooks/useDashboardData';

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

function getInsight(workMs: number, drowsy: number, squats: number): string {
  if (workMs === 0) return 'まだセッションがありません。監視を開始しましょう！';
  const min = Math.round(workMs / 60000);
  if (drowsy === 0) return `${min}分間集中しました。素晴らしい集中力です！`;
  if (drowsy <= 2) return `${min}分間で${drowsy}回眠くなりました。良いペースです！`;
  return `${min}分間で${drowsy}回眠くなりました。休憩を取りましょう。`;
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

  const todaySummary = weeklySummaries[weeklySummaries.length - 1];
  const selectedSummary = weeklySummaries.find((s) => s.date === selectedDate);

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
        <h1 className="text-lg font-bold text-white">ダッシュボード</h1>
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

        {/* Insight card */}
        <div className="mt-4 bg-dark-surface border border-dark-border rounded-xl p-4 animate-fade-slide-up">
          <p className="text-sm text-gray-300 leading-relaxed">
            <span className="text-neon-purple font-bold mr-1">Insight</span>
            {getInsight(
              selectedSummary?.totalWorkMs ?? 0,
              selectedSummary?.totalDrowsy ?? 0,
              selectedSummary?.totalSquats ?? 0,
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
