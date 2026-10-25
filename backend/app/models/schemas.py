
from pydantic import BaseModel, Field


class FuelHHRawRecord(BaseModel):
    dataset: str
    publishTime: str
    startTime: str
    settlementDate: str
    settlementPeriod: int
    fuelType: str
    generation: float


class WindforRawRecord(BaseModel):
    dataset: str
    publishTime: str
    startTime: str
    generation: float


class IntervalRecord(BaseModel):
    startTime: str = Field(..., description="Start of the 30-minute delivery interval in ISO 8601 UTC")
    settlementDate: str = Field(..., description="Settlement date (YYYY-MM-DD)")
    settlementPeriod: int = Field(..., description="Settlement period (1-48)")
    actualGeneration: float | None = Field(None, description="Actual wind generation outturn in MW (from FUELHH)")
    forecastGeneration: float | None = Field(None, description="Selected day-ahead forecast generation in MW (from WINDFOR)")
    forecastPublishTime: str | None = Field(None, description="Publication timestamp of the selected forecast")
    cutoffTime: str | None = Field(None, description="Decision cutoff timestamp used to select the forecast")
    error: float | None = Field(None, description="Forecast Error = Forecast - Actual (MW)")
    absoluteError: float | None = Field(None, description="Absolute Error = |Forecast - Actual| (MW)")
    isValid: bool = Field(..., description="True if both actual and forecast generation are present")
    status: str = Field(..., description="Status: VALID, MISSING_FORECAST, MISSING_ACTUAL, or MISSING_BOTH")


class ForecastVintage(BaseModel):
    publishTime: str = Field(..., description="Forecast publication timestamp (UTC)")
    startTime: str = Field(..., description="Target delivery interval start timestamp (UTC)")
    generation: float = Field(..., description="Forecast generation in MW")
    hoursBeforeDelivery: float = Field(..., description="Lead time in hours before delivery start")
    isEligible: bool = Field(..., description="True if published on or before the day-ahead decision cutoff")
    isSelected: bool = Field(..., description="True if this is the latest eligible forecast chosen for day-ahead purchasing")
    exclusionReason: str | None = Field(None, description="Reason if excluded (e.g. published after cutoff)")


class VintagesResponse(BaseModel):
    deliveryStartTime: str
    settlementDate: str
    settlementPeriod: int
    cutoffTime: str
    actualGeneration: float | None
    selectedForecast: ForecastVintage | None
    vintages: list[ForecastVintage]
    totalVintages: int
    eligibleCount: int


class AccuracyMetrics(BaseModel):
    mae: float | None = Field(None, description="Mean Absolute Error in MW: mean(|Forecast - Actual|)")
    rmse: float | None = Field(None, description="Root Mean Squared Error in MW: sqrt(mean((Forecast - Actual)^2))")
    bias: float | None = Field(None, description="Mean Error / Bias in MW: mean(Forecast - Actual). Positive = overforecast, Negative = underforecast")
    totalIntervals: int = Field(..., description="Total eligible delivery intervals in selected period")
    validIntervals: int = Field(..., description="Intervals with both valid forecast and actual")
    missingForecastIntervals: int = Field(..., description="Intervals missing a forecast before cutoff")
    missingActualIntervals: int = Field(..., description="Intervals missing actual outturn")
    coveragePercentage: float = Field(..., description="Percentage of intervals with complete valid evaluation data")
    totalActualMWh: float = Field(..., description="Total energy generated in MWh (MW * 0.5h)")
    totalForecastMWh: float = Field(..., description="Total energy forecast in MWh (MW * 0.5h)")
    meanActualMW: float | None = Field(None, description="Mean actual wind generation in MW")
    meanForecastMW: float | None = Field(None, description="Mean forecast wind generation in MW")
    stdError: float | None = Field(None, description="Standard deviation of errors in MW")
    minError: float | None = Field(None, description="Minimum error (maximum underforecast)")
    maxError: float | None = Field(None, description="Maximum error (maximum overforecast)")
    p5Error: float | None = Field(None, description="5th percentile error")
    p50Error: float | None = Field(None, description="Median error")
    p95Error: float | None = Field(None, description="95th percentile error")


class DailyAccuracy(BaseModel):
    date: str
    mae: float | None
    rmse: float | None
    bias: float | None
    coveragePercentage: float
    validCount: int
    totalCount: int
    meanActual: float | None
    meanForecast: float | None


class DiurnalAccuracy(BaseModel):
    settlementPeriod: int
    hour: float
    mae: float | None
    rmse: float | None
    bias: float | None
    validCount: int
    meanActual: float | None
    meanForecast: float | None


class HistogramBin(BaseModel):
    binStart: float
    binEnd: float
    binCenter: float
    count: int
    frequency: float


class AccuracyResponse(BaseModel):
    periodStart: str
    periodEnd: str
    cutoffStrategy: str
    metrics: AccuracyMetrics
    dailyBreakdown: list[DailyAccuracy]
    diurnalBreakdown: list[DiurnalAccuracy]
    errorDistribution: list[HistogramBin]


class OverviewResponse(BaseModel):
    reportingPeriod: str
    periodStart: str
    periodEnd: str
    dataSource: str
    dataStatus: str
    lastUpdated: str
    cutoffStrategy: str
    cutoffDescription: str
    metrics: AccuracyMetrics


class TimeseriesResponse(BaseModel):
    periodStart: str
    periodEnd: str
    cutoffStrategy: str
    totalRecords: int
    intervals: list[IntervalRecord]


class PaginatedIntervalsResponse(BaseModel):
    total: int
    page: int
    pageSize: int
    totalPages: int
    intervals: list[IntervalRecord]


class CutoffOption(BaseModel):
    id: str
    name: str
    description: str
    marketRationale: str
    isDefault: bool


class MetadataResponse(BaseModel):
    projectName: str
    version: str
    reportingPeriod: str
    targetMonth: str
    timezone: str
    dataSource: str
    dataStatus: str
    elexonDatasets: dict
    availableCutoffStrategies: list[CutoffOption]
    currentCutoffStrategy: str
    metricDefinitions: dict
