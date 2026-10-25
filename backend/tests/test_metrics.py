import math

from backend.app.analytics.metrics import AccuracyAnalytics
from backend.app.models.schemas import IntervalRecord


def make_interval(st: str, act: float, fc: float, is_valid: bool = True) -> IntervalRecord:
    err = round(fc - act, 2) if (act is not None and fc is not None) else None
    abs_err = round(abs(err), 2) if err is not None else None
    return IntervalRecord(
        startTime=st,
        settlementDate=st[:10],
        settlementPeriod=1,
        actualGeneration=act,
        forecastGeneration=fc,
        forecastPublishTime="2025-12-31T09:30:00Z",
        cutoffTime="2025-12-31T11:00:00Z",
        error=err,
        absoluteError=abs_err,
        isValid=is_valid,
        status="VALID" if is_valid else "MISSING_FORECAST",
    )


def test_metrics_known_deterministic_values():
    # 3 intervals:
    # 1: act=1000, fc=1200 -> err = +200, abs_err = 200
    # 2: act=1500, fc=1300 -> err = -200, abs_err = 200
    # 3: act=2000, fc=2300 -> err = +300, abs_err = 300
    # Expected:
    # MAE = (200 + 200 + 300) / 3 = 700 / 3 = 233.33
    # RMSE = sqrt((200^2 + (-200)^2 + 300^2) / 3) = sqrt((40000 + 40000 + 90000) / 3) = sqrt(170000 / 3) = sqrt(56666.67) = 238.05
    # Bias = (200 + (-200) + 300) / 3 = 300 / 3 = +100.00 (systematic overforecast)
    # Total actual MWh = (1000 + 1500 + 2000) * 0.5 = 2250.0
    # Total forecast MWh = (1200 + 1300 + 2300) * 0.5 = 2400.0
    # Coverage = 100%
    intervals = [
        make_interval("2026-01-01T00:00:00Z", 1000.0, 1200.0),
        make_interval("2026-01-01T00:30:00Z", 1500.0, 1300.0),
        make_interval("2026-01-01T01:00:00Z", 2000.0, 2300.0),
    ]

    metrics = AccuracyAnalytics.calculate_metrics(intervals)
    assert metrics.totalIntervals == 3
    assert metrics.validIntervals == 3
    assert metrics.coveragePercentage == 100.0
    assert metrics.mae == 233.33
    assert metrics.rmse == 238.05
    assert metrics.bias == 100.00
    assert metrics.totalActualMWh == 2250.0
    assert metrics.totalForecastMWh == 2400.0
    assert metrics.meanActualMW == 1500.0
    assert metrics.meanForecastMW == 1600.0
    assert metrics.minError == -200.0
    assert metrics.maxError == 300.0


def test_metrics_systematic_underforecasting():
    # If all forecasts are below actuals, bias must be strictly negative
    intervals = [
        make_interval("2026-01-01T00:00:00Z", 5000.0, 4500.0),  # -500
        make_interval("2026-01-01T00:30:00Z", 6000.0, 5200.0),  # -800
    ]
    metrics = AccuracyAnalytics.calculate_metrics(intervals)
    assert metrics.bias == -650.0
    assert metrics.mae == 650.0
    assert metrics.rmse == 667.08


def test_metrics_empty_and_missing_data_safe():
    # Empty interval list
    empty_metrics = AccuracyAnalytics.calculate_metrics([])
    assert empty_metrics.totalIntervals == 0
    assert empty_metrics.validIntervals == 0
    assert empty_metrics.coveragePercentage == 0.0
    assert empty_metrics.mae is None
    assert empty_metrics.rmse is None
    assert empty_metrics.bias is None

    # Intervals with missing forecast or actual
    partial = [
        make_interval("2026-01-01T00:00:00Z", 1000.0, None, is_valid=False),
        make_interval("2026-01-01T00:30:00Z", None, 1200.0, is_valid=False),
        make_interval("2026-01-01T01:00:00Z", 1000.0, 1100.0, is_valid=True),
    ]
    partial_metrics = AccuracyAnalytics.calculate_metrics(partial)
    assert partial_metrics.totalIntervals == 3
    assert partial_metrics.validIntervals == 1
    assert partial_metrics.missingForecastIntervals == 1
    assert partial_metrics.missingActualIntervals == 1
    assert partial_metrics.coveragePercentage == 33.33
    assert partial_metrics.mae == 100.0
    assert partial_metrics.bias == 100.0


def test_error_distribution_histogram():
    intervals = [
        make_interval("2026-01-01T00:00:00Z", 1000.0, 1050.0),  # +50
        make_interval("2026-01-01T00:30:00Z", 1000.0, 1100.0),  # +100
        make_interval("2026-01-01T01:00:00Z", 1000.0, 950.0),   # -50
        make_interval("2026-01-01T01:30:00Z", 1000.0, 900.0),   # -100
    ]
    bins = AccuracyAnalytics.calculate_error_distribution(intervals, num_bins=4)
    assert len(bins) == 4
    total_count = sum(b.count for b in bins)
    assert total_count == 4
    total_freq = sum(b.frequency for b in bins)
    assert math.isclose(total_freq, 1.0, abs_tol=1e-3)
