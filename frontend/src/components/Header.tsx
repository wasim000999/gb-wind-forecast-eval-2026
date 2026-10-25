import React from "react";
import { Wind, Database, RefreshCw, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import { CutoffOption } from "../types";

interface HeaderProps {
  dataSource: string;
  dataStatus: string;
  lastUpdated: string;
  cutoffStrategy: string;
  availableCutoffStrategies: CutoffOption[];
  onCutoffChange: (strategyId: string) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  dataSource,
  dataStatus,
  lastUpdated,
  cutoffStrategy,
  availableCutoffStrategies,
  onCutoffChange,
  onRefresh,
  isRefreshing,
}) => {
  const currentStrategy = availableCutoffStrategies.find((s) => s.id === cutoffStrategy);

  return (
    <header className="bg-slate-900/80 backdrop-blur border-b border-slate-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Wind className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-bold text-slate-100 tracking-tight">
                  GB Wind Forecast Evaluation
                </h1>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono border border-slate-700">
                  Jan 2026
                </span>
              </div>
              <p className="text-xs text-slate-400">
                UK Day-Ahead Wholesale Electricity Procurement Decision Support
              </p>
            </div>
          </div>

          {/* Controls & Status Bar */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Provenance Badge */}
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800/90 border border-slate-700 text-xs">
              <Database className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-slate-400">Data:</span>
              <span
                className={`font-medium flex items-center gap-1 ${
                  dataStatus === "LIVE"
                    ? "text-emerald-400"
                    : dataStatus === "CACHED"
                    ? "text-sky-400"
                    : "text-amber-400"
                }`}
                title={dataSource}
              >
                {dataStatus === "LIVE" ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : dataStatus === "CACHED" ? (
                  <Clock className="h-3 w-3" />
                ) : (
                  <AlertTriangle className="h-3 w-3" />
                )}
                {dataStatus === "LIVE"
                  ? "Elexon Live"
                  : dataStatus === "CACHED"
                  ? "Elexon Cache"
                  : "Demo / Synthetic"}
              </span>
            </div>

            {/* Cutoff Strategy Selector */}
            <div className="flex items-center space-x-2">
              <label htmlFor="cutoff-select" className="text-xs text-slate-400 font-medium">
                Decision Cutoff:
              </label>
              <select
                id="cutoff-select"
                value={cutoffStrategy}
                onChange={(e) => onCutoffChange(e.target.value)}
                className="bg-slate-800 border border-slate-700 hover:border-slate-600 text-slate-200 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
                title={currentStrategy?.description || ""}
              >
                {availableCutoffStrategies.map((strat) => (
                  <option key={strat.id} value={strat.id}>
                    {strat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Refresh Live Button */}
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-medium transition disabled:opacity-50"
              title={`Last fetched: ${lastUpdated}`}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              <span>{isRefreshing ? "Syncing..." : "Sync Live"}</span>
            </button>
          </div>
        </div>

        {/* Current Cutoff Rationale Banner */}
        {currentStrategy && (
          <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1.5 border-t border-slate-800/60 pt-2">
            <span className="text-slate-300 font-medium">Applied Gate Closure:</span>
            <span>{currentStrategy.description}</span>
            <span className="text-slate-500 hidden sm:inline">•</span>
            <span className="text-slate-500 hidden sm:inline italic">
              {currentStrategy.marketRationale}
            </span>
          </div>
        )}
      </div>
    </header>
  );
};
