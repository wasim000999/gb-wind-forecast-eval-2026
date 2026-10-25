import React, { useState, useEffect } from "react";
import { Download, ChevronLeft, ChevronRight, ArrowUpDown } from "lucide-react";
import { PaginatedIntervalsResponse } from "../types";
import { fetchIntervals } from "../services/api";
import { formatMW } from "../utils/formatters";

interface IntervalTableProps {
  cutoffStrategy: string;
  mappingMode?: string;
  dateFrom: string | null;
  dateTo: string | null;
  onSelectInterval: (startTime: string) => void;
}

export const IntervalTable: React.FC<IntervalTableProps> = ({
  cutoffStrategy,
  mappingMode = "step_block",
  dateFrom,
  dateTo,
  onSelectInterval,
}) => {
  const [data, setData] = useState<PaginatedIntervalsResponse | null>(null);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<string>("startTime");
  const [sortDesc, setSortDesc] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchIntervals(
          cutoffStrategy,
          mappingMode,
          page,
          pageSize,
          statusFilter,
          dateFrom || undefined,
          dateTo || undefined,
          sortBy,
          sortDesc
        );
        if (isMounted) setData(res);
      } catch (err: any) {
        if (isMounted) setError(err.message || "Failed to load interval records");
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [cutoffStrategy, mappingMode, page, pageSize, statusFilter, dateFrom, dateTo, sortBy, sortDesc]);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortDesc(!sortDesc);
    } else {
      setSortBy(field);
      setSortDesc(false);
    }
    setPage(1);
  };

  const exportCSV = async () => {
    try {
      const allRes = await fetchIntervals(
        cutoffStrategy,
        mappingMode,
        1,
        1500,
        statusFilter,
        dateFrom || undefined,
        dateTo || undefined,
        sortBy,
        sortDesc
      );
      const headers = [
        "StartTime_UTC",
        "SettlementDate",
        "SettlementPeriod",
        "ActualGeneration_MW",
        "ForecastGeneration_MW",
        "ForecastPublishTime_UTC",
        "CutoffTime_UTC",
        "Error_MW",
        "AbsoluteError_MW",
        "Status",
      ];
      const rows = allRes.intervals.map((r) => [
        r.startTime,
        r.settlementDate,
        r.settlementPeriod,
        r.actualGeneration ?? "",
        r.forecastGeneration ?? "",
        r.forecastPublishTime ?? "",
        r.cutoffTime ?? "",
        r.error ?? "",
        r.absoluteError ?? "",
        r.status,
      ]);
      const csvContent =
        "data:text/csv;charset=utf-8," +
        [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute(
        "download",
        `wind_forecast_actual_jan2026_${cutoffStrategy}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      alert(`Export failed: ${e}`);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden space-y-3">
      {/* Table Toolbar */}
      <div className="p-4 border-b border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-100">
            Interval-Level Evaluation Records (January 2026)
          </h3>
          <p className="text-xs text-slate-400">
            {data ? `${data.total} records total` : "Loading..."} • Click any row to inspect publication vintages.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Status Filter */}
          <div className="flex items-center space-x-1.5 text-xs">
            <span className="text-slate-400">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="bg-slate-800 border border-slate-700 text-slate-200 rounded px-2.5 py-1 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="ALL">All Intervals</option>
              <option value="VALID">Valid (Both Present)</option>
              <option value="MISSING_FORECAST">Missing Forecast</option>
              <option value="MISSING_ACTUAL">Missing Actual</option>
            </select>
          </div>

          {/* Page Size */}
          <div className="flex items-center space-x-1.5 text-xs">
            <span className="text-slate-400">Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="bg-slate-800 border border-slate-700 text-slate-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          {/* Export to CSV */}
          <button
            onClick={exportCSV}
            className="inline-flex items-center space-x-1 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium transition"
          >
            <Download className="h-3.5 w-3.5 text-emerald-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {loading && (
        <div className="p-8 text-center text-xs text-slate-400">
          Loading interval records...
        </div>
      )}

      {error && (
        <div className="m-4 p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs">
          Error: {error}
        </div>
      )}

      {data && !loading && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-800/60 text-slate-400 font-sans font-medium border-b border-slate-800">
              <tr>
                <th
                  onClick={() => handleSort("startTime")}
                  className="py-2.5 px-4 cursor-pointer hover:text-slate-200"
                >
                  <div className="flex items-center gap-1">
                    Delivery Start (UTC)
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="py-2.5 px-3">Date / SP</th>
                <th
                  onClick={() => handleSort("actualGeneration")}
                  className="py-2.5 px-3 cursor-pointer hover:text-slate-200"
                >
                  <div className="flex items-center gap-1">
                    Actual (FUELHH)
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("forecastGeneration")}
                  className="py-2.5 px-3 cursor-pointer hover:text-slate-200"
                >
                  <div className="flex items-center gap-1">
                    Forecast (WINDFOR)
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("error")}
                  className="py-2.5 px-3 cursor-pointer hover:text-slate-200"
                >
                  <div className="flex items-center gap-1">
                    Error (Fc - Act)
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("absoluteError")}
                  className="py-2.5 px-3 cursor-pointer hover:text-slate-200"
                >
                  <div className="flex items-center gap-1">
                    |Error|
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="py-2.5 px-3">Forecast Publish Time</th>
                <th className="py-2.5 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {data.intervals.map((r, i) => (
                <tr
                  key={i}
                  onClick={() => onSelectInterval(r.startTime)}
                  className="hover:bg-slate-800/50 cursor-pointer transition"
                >
                  <td className="py-2 px-4 text-slate-200 font-medium">
                    {r.startTime.substring(0, 16)}Z
                  </td>
                  <td className="py-2 px-3 text-slate-400 font-sans">
                    {r.settlementDate.substring(5)} • SP{r.settlementPeriod}
                  </td>
                  <td className="py-2 px-3 text-emerald-400 font-semibold">
                    {formatMW(r.actualGeneration)}
                  </td>
                  <td className="py-2 px-3 text-indigo-400 font-semibold">
                    {formatMW(r.forecastGeneration)}
                  </td>
                  <td className="py-2 px-3">
                    {r.error !== null ? (
                      <span
                        className={
                          r.error > 0
                            ? "text-amber-400 font-bold"
                            : "text-rose-400 font-bold"
                        }
                      >
                        {r.error > 0 ? `+${r.error.toFixed(1)}` : r.error.toFixed(1)} MW
                      </span>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-slate-300">
                    {r.absoluteError !== null ? `${r.absoluteError.toFixed(1)} MW` : "—"}
                  </td>
                  <td className="py-2 px-3 text-slate-400">
                    {r.forecastPublishTime ? r.forecastPublishTime.substring(0, 16) + "Z" : "—"}
                  </td>
                  <td className="py-2 px-4 font-sans">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        r.status === "VALID"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Bar */}
      {data && (
        <div className="p-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-sans">
          <span>
            Showing page <strong>{data.page}</strong> of <strong>{data.totalPages}</strong> (
            {data.total} total intervals)
          </span>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-300"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="font-mono text-slate-300">
              {page} / {data.totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(data.totalPages, page + 1))}
              disabled={page >= data.totalPages}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-300"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
