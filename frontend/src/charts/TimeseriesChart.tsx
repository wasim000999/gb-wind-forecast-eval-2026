import React from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  Brush,
} from "recharts";
import { IntervalRecord } from "../types";
import { formatMW } from "../utils/formatters";

interface TimeseriesChartProps {
  data: IntervalRecord[];
  onSelectInterval?: (startTime: string) => void;
  selectedStartTime?: string | null;
}

export const TimeseriesChart: React.FC<TimeseriesChartProps> = ({
  data,
  onSelectInterval,
  selectedStartTime,
}) => {
  // Format for Recharts
  const chartData = data.map((d) => ({
    ...d,
    displayTime: d.startTime.replace("T", " ").substring(5, 16),
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const item: IntervalRecord & { displayTime: string } = payload[0].payload;
    const isOverforecast = (item.error || 0) > 0;

    return (
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 shadow-xl text-xs space-y-1.5 z-50">
        <div className="border-b border-slate-800 pb-1 flex justify-between gap-4 font-mono">
          <span className="text-slate-300 font-semibold">{item.startTime}</span>
          <span className="text-slate-400">SP {item.settlementPeriod}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-emerald-400 font-medium">Actual Outturn:</span>
          <span className="text-slate-100 font-mono font-semibold">
            {formatMW(item.actualGeneration)}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-indigo-400 font-medium">Day-Ahead Forecast:</span>
          <span className="text-slate-100 font-mono font-semibold">
            {formatMW(item.forecastGeneration)}
          </span>
        </div>
        {item.error !== null && (
          <div className="flex justify-between gap-4 pt-1 border-t border-slate-800">
            <span className="text-slate-400">Error (Fc - Act):</span>
            <span
              className={`font-mono font-bold ${
                isOverforecast ? "text-amber-400" : "text-rose-400"
              }`}
            >
              {item.error > 0 ? `+${item.error.toFixed(1)}` : item.error.toFixed(1)} MW
            </span>
          </div>
        )}
        {item.forecastPublishTime && (
          <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800/60">
            <span>Forecast Published: </span>
            <span className="text-slate-300">{item.forecastPublishTime.substring(0, 16)} UTC</span>
          </div>
        )}
        <div className="text-[10px] text-emerald-400 italic pt-0.5">
          Click data point to inspect all forecast vintages
        </div>
      </div>
    );
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">
            National Wind Power Generation: Day-Ahead Forecast vs Outturn
          </h2>
          <p className="text-xs text-slate-400">
            30-minute settlement intervals (January 2026). Click any point to inspect publication vintages.
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
            <span className="text-slate-300">Actual (FUELHH)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-indigo-400"></span>
            <span className="text-slate-300">Selected Forecast (WINDFOR)</span>
          </div>
        </div>
      </div>

      <div className="h-[380px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            onClick={(e) => {
              if (e && e.activePayload && e.activePayload.length) {
                const clickedItem = e.activePayload[0].payload;
                if (onSelectInterval) onSelectInterval(clickedItem.startTime);
              }
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis
              dataKey="displayTime"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              minTickGap={40}
            />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              unit=" MW"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="top" height={36} />

            <Line
              type="monotone"
              dataKey="actualGeneration"
              name="Actual Outturn (MW)"
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, fill: "#10b981", stroke: "#0f172a", strokeWidth: 2 }}
            />
            <Line
              type="monotone"
              dataKey="forecastGeneration"
              name="Day-Ahead Forecast (MW)"
              stroke="#818cf8"
              strokeWidth={2}
              strokeDasharray="4 2"
              dot={false}
              activeDot={{ r: 5, fill: "#818cf8", stroke: "#0f172a", strokeWidth: 2 }}
            />
            <Brush
              dataKey="displayTime"
              height={30}
              stroke="#475569"
              fill="#0f172a"
              travellerWidth={10}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      {selectedStartTime && (
        <div className="mt-2 text-xs text-emerald-400 flex items-center justify-between bg-emerald-950/30 border border-emerald-800/40 px-3 py-1.5 rounded-lg">
          <span>Active interval selected: <strong>{selectedStartTime}</strong></span>
          <span className="text-[11px] text-slate-400">See "Vintage Inspector" tab below for details</span>
        </div>
      )}
    </div>
  );
};
