import React, { useState, useEffect } from "react";
import {
  Clock,
  CheckCircle,
  AlertOctagon,
  History,
  TrendingUp,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { VintagesResponse } from "../types";
import { fetchVintages } from "../services/api";
import { formatMW, formatDateTime } from "../utils/formatters";

interface VintageInspectorProps {
  initialStartTime?: string | null;
  cutoffStrategy: string;
}

export const VintageInspector: React.FC<VintageInspectorProps> = ({
  initialStartTime,
  cutoffStrategy,
}) => {
  const [selectedTime, setSelectedTime] = useState<string>(
    initialStartTime || "2026-01-02T12:00:00Z"
  );
  const [data, setData] = useState<VintagesResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialStartTime) {
      setSelectedTime(initialStartTime);
    }
  }, [initialStartTime]);

  useEffect(() => {
    let isMounted = true;
    async function loadVintages() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchVintages(selectedTime, cutoffStrategy);
        if (isMounted) setData(res);
      } catch (err: any) {
        if (isMounted) setError(err.message || "Failed to load vintages");
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadVintages();
    return () => {
      isMounted = false;
    };
  }, [selectedTime, cutoffStrategy]);

  // Sample intervals for quick selection
  const sampleIntervals = [
    { label: "Jan 02 12:00 (SP 25)", value: "2026-01-02T12:00:00Z" },
    { label: "Jan 05 18:00 (SP 37)", value: "2026-01-05T18:00:00Z" },
    { label: "Jan 10 08:00 (SP 17)", value: "2026-01-10T08:00:00Z" },
    { label: "Jan 15 14:00 (SP 29)", value: "2026-01-15T14:00:00Z" },
    { label: "Jan 22 20:00 (SP 41)", value: "2026-01-22T20:00:00Z" },
    { label: "Jan 30 11:30 (SP 24)", value: "2026-01-30T11:30:00Z" },
  ];

  // Chart data for vintage evolution trajectory
  const trajectoryData = data
    ? data.vintages.map((v) => ({
        ...v,
        displayPub: v.publishTime.replace("T", " ").substring(5, 16),
      }))
    : [];

  return (
    <div className="space-y-4">
      {/* Target Delivery Interval Selector Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center space-x-2">
          <History className="h-5 w-5 text-emerald-400" />
          <div>
            <h3 className="text-sm font-semibold text-slate-100">
              Forecast Vintage & Look-Ahead Prevention Inspector
            </h3>
            <p className="text-xs text-slate-400">
              Inspect all publications leading up to delivery and verify the day-ahead cutoff.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs text-slate-400">Quick Pick:</label>
          {sampleIntervals.map((si, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedTime(si.value)}
              className={`text-xs px-2.5 py-1 rounded-lg border font-mono transition ${
                selectedTime === si.value
                  ? "bg-emerald-600/30 text-emerald-300 border-emerald-500/50"
                  : "bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600"
              }`}
            >
              {si.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400 text-sm">
          Loading forecast publication vintages...
        </div>
      )}

      {error && (
        <div className="bg-rose-950/40 border border-rose-800 text-rose-300 rounded-xl p-4 text-xs">
          Error loading vintages: {error}
        </div>
      )}

      {data && !loading && (
        <div className="space-y-4">
          {/* Interval Header Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider font-medium">
                Delivery Interval Start
              </span>
              <p className="text-sm font-mono font-bold text-slate-100 mt-1">
                {formatDateTime(data.deliveryStartTime)}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {data.settlementDate} • SP {data.settlementPeriod}
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider font-medium">
                Applied Decision Cutoff
              </span>
              <p className="text-sm font-mono font-bold text-amber-400 mt-1">
                {formatDateTime(data.cutoffTime)}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Gate closure rule: {cutoffStrategy}
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider font-medium">
                Actual Generation Outturn
              </span>
              <p className="text-base font-mono font-bold text-emerald-400 mt-1">
                {formatMW(data.actualGeneration)}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Elexon FUELHH (WIND)
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider font-medium">
                Selected Day-Ahead Forecast
              </span>
              <p className="text-base font-mono font-bold text-indigo-400 mt-1">
                {data.selectedForecast ? formatMW(data.selectedForecast.generation) : "Missing"}
              </p>
              {data.selectedForecast && data.actualGeneration !== null && (
                <p className="text-xs font-mono mt-0.5 text-slate-300">
                  Error: {(data.selectedForecast.generation - data.actualGeneration) > 0 ? "+" : ""}
                  {(data.selectedForecast.generation - data.actualGeneration).toFixed(1)} MW
                </p>
              )}
            </div>
          </div>

          {/* Forecast Update Trajectory Chart */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 text-indigo-400" />
                <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                  Forecast Evolution Trajectory (How the Forecast Changed Over Time)
                </h4>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className="h-2 w-2 rounded-full bg-indigo-500"></span> Forecast Vintage (WINDFOR)
                </span>
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-500"></span> Actual Outturn
                </span>
              </div>
            </div>

            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trajectoryData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="displayPub" stroke="#64748b" fontSize={10} minTickGap={20} />
                  <YAxis
                    stroke="#64748b"
                    fontSize={10}
                    tickLine={false}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    unit=" MW"
                  />
                  <Tooltip
                    content={({ active, payload }: any) => {
                      if (!active || !payload || !payload.length) return null;
                      const item = payload[0].payload;
                      return (
                        <div className="bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs shadow-xl space-y-1">
                          <p className="text-slate-300 font-semibold">Published: {item.publishTime}</p>
                          <p className="text-indigo-400">Forecast: {formatMW(item.generation)}</p>
                          <p className="text-slate-400">{item.hoursBeforeDelivery} hours before delivery</p>
                          <p className={item.isEligible ? "text-emerald-400" : "text-rose-400"}>
                            {item.isEligible ? "Eligible before cutoff" : "Post-cutoff (Excluded)"}
                          </p>
                        </div>
                      );
                    }}
                  />
                  {data.actualGeneration !== null && (
                    <ReferenceLine
                      y={data.actualGeneration}
                      stroke="#10b981"
                      strokeWidth={2}
                      label={{ value: `Actual: ${data.actualGeneration.toFixed(0)} MW`, fill: "#10b981", fontSize: 10, position: "insideBottomRight" }}
                    />
                  )}
                  <Line
                    type="stepAfter"
                    dataKey="generation"
                    stroke="#818cf8"
                    strokeWidth={2}
                    dot={{ r: 4, fill: "#818cf8" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Vintages Chronological Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="p-3.5 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                  Chronological Forecast Publications ({data.totalVintages} total, {data.eligibleCount} eligible)
                </h4>
                <p className="text-[11px] text-slate-400">
                  Strictly enforces decision timing. Forecasts published after gate closure are classified as Look-Ahead Leakage.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800/60 text-slate-400 font-medium border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-4">Publication Time (UTC)</th>
                    <th className="py-2.5 px-4">Lead Time</th>
                    <th className="py-2.5 px-4">Forecast Gen</th>
                    <th className="py-2.5 px-4">Decision Status</th>
                    <th className="py-2.5 px-4">Evaluation Rationale</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono">
                  {data.vintages.map((v, i) => (
                    <tr
                      key={i}
                      className={
                        v.isSelected
                          ? "bg-emerald-950/30 border-l-4 border-l-emerald-500"
                          : !v.isEligible
                          ? "bg-rose-950/10 text-slate-400"
                          : "hover:bg-slate-800/40"
                      }
                    >
                      <td className="py-2.5 px-4 text-slate-200 flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-slate-500" />
                        {v.publishTime}
                      </td>
                      <td className="py-2.5 px-4 text-slate-300">
                        {v.hoursBeforeDelivery.toFixed(1)} hrs before
                      </td>
                      <td className="py-2.5 px-4 font-bold text-slate-100">
                        {formatMW(v.generation)}
                      </td>
                      <td className="py-2.5 px-4">
                        {v.isSelected ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-sans font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            <CheckCircle className="h-3 w-3" />
                            SELECTED DECISION FORECAST
                          </span>
                        ) : !v.isEligible ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-sans font-medium bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            <AlertOctagon className="h-3 w-3" />
                            EXCLUDED (LOOK-AHEAD)
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-sans text-slate-400 bg-slate-800 border border-slate-700">
                            SUPERSEDED
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 font-sans text-[11px] text-slate-300">
                        {v.isSelected
                          ? "Latest eligible forecast published on or before the day-ahead auction cutoff."
                          : v.exclusionReason || "Replaced by later eligible forecast."}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
