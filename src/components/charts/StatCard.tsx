import type { ReactNode } from 'react';

interface StatCardProps {
  icon: ReactNode;
  value: string;
  label: string;
  color: string; // tailwind text color class, e.g. 'text-neon-blue'
}

export function StatCard({ icon, value, label, color }: StatCardProps) {
  return (
    <div className="bg-dark-surface border border-dark-border rounded-xl p-4 flex flex-col items-center gap-2 animate-fade-slide-up">
      <div className={`${color}`}>{icon}</div>
      <span className={`text-2xl font-bold ${color}`}>{value}</span>
      <span className="text-xs text-gray-400">{label}</span>
    </div>
  );
}
