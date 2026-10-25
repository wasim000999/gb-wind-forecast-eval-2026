import React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from "recharts";
import { DiurnalAccuracy } from "../types";
import { formatMW } from "../utils/formatters";

interface DiurnalChartProps {
  data: DiurnalAccuracy[];
}

export const DiurnalChart: React.FC<DiurnalChartProps> = ({ data }) => {
  const chartData = data.map((d) => {
    const hr = Math.floor(d.hour);
    const min = d.hour % 1 === 0 ? "00" : "30";
    return {
      ...d,
      timeLabel: `${hr.toString().padStart(2, "0")}:${min}`,
    };
  });

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const item = payload[0].payload;
    return (
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 shadow-xl text-xs space-y-1 z-50">
        <div className="font-semibold text-slate-200 border-b border-slate-800 pb-1">
          Settlement Period {item.settlementPeriod} ({item.timeLabel} London Time)
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-emerald-400">Mean Actual:</span>
          <span className="font-mono text-slate-100">{formatMW(item.meanActual)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-indigo-400">Mean Forecast:</span>
          <span className="font-mono text-slate-100">{formatMW(item.meanForecast)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-amber-400">Mean MAE:</span>
          <span className="font-mono text-slate-100">{formatMW(item.mae)}</span>
        </div>
        <div className="flex justify-between gap-4 pt-1 border-t border-slate-800">
          <span className="text-sky-400 font-medium">Mean Bias:</span>
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
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-slate-100">
          Diurnal Half-Hourly Profile (48 Settlement Periods)
        </h3>
        <p className="text-xs text-slate-400">
          Average intraday generation cycle and forecasting bias across all days of January 2026.
        </p>
      </div>

      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="timeLabel" stroke="#64748b" fontSize={11} minTickGap={25} />
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

            <Line
              type="monotone"
              dataKey="meanActual"
              name="Avg Actual (MW)"
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="meanForecast"
              name="Avg Forecast (MW)"
              stroke="#818cf8"
              strokeWidth={2}
              strokeDasharray="3 3"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="mae"
              name="Avg MAE (MW)"
              stroke="#f59e0b"
              strokeWidth={1.5}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="bias"
              name="Avg Bias (MW)"
              stroke="#38bdf8"
              strokeWidth={1.5}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
