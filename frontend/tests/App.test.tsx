import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { App } from "../src/App";

// Mock API service
vi.mock("../src/services/api", () => ({
  fetchMetadata: vi.fn().mockResolvedValue({
    projectName: "GB Wind Forecast Evaluation",
    version: "1.0.0",
    reportingPeriod: "January 2026",
    targetMonth: "2026-01",
    timezone: "Europe/London (GMT)",
    dataSource: "Elexon BMRS Live",
    dataStatus: "LIVE",
    availableCutoffStrategies: [
      {
        id: "D1_1100",
        name: "Day-Ahead D-1 11:00 London Time",
        description: "GB Day-Ahead auction cutoff",
        marketRationale: "Nord Pool GB gate closure",
        isDefault: true,
      },
    ],
    metricDefinitions: {},
  }),
  fetchOverview: vi.fn().mockResolvedValue({
    reportingPeriod: "January 2026",
    periodStart: "2026-01-01T00:00:00Z",
    periodEnd: "2026-01-31T23:30:00Z",
    dataSource: "Elexon BMRS Live API",
    dataStatus: "LIVE",
    lastUpdated: "2026-01-31T23:59:59Z",
    cutoffStrategy: "D1_1100",
    cutoffDescription: "Day-Ahead D-1 11:00 London Time",
    metrics: {
      mae: 2126.1,
      rmse: 2620.8,
      bias: 1840.3,
      totalIntervals: 1488,
      validIntervals: 1488,
      missingForecastIntervals: 0,
      missingActualIntervals: 0,
      coveragePercentage: 100.0,
      totalActualMWh: 8619520.0,
      totalForecastMWh: 9984850.0,
      meanActualMW: 11580.7,
      meanForecastMW: 13421.0,
      stdError: 1860.5,
      minError: -5200.0,
      maxError: 7800.0,
      p5Error: -1200.0,
      p50Error: 1650.0,
      p95Error: 5100.0,
    },
  }),
  fetchTimeseries: vi.fn().mockResolvedValue({
    periodStart: "2026-01-01T00:00:00Z",
    periodEnd: "2026-01-31T23:30:00Z",
    cutoffStrategy: "D1_1100",
    totalRecords: 2,
    intervals: [
      {
        startTime: "2026-01-01T00:00:00Z",
        settlementDate: "2026-01-01",
        settlementPeriod: 1,
        actualGeneration: 11200.0,
        forecastGeneration: 13000.0,
        forecastPublishTime: "2025-12-31T09:30:00Z",
        cutoffTime: "2025-12-31T11:00:00Z",
        error: 1800.0,
        absoluteError: 1800.0,
        isValid: true,
        status: "VALID",
      },
    ],
  }),
  fetchAccuracy: vi.fn().mockResolvedValue({
    periodStart: "2026-01-01T00:00:00Z",
    periodEnd: "2026-01-31T23:30:00Z",
    cutoffStrategy: "D1_1100",
    metrics: {
      mae: 2126.1,
      rmse: 2620.8,
      bias: 1840.3,
      totalIntervals: 1488,
      validIntervals: 1488,
      missingForecastIntervals: 0,
      missingActualIntervals: 0,
      coveragePercentage: 100.0,
      totalActualMWh: 8619520.0,
      totalForecastMWh: 9984850.0,
      meanActualMW: 11580.7,
      meanForecastMW: 13421.0,
    },
    dailyBreakdown: [],
    diurnalBreakdown: [],
    errorDistribution: [],
  }),
  fetchVintages: vi.fn().mockResolvedValue({
    deliveryStartTime: "2026-01-02T12:00:00Z",
    settlementDate: "2026-01-02",
    settlementPeriod: 25,
    cutoffTime: "2026-01-01T11:00:00Z",
    actualGeneration: 15000.0,
    selectedForecast: {
      publishTime: "2026-01-01T09:30:00Z",
      startTime: "2026-01-02T12:00:00Z",
      generation: 17000.0,
      hoursBeforeDelivery: 26.5,
      isEligible: true,
      isSelected: true,
      exclusionReason: null,
    },
    vintages: [],
    totalVintages: 1,
    eligibleCount: 1,
  }),
  fetchIntervals: vi.fn().mockResolvedValue({
    total: 1,
    page: 1,
    pageSize: 50,
    totalPages: 1,
    intervals: [],
  }),
  triggerCacheRefresh: vi.fn().mockResolvedValue(undefined),
}));

describe("App Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the dashboard header and main title", async () => {
    render(<App />);
    expect(screen.getByText("GB Wind Forecast Evaluation")).toBeInTheDocument();
    expect(
      screen.getByText("UK Day-Ahead Wholesale Electricity Procurement Decision Support")
    ).toBeInTheDocument();
  });

  it("renders KPI cards with formatted metric values", async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText("MAE (Magnitude)")).toBeInTheDocument();
      expect(screen.getByText("2,126.1 MW")).toBeInTheDocument();
      expect(screen.getByText("2,620.8 MW")).toBeInTheDocument();
      expect(screen.getByText("+1840.3 MW")).toBeInTheDocument();
      expect(screen.getByText("100.0%")).toBeInTheDocument();
    });
  });

  it("renders all five navigation tabs", async () => {
    render(<App />);
    expect(screen.getByText("Executive Overview & Timeseries")).toBeInTheDocument();
    expect(screen.getByText("Accuracy & Distributions")).toBeInTheDocument();
    expect(screen.getByText("Forecast Vintage Inspector")).toBeInTheDocument();
    expect(screen.getByText("Interval Records & Export")).toBeInTheDocument();
    expect(screen.getByText("Methodology & Provenance")).toBeInTheDocument();
  });
});
