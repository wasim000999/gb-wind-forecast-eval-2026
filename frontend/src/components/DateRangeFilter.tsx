import React from "react";
import { Calendar } from "lucide-react";

interface DateRangeFilterProps {
  selectedFrom: string | null;
  selectedTo: string | null;
  onRangeChange: (from: string | null, to: string | null) => void;
}

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  selectedFrom,
  selectedTo,
  onRangeChange,
}) => {
  const quickRanges = [
    { label: "All Month (Jan 1–31)", from: null, to: null },
    { label: "Week 1 (Jan 1–7)", from: "2026-01-01", to: "2026-01-07" },
    { label: "Week 2 (Jan 8–14)", from: "2026-01-08", to: "2026-01-14" },
    { label: "Week 3 (Jan 15–21)", from: "2026-01-15", to: "2026-01-21" },
    { label: "Week 4 (Jan 22–28)", from: "2026-01-22", to: "2026-01-28" },
    { label: "End Month (Jan 29–31)", from: "2026-01-29", to: "2026-01-31" },
  ];

  const isCurrent = (from: string | null, to: string | null) => {
    return selectedFrom === from && selectedTo === to;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
      {/* Quick Filter Pills */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-slate-400 mr-1 flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5" />
          Filter:
        </span>
        {quickRanges.map((qr, idx) => {
          const active = isCurrent(qr.from, qr.to);
          return (
            <button
              key={idx}
              onClick={() => onRangeChange(qr.from, qr.to)}
              className={`text-xs px-2.5 py-1 rounded-lg transition font-medium ${
                active
                  ? "bg-emerald-500 text-slate-950 shadow-sm shadow-emerald-500/20"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
              }`}
            >
              {qr.label}
            </button>
          );
        })}
      </div>

      {/* Custom Date Pickers */}
      <div className="flex items-center space-x-2 text-xs">
        <label className="text-slate-400">Custom:</label>
        <input
          type="date"
          min="2026-01-01"
          max="2026-01-31"
          value={selectedFrom || "2026-01-01"}
          onChange={(e) => onRangeChange(e.target.value, selectedTo || "2026-01-31")}
          className="bg-slate-800 border border-slate-700 text-slate-200 rounded px-2 py-1 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
        />
        <span className="text-slate-500">to</span>
        <input
          type="date"
          min="2026-01-01"
          max="2026-01-31"
          value={selectedTo || "2026-01-31"}
          onChange={(e) => onRangeChange(selectedFrom || "2026-01-01", e.target.value)}
          className="bg-slate-800 border border-slate-700 text-slate-200 rounded px-2 py-1 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
        />
        {(selectedFrom || selectedTo) && (
          <button
            onClick={() => onRangeChange(null, null)}
            className="text-slate-400 hover:text-slate-200 underline text-[11px] ml-1"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );
};
