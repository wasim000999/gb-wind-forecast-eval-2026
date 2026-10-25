import React, { useState, useEffect } from "react";
import {
  Activity,
  BarChart2,
  Calendar,
  Layers,
  FileText,
  AlertTriangle,
  Zap,
  TrendingUp,
  Percent,
} from "lucide-react";
import { Header } from "./components/Header";
import { MetricCard } from "./components/MetricCard";
import { DateRangeFilter } from "./components/DateRangeFilter";
import { TimeseriesChart } from "./charts/TimeseriesChart";
import { DailyAccuracyChart } from "./charts/DailyAccuracyChart";
import { DiurnalChart } from "./charts/DiurnalChart";
import { ErrorHistogram } from "./charts/ErrorHistogram";
import { VintageInspector } from "./components/VintageInspector";
import { IntervalTable } from "./components/IntervalTable";
import { MethodologyDoc } from "./components/MethodologyDoc";
import {
  fetchMetadata,
  fetchOverview,
  fetchTimeseries,
  fetchAccuracy,
  triggerCacheRefresh,
} from "./services/api";
import {
  AccuracyResponse,
  CutoffOption,
  MetadataResponse,
  OverviewResponse,
  TimeseriesResponse,
} from "./types";
import { formatMW, formatMWh, formatPct } from "./utils/formatters";

export const App: React.FC = () => {
  // Navigation
  const [activeTab, setActiveTab] = useState<
    "overview" | "accuracy" | "vintages" | "table" | "docs"
  >("overview");

  // Filter state
  const [cutoffStrategy, setCutoffStrategy] = useState<string>("D1_1100");
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);
  const [selectedIntervalTime, setSelectedIntervalTime] = useState<string | null>(null);

  // Data state
  const [metadata, setMetadata] = useState<MetadataResponse | null>(null);
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [timeseries, setTimeseries] = useState<TimeseriesResponse | null>(null);
  const [accuracy, setAccuracy] = useState<AccuracyResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Initial load
  useEffect(() => {
    async function init() {
      try {
        const meta = await fetchMetadata();
        setMetadata(meta);
      } catch (err: any) {
        console.error("Failed to load metadata:", err);
      }
    }
    init();
  }, []);

  // Fetch dashboard data when filters change
  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ovRes, tsRes, accRes] = await Promise.all([
        fetchOverview(cutoffStrategy, dateFrom || undefined, dateTo || undefined),
        fetchTimeseries(cutoffStrategy, dateFrom || undefined, dateTo || undefined),
        fetchAccuracy(cutoffStrategy, dateFrom || undefined, dateTo || undefined),
      ]);
      setOverview(ovRes);
      setTimeseries(tsRes);
      setAccuracy(accRes);
    } catch (err: any) {
      setError(err.message || "Failed to load forecasting evaluation data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [cutoffStrategy, dateFrom, dateTo]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await triggerCacheRefresh();
      await loadDashboardData();
    } catch (e: any) {
      alert(`Refresh failed: ${e.message}`);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSelectInterval = (st: string) => {
    setSelectedIntervalTime(st);
    setActiveTab("vintages");
  };

  const cutoffOptions: CutoffOption[] = metadata?.availableCutoffStrategies || [
    {
      id: "D1_1100",
      name: "Day-Ahead D-1 11:00 London Time",
      description: "GB Day-Ahead auction cutoff",
      marketRationale: "Nord Pool / EPEX SPOT order books close 11:00 D-1",
      isDefault: true,
    },
    {
      id: "D1_1200",
      name: "Day-Ahead D-1 12:00 London Time",
      description: "Pan-European SDAC cutoff",
      marketRationale: "European market coupling alignment",
      isDefault: false,
    },
    {
      id: "ROLLING_24H",
      name: "Rolling 24-Hour Horizon",
      description: "24 hours prior to delivery start",
      marketRationale: "Rolling benchmark",
      isDefault: false,
    },
  ];

  const m = overview?.metrics;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans">
      <Header
        dataSource={overview?.dataSource || "Loading..."}
        dataStatus={overview?.dataStatus || "CACHED"}
        lastUpdated={overview?.lastUpdated || "—"}
        cutoffStrategy={cutoffStrategy}
        availableCutoffStrategies={cutoffOptions}
        onCutoffChange={setCutoffStrategy}
        onRefresh={handleRefresh}
        isRefreshing={refreshing}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 space-x-1 overflow-x-auto">
          {[
            { id: "overview", label: "Executive Overview & Timeseries", icon: Activity },
            { id: "accuracy", label: "Accuracy & Distributions", icon: BarChart2 },
            { id: "vintages", label: "Forecast Vintage Inspector", icon: Layers },
            { id: "table", label: "Interval Records & Export", icon: Calendar },
            { id: "docs", label: "Methodology & Provenance", icon: FileText },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 py-3 px-4 text-xs font-semibold border-b-2 transition whitespace-nowrap ${
                  active
                    ? "border-emerald-500 text-emerald-400 bg-emerald-500/5"
                    : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Global Date Range Filter (Visible on relevant tabs) */}
        {activeTab !== "docs" && (
          <DateRangeFilter
            selectedFrom={dateFrom}
            selectedTo={dateTo}
            onRangeChange={(from, to) => {
              setDateFrom(from);
              setDateTo(to);
            }}
          />
        )}

        {/* Loading Spinner */}
        {loading && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-400 text-sm">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-500 border-t-transparent mb-3"></div>
            <p>Evaluating day-ahead wind generation forecasts against outturn...</p>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 text-rose-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* TAB 1: OVERVIEW & TIMESERIES */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                {/* KPI Metrics Summary Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
                  <MetricCard
                    title="MAE (Magnitude)"
                    value={formatMW(m?.mae)}
                    subtitle="Mean Absolute Error"
                    description="Average magnitude of forecasting error"
                    icon={Activity}
                    badge={{ text: "Error Magnitude", variant: "warning" }}
                  />
                  <MetricCard
                    title="RMSE (Penalty)"
                    value={formatMW(m?.rmse)}
                    subtitle="Root Mean Squared Error"
                    description="Heavily penalizes large forecasting misses"
                    icon={Zap}
                    badge={{ text: "Large Misses", variant: "neutral" }}
                  />
                  <MetricCard
                    title="Forecasting Bias"
                    value={
                      m?.bias !== null && m?.bias !== undefined
                        ? `${m.bias > 0 ? "+" : ""}${m.bias.toFixed(1)} MW`
                        : "—"
                    }
                    subtitle={
                      (m?.bias || 0) > 0 ? "Systematic Overforecast" : "Systematic Underforecast"
                    }
                    description="Mean(Forecast - Actual)"
                    icon={TrendingUp}
                    badge={{
                      text: (m?.bias || 0) > 0 ? "Overforecast" : "Underforecast",
                      variant: (m?.bias || 0) > 0 ? "warning" : "negative",
                    }}
                  />
                  <MetricCard
                    title="Forecast Coverage"
                    value={formatPct(m?.coveragePercentage)}
                    subtitle={`${m?.validIntervals || 0} of ${m?.totalIntervals || 0} intervals`}
                    description="Evaluated half-hours with valid pairs"
                    icon={Percent}
                    badge={{ text: "Data Completeness", variant: "positive" }}
                  />
                  <MetricCard
                    title="Total Wind Outturn"
                    value={formatMWh(m?.totalActualMWh)}
                    subtitle={`Mean: ${formatMW(m?.meanActualMW)}`}
                    description="Actual energy delivered (Elexon FUELHH)"
                    icon={Zap}
                  />
                  <MetricCard
                    title="Total Wind Forecast"
                    value={formatMWh(m?.totalForecastMWh)}
                    subtitle={`Mean: ${formatMW(m?.meanForecastMW)}`}
                    description="Forecast volume prior to cutoff"
                    icon={Layers}
                  />
                </div>

                {/* Primary Time Series Chart */}
                {timeseries && (
                  <TimeseriesChart
                    data={timeseries.intervals}
                    onSelectInterval={handleSelectInterval}
                    selectedStartTime={selectedIntervalTime}
                  />
                )}
              </div>
            )}

            {/* TAB 2: ACCURACY & DISTRIBUTIONS */}
            {activeTab === "accuracy" && accuracy && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Daily Accuracy Breakdown */}
                  <DailyAccuracyChart data={accuracy.dailyBreakdown} />
                  {/* Error Distribution Histogram */}
                  <ErrorHistogram
                    data={accuracy.errorDistribution}
                    p5={m?.p5Error}
                    p50={m?.p50Error}
                    p95={m?.p95Error}
                  />
                </div>

                {/* Diurnal Half-Hourly Profile */}
                <DiurnalChart data={accuracy.diurnalBreakdown} />
              </div>
            )}

            {/* TAB 3: VINTAGE INSPECTOR */}
            {activeTab === "vintages" && (
              <VintageInspector
                initialStartTime={selectedIntervalTime}
                cutoffStrategy={cutoffStrategy}
              />
            )}

            {/* TAB 4: DATA TABLE */}
            {activeTab === "table" && (
              <IntervalTable
                cutoffStrategy={cutoffStrategy}
                dateFrom={dateFrom}
                dateTo={dateTo}
                onSelectInterval={handleSelectInterval}
              />
            )}

            {/* TAB 5: METHODOLOGY & DOCS */}
            {activeTab === "docs" && <MethodologyDoc />}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-900/50 py-4 text-center text-xs text-slate-500">
        <p>
          GB Wholesale Electricity Market Day-Ahead Wind Forecast Evaluation Platform • January 2026 Reporting Window
        </p>
        <p className="mt-1 text-[11px] text-slate-600">
          Built for REint Full Stack SWE Assignment. Compliant with Elexon BMRS API specifications.
        </p>
      </footer>
    </div>
  );
};
