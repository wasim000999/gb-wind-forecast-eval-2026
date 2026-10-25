import React from "react";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  description?: string;
  icon: LucideIcon;
  badge?: {
    text: string;
    variant: "positive" | "negative" | "neutral" | "warning";
  };
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  description,
  icon: Icon,
  badge,
}) => {
  const badgeStyles = {
    positive: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    negative: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    neutral: "bg-slate-700/50 text-slate-300 border-slate-600/30",
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition">
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            {title}
          </span>
          <div className="h-8 w-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300">
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-slate-100 tracking-tight">{value}</span>
          {badge && (
            <span
              className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${
                badgeStyles[badge.variant]
              }`}
            >
              {badge.text}
            </span>
          )}
        </div>
      </div>
      {(subtitle || description) && (
        <div className="mt-3 pt-2.5 border-t border-slate-800/80">
          {subtitle && <p className="text-xs font-medium text-slate-300">{subtitle}</p>}
          {description && <p className="text-[11px] text-slate-400 mt-0.5">{description}</p>}
        </div>
      )}
    </div>
  );
};
