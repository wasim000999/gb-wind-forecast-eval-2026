import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Cell,
} from "recharts";
import { HistogramBin } from "../types";

interface ErrorHistogramProps {
  data: HistogramBin[];
  p5?: number | null;
  p50?: number | null;
  p95?: number | null;
}

export const ErrorHistogram: React.FC<ErrorHistogramProps> = ({
  data,
  p5,
  p50,
  p95,
}) => {
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const item: HistogramBin = payload[0].payload;
    const isOver = item.binCenter > 0;
    return (
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 shadow-xl text-xs space-y-1 z-50">
        <div className="font-semibold text-slate-200 border-b border-slate-800 pb-1">
          Error Range: [{item.binStart.toFixed(0)} to {item.binEnd.toFixed(0)} MW]
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">Frequency Count:</span>
          <span className="font-mono text-slate-100 font-semibold">{item.count} intervals</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">Relative Frequency:</span>
          <span className="font-mono text-slate-100">{(item.frequency * 100).toFixed(2)}%</span>
        </div>
        <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800">
          {isOver ? "Overforecasting (generation surplus)" : "Underforecasting (generation deficit)"}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-100">
            Forecast Error Distribution (MW)
          </h3>
          <p className="text-xs text-slate-400">
            Error = Forecast - Actual. Negative values denote underforecasts; positive values denote overforecasts.
          </p>
        </div>
        {(p5 !== undefined || p50 !== undefined || p95 !== undefined) && (
          <div className="flex items-center gap-3 text-[11px] font-mono text-slate-300 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
            {p5 !== undefined && p5 !== null && <span>P05: {p5.toFixed(0)} MW</span>}
            {p50 !== undefined && p50 !== null && <span>Median: {p50.toFixed(0)} MW</span>}
            {p95 !== undefined && p95 !== null && <span>P95: {p95.toFixed(0)} MW</span>}
          </div>
        )}
      </div>

      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis
              dataKey="binCenter"
              stroke="#64748b"
              fontSize={11}
              tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`}
              unit=" MW"
            />
            <YAxis stroke="#64748b" fontSize={11} tickLine={false} unit=" int" />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine x={0} stroke="#f87171" strokeDasharray="3 3" label={{ value: "Zero Error", fill: "#f87171", fontSize: 10 }} />

            <Bar dataKey="count" name="Intervals" radius={[2, 2, 0, 0]}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.binCenter >= 0 ? "#f59e0b" : "#38bdf8"}
                  fillOpacity={0.8}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
