import React from "react";
import { BookOpen, ShieldCheck, Clock, BarChart3, Database } from "lucide-react";

export const MethodologyDoc: React.FC = () => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6 text-sm text-slate-300">
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-4">
        <BookOpen className="h-5 w-5 text-emerald-400" />
        <h2 className="text-base font-bold text-slate-100">
          Forecasting Methodology, Market Context & Provenance Documentation
        </h2>
      </div>

      {/* Grid of cards explaining key pillars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pillar 1: Market Decision Cutoff & Temporal Alignment */}
        <div className="space-y-3 bg-slate-800/40 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center space-x-2 text-emerald-400 font-semibold text-xs uppercase tracking-wider">
            <Clock className="h-4 w-4" />
            <span>1. Wholesale Day-Ahead Decision Cutoff</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            In Great Britain's wholesale electricity market, the primary Day-Ahead Auctions
            (EPEX SPOT GB and Nord Pool GB) have order book gate closure at{" "}
            <strong>11:00 London local time on Day D-1</strong> (with secondary European SDAC coupling alignment at 12:00 D-1).
          </p>
          <p className="text-xs text-slate-400 leading-relaxed">
            To prevent <strong>look-ahead bias (data leakage)</strong>, our evaluation algorithm
            strictly filters out all forecast publications where <code className="text-indigo-300 bg-slate-800 px-1 py-0.5 rounded">publishTime &gt; cutoffTime</code>.
            Only the latest forecast published on or before the auction cutoff is selected for evaluation.
          </p>
        </div>

        {/* Pillar 2: Data Sources & Elexon Stream API */}
        <div className="space-y-3 bg-slate-800/40 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center space-x-2 text-emerald-400 font-semibold text-xs uppercase tracking-wider">
            <Database className="h-4 w-4" />
            <span>2. Elexon BMRS Datasets</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            All data is sourced directly from official Elexon Insights Solution REST stream endpoints:
          </p>
          <ul className="text-xs text-slate-400 list-disc list-inside space-y-1">
            <li>
              <strong>Actual Generation Outturn:</strong> <code className="text-emerald-300 bg-slate-800 px-1 py-0.5 rounded">FUELHH</code> stream,
              filtered for <code className="text-slate-200">fuelType == 'WIND'</code>. Published half-hourly (MW average).
            </li>
            <li>
              <strong>Forecast Generation:</strong> <code className="text-indigo-300 bg-slate-800 px-1 py-0.5 rounded">WINDFOR</code> stream.
              National wind generation forecast vintages published across rolling horizons.
            </li>
          </ul>
        </div>

        {/* Pillar 3: Quantitative Metric Definitions */}
        <div className="space-y-3 bg-slate-800/40 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center space-x-2 text-emerald-400 font-semibold text-xs uppercase tracking-wider">
            <BarChart3 className="h-4 w-4" />
            <span>3. Quantitative Evaluation Metrics</span>
          </div>
          <div className="space-y-2 text-xs font-mono text-slate-300">
            <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
              <span className="text-slate-400">Error = </span>
              <span className="text-indigo-300">Forecast</span> - <span className="text-emerald-300">Actual</span> (MW)
            </div>
            <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
              <span className="text-slate-400">MAE = </span>
              <span>mean(|Error|) (MW)</span>
            </div>
            <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
              <span className="text-slate-400">RMSE = </span>
              <span>sqrt(mean(Error^2)) (MW)</span>
            </div>
            <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
              <span className="text-slate-400">Bias = </span>
              <span>mean(Error) (MW)</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400">
            <strong>Positive Bias:</strong> Systematic overforecasting (procuring excess volume in day-ahead wholesale market, risking cashout imbalance sale at lower prices).
            <br />
            <strong>Negative Bias:</strong> Systematic underforecasting (procuring deficit, exposed to intraday spike pricing).
          </p>
        </div>

        {/* Pillar 4: Timezone & Resolution Handling */}
        <div className="space-y-3 bg-slate-800/40 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center space-x-2 text-emerald-400 font-semibold text-xs uppercase tracking-wider">
            <ShieldCheck className="h-4 w-4" />
            <span>4. Timezone & Granularity Matching</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            All database operations, calculations, and internal timestamps are strictly maintained in <strong>UTC</strong>.
            Market cutoffs account for the local <strong>Europe/London</strong> clock (Greenwich Mean Time in January 2026, UTC+0).
          </p>
          <p className="text-xs text-slate-400 leading-relaxed">
            Elexon <code className="text-indigo-300 bg-slate-800 px-1 py-0.5 rounded">WINDFOR</code> forecasts are produced in 1-hour delivery blocks,
            while <code className="text-emerald-300 bg-slate-800 px-1 py-0.5 rounded">FUELHH</code> outturn is settled in 30-minute intervals.
            In procurement operations, each hourly forecast block covers both half-hours within the hour (SP 2k-1 and SP 2k), enabling complete 1,488 interval evaluation.
          </p>
        </div>
      </div>

      <div className="text-xs text-slate-500 border-t border-slate-800 pt-3">
        <strong>Disclaimer:</strong> This dashboard is a quantitative forecasting evaluation prototype designed to assess prediction accuracy.
        It does not make automated bidding or execution trades and does not claim simulated financial savings without an empirical trading model.
      </div>
    </div>
  );
};
