import numpy as np

from backend.app.models.schemas import (
    AccuracyMetrics,
    DailyAccuracy,
    DiurnalAccuracy,
    HistogramBin,
    IntervalRecord,
)


class AccuracyAnalytics:
    """
    Quantitative evaluation of day-ahead wind generation forecasts against outturn.
    Calculates standard industry metrics (MAE, RMSE, Bias, Coverage, Error Distributions).
    """

    @staticmethod
    def calculate_metrics(intervals: list[IntervalRecord]) -> AccuracyMetrics:
        total = len(intervals)
        valid_intervals = [r for r in intervals if r.isValid and r.error is not None]
        valid_count = len(valid_intervals)
        missing_forecast = sum(1 for r in intervals if r.forecastGeneration is None)
        missing_actual = sum(1 for r in intervals if r.actualGeneration is None)
        coverage_pct = round((valid_count / total * 100.0), 2) if total > 0 else 0.0

        if valid_count == 0:
            return AccuracyMetrics(
                mae=None,
                rmse=None,
                bias=None,
                totalIntervals=total,
                validIntervals=0,
                missingForecastIntervals=missing_forecast,
                missingActualIntervals=missing_actual,
                coveragePercentage=0.0,
                totalActualMWh=0.0,
                totalForecastMWh=0.0,
                meanActualMW=None,
                meanForecastMW=None,
                stdError=None,
                minError=None,
                maxError=None,
                p5Error=None,
                p50Error=None,
                p95Error=None,
            )

        errors = np.array([r.error for r in valid_intervals], dtype=np.float64)
        abs_errors = np.abs(errors)
        actuals = np.array([r.actualGeneration for r in valid_intervals], dtype=np.float64)
        forecasts = np.array([r.forecastGeneration for r in valid_intervals], dtype=np.float64)

        mae = float(np.mean(abs_errors))
        rmse = float(np.sqrt(np.mean(errors ** 2)))
        bias = float(np.mean(errors))
        std_err = float(np.std(errors, ddof=1)) if valid_count > 1 else 0.0
        min_err = float(np.min(errors))
        max_err = float(np.max(errors))
        p5 = float(np.percentile(errors, 5))
        p50 = float(np.percentile(errors, 50))
        p95 = float(np.percentile(errors, 95))

        mean_act = float(np.mean(actuals))
        mean_fc = float(np.mean(forecasts))

        # Half-hour generation to MWh: MW * 0.5h
        total_act_mwh = float(np.sum(actuals) * 0.5)
        total_fc_mwh = float(np.sum(forecasts) * 0.5)

        return AccuracyMetrics(
            mae=round(mae, 2),
            rmse=round(rmse, 2),
            bias=round(bias, 2),
            totalIntervals=total,
            validIntervals=valid_count,
            missingForecastIntervals=missing_forecast,
            missingActualIntervals=missing_actual,
            coveragePercentage=coverage_pct,
            totalActualMWh=round(total_act_mwh, 1),
            totalForecastMWh=round(total_fc_mwh, 1),
            meanActualMW=round(mean_act, 2),
            meanForecastMW=round(mean_fc, 2),
            stdError=round(std_err, 2),
            minError=round(min_err, 2),
            maxError=round(max_err, 2),
            p5Error=round(p5, 2),
            p50Error=round(p50, 2),
            p95Error=round(p95, 2),
        )

    @staticmethod
    def calculate_daily_breakdown(intervals: list[IntervalRecord]) -> list[DailyAccuracy]:
        by_date: dict[str, list[IntervalRecord]] = {}
        for r in intervals:
            d = r.settlementDate
            if d not in by_date:
                by_date[d] = []
            by_date[d].append(r)

        daily_results: list[DailyAccuracy] = []
        for date_str in sorted(by_date.keys()):
            day_records = by_date[date_str]
            total_day = len(day_records)
            valid_day = [r for r in day_records if r.isValid and r.error is not None]
            valid_count = len(valid_day)
            cov = round(valid_count / total_day * 100.0, 2) if total_day > 0 else 0.0

            if valid_count > 0:
                errs = np.array([r.error for r in valid_day], dtype=np.float64)
                acts = np.array([r.actualGeneration for r in valid_day], dtype=np.float64)
                fcs = np.array([r.forecastGeneration for r in valid_day], dtype=np.float64)
                mae = round(float(np.mean(np.abs(errs))), 2)
                rmse = round(float(np.sqrt(np.mean(errs ** 2))), 2)
                bias = round(float(np.mean(errs)), 2)
                mean_act = round(float(np.mean(acts)), 2)
                mean_fc = round(float(np.mean(fcs)), 2)
            else:
                mae = None
                rmse = None
                bias = None
                mean_act = None
                mean_fc = None

            daily_results.append(
                DailyAccuracy(
                    date=date_str,
                    mae=mae,
                    rmse=rmse,
                    bias=bias,
                    coveragePercentage=cov,
                    validCount=valid_count,
                    totalCount=total_day,
                    meanActual=mean_act,
                    meanForecast=mean_fc,
                )
            )

        return daily_results

    @staticmethod
    def calculate_diurnal_breakdown(intervals: list[IntervalRecord]) -> list[DiurnalAccuracy]:
        by_sp: dict[int, list[IntervalRecord]] = {}
        for r in intervals:
            sp = r.settlementPeriod
            if sp not in by_sp:
                by_sp[sp] = []
            by_sp[sp].append(r)

        diurnal_results: list[DiurnalAccuracy] = []
        for sp in range(1, 49):
            sp_records = by_sp.get(sp, [])
            valid_sp = [r for r in sp_records if r.isValid and r.error is not None]
            valid_count = len(valid_sp)
            hour = (sp - 1) * 0.5

            if valid_count > 0:
                errs = np.array([r.error for r in valid_sp], dtype=np.float64)
                acts = np.array([r.actualGeneration for r in valid_sp], dtype=np.float64)
                fcs = np.array([r.forecastGeneration for r in valid_sp], dtype=np.float64)
                mae = round(float(np.mean(np.abs(errs))), 2)
                rmse = round(float(np.sqrt(np.mean(errs ** 2))), 2)
                bias = round(float(np.mean(errs)), 2)
                mean_act = round(float(np.mean(acts)), 2)
                mean_fc = round(float(np.mean(fcs)), 2)
            else:
                mae = None
                rmse = None
                bias = None
                mean_act = None
                mean_fc = None

            diurnal_results.append(
                DiurnalAccuracy(
                    settlementPeriod=sp,
                    hour=hour,
                    mae=mae,
                    rmse=rmse,
                    bias=bias,
                    validCount=valid_count,
                    meanActual=mean_act,
                    meanForecast=mean_fc,
                )
            )

        return diurnal_results

    @staticmethod
    def calculate_error_distribution(
        intervals: list[IntervalRecord], num_bins: int = 20
    ) -> list[HistogramBin]:
        valid_intervals = [r for r in intervals if r.isValid and r.error is not None]
        if not valid_intervals:
            return []

        errors = np.array([r.error for r in valid_intervals], dtype=np.float64)
        counts, bin_edges = np.histogram(errors, bins=num_bins)
        total_valid = len(valid_intervals)

        bins: list[HistogramBin] = []
        for i in range(len(counts)):
            b_start = round(float(bin_edges[i]), 1)
            b_end = round(float(bin_edges[i + 1]), 1)
            b_center = round((b_start + b_end) / 2.0, 1)
            cnt = int(counts[i])
            freq = round(cnt / total_valid, 4) if total_valid > 0 else 0.0

            bins.append(
                HistogramBin(
                    binStart=b_start,
                    binEnd=b_end,
                    binCenter=b_center,
                    count=cnt,
                    frequency=freq,
                )
            )

        return bins
