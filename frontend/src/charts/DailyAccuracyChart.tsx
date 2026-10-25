import React from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from "recharts";
import { DailyAccuracy } from "../types";
import { formatMW } from "../utils/formatters";

interface DailyAccuracyChartProps {
  data: DailyAccuracy[];
}

export const DailyAccuracyChart: React.FC<DailyAccuracyChartProps> = ({ data }) => {
  const chartData = data.map((d) => ({
    ...d,
    dayLabel: d.date.substring(8),
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const item: DailyAccuracy = payload[0].payload;
    return (
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 shadow-xl text-xs space-y-1 z-50">
        <div className="font-semibold text-slate-200 border-b border-slate-800 pb-1">
          {item.date} ({item.validCount} / {item.totalCount} intervals)
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-amber-400 font-medium">MAE:</span>
          <span className="font-mono text-slate-100">{formatMW(item.mae)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-purple-400 font-medium">RMSE:</span>
          <span className="font-mono text-slate-100">{formatMW(item.rmse)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-sky-400 font-medium">Bias:</span>
          <span
            className={`font-mono font-bold ${
              (item.bias || 0) >= 0 ? "text-amber-400" : "text-rose-400"
            }`}
          >
            {item.bias !== null
              ? item.bias > 0
                ? `+${item.bias.toFixed(1)} MW`
                : `${item.bias.toFixed(1)} MW`
              : "—"}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-100">
            Daily Forecast Accuracy Breakdown (January 2026)
          </h3>
          <p className="text-xs text-slate-400">
            MAE & RMSE (magnitude) vs Bias (directional over/underforecasting).
          </p>
        </div>
      </div>

      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="dayLabel" stroke="#64748b" fontSize={11} tickLine={false} />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              unit=" MW"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="top" height={32} />
            <ReferenceLine y={0} stroke="#475569" strokeWidth={1} />

            <Bar dataKey="mae" name="MAE (MW)" fill="#f59e0b" fillOpacity={0.8} radius={[2, 2, 0, 0]} />
            <Line
              type="monotone"
              dataKey="rmse"
              name="RMSE (MW)"
              stroke="#a855f7"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="bias"
              name="Bias (MW)"
              stroke="#38bdf8"
              strokeWidth={2}
              dot={{ r: 2, fill: "#38bdf8" }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
