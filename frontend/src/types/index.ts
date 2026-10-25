export interface IntervalRecord {
  startTime: string;
  settlementDate: string;
  settlementPeriod: number;
  actualGeneration: number | null;
  forecastGeneration: number | null;
  forecastPublishTime: string | null;
  cutoffTime: string | null;
  error: number | null;
  absoluteError: number | null;
  isValid: boolean;
  status: "VALID" | "MISSING_FORECAST" | "MISSING_ACTUAL" | "MISSING_BOTH";
}

export interface ForecastVintage {
  publishTime: string;
  startTime: string;
  generation: number;
  hoursBeforeDelivery: number;
  isEligible: boolean;
  isSelected: boolean;
  exclusionReason: string | null;
}

export interface VintagesResponse {
  deliveryStartTime: string;
  settlementDate: string;
  settlementPeriod: number;
  cutoffTime: string;
  actualGeneration: number | null;
  selectedForecast: ForecastVintage | null;
  vintages: ForecastVintage[];
  totalVintages: number;
  eligibleCount: number;
}

export interface AccuracyMetrics {
  mae: number | null;
  rmse: number | null;
  bias: number | null;
  totalIntervals: number;
  validIntervals: number;
  missingForecastIntervals: number;
  missingActualIntervals: number;
  coveragePercentage: number;
  totalActualMWh: number;
  totalForecastMWh: number;
  meanActualMW: number | null;
  meanForecastMW: number | null;
  stdError: number | null;
  minError: number | null;
  maxError: number | null;
  p5Error: number | null;
  p50Error: number | null;
  p95Error: number | null;
}

export interface DailyAccuracy {
  date: string;
  mae: number | null;
  rmse: number | null;
  bias: number | null;
  coveragePercentage: number;
  validCount: number;
  totalCount: number;
  meanActual: number | null;
  meanForecast: number | null;
}

export interface DiurnalAccuracy {
  settlementPeriod: number;
  hour: number;
  mae: number | null;
  rmse: number | null;
  bias: number | null;
  validCount: number;
  meanActual: number | null;
  meanForecast: number | null;
}

export interface HistogramBin {
  binStart: number;
  binEnd: number;
  binCenter: number;
  count: number;
  frequency: number;
}

export interface AccuracyResponse {
  periodStart: string;
  periodEnd: string;
  cutoffStrategy: string;
  metrics: AccuracyMetrics;
  dailyBreakdown: DailyAccuracy[];
  diurnalBreakdown: DiurnalAccuracy[];
  errorDistribution: HistogramBin[];
}

export interface OverviewResponse {
  reportingPeriod: string;
  periodStart: string;
  periodEnd: string;
  dataSource: string;
  dataStatus: "LIVE" | "CACHED" | "DEMO" | "TEST";
  lastUpdated: string;
  cutoffStrategy: string;
  cutoffDescription: string;
  mappingMode?: string;
  metrics: AccuracyMetrics;
}

export interface TimeseriesResponse {
  periodStart: string;
  periodEnd: string;
  cutoffStrategy: string;
  mappingMode?: string;
  totalRecords: number;
  intervals: IntervalRecord[];
}

export interface PaginatedIntervalsResponse {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  intervals: IntervalRecord[];
}

export interface CutoffOption {
  id: string;
  name: string;
  description: string;
  marketRationale: string;
  isDefault: boolean;
}

export interface MappingModeOption {
  id: string;
  name: string;
  description: string;
  coverageNote: string;
  isDefault: boolean;
}

export interface MetadataResponse {
  projectName: string;
  version: string;
  reportingPeriod: string;
  targetMonth: string;
  timezone: string;
  dataSource: string;
  dataStatus: string;
  elexonDatasets: {
    actuals: {
      dataset: string;
      fuelType: string;
      description: string;
      url: string;
      recordsLoaded: number;
      resolution?: string;
    };
    forecasts: {
      dataset: string;
      description: string;
      url: string;
      recordsLoaded: number;
      resolution?: string;
    };
  };
  availableCutoffStrategies: CutoffOption[];
  availableMappingModes?: MappingModeOption[];
  currentCutoffStrategy: string;
  metricDefinitions: Record<string, string>;
}
