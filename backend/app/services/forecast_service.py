import asyncio
import logging
from datetime import UTC, datetime
from typing import Any

from backend.app.analytics.metrics import AccuracyAnalytics
from backend.app.core.config import settings
from backend.app.models.schemas import (
    AccuracyResponse,
    IntervalRecord,
    MetadataResponse,
    OverviewResponse,
    PaginatedIntervalsResponse,
    TimeseriesResponse,
    VintagesResponse,
)
from backend.app.services.cache_manager import CacheManager
from backend.app.services.data_processor import DataProcessor
from backend.app.services.elexon_client import ElexonClient

logger = logging.getLogger(__name__)


class ForecastDataService:
    """
    Central orchestrator for data retrieval, caching, cutoff strategy application,
    and serving typed analytics responses.
    """

    def __init__(self):
        self.cache_manager = CacheManager(settings.CACHE_DIR)
        self.elexon_client = ElexonClient()
        self.fuelhh_records: list[dict[str, Any]] = []
        self.windfor_records: list[dict[str, Any]] = []
        self.data_source: str = "Uninitialized"
        self.data_status: str = "INITIALIZING"
        self.last_updated: str = datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")
        self._memoized_intervals: dict[str, list[IntervalRecord]] = {}
        self._lock = asyncio.Lock()

    async def initialize(self, force_fetch: bool = False) -> None:
        """
        Load data from cache if present, otherwise fetch from Elexon API.
        Gracefully fall back to deterministic synthetic fixtures if network is unavailable.
        """
        async with self._lock:
            # 1. Try cache if not force_fetch
            if not force_fetch and self.cache_manager.has_cached_raw_data():
                cached_fuelhh = self.cache_manager.load_raw_fuelhh()
                cached_windfor = self.cache_manager.load_raw_windfor()
                if cached_fuelhh and cached_windfor:
                    self.fuelhh_records = cached_fuelhh
                    self.windfor_records = cached_windfor
                    # Check if synthetic
                    is_synth = any(r.get("_is_synthetic") for r in cached_fuelhh[:5])
                    if is_synth:
                        self.data_source = "Synthetic Fixture (Demo Mode)"
                        self.data_status = "DEMO"
                    else:
                        self.data_source = "Elexon BMRS (Local Disk Cache)"
                        self.data_status = "CACHED"
                    self.last_updated = datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")
                    self._memoized_intervals.clear()
                    logger.info("Initialized ForecastDataService from cache: %d FUELHH, %d WINDFOR", len(self.fuelhh_records), len(self.windfor_records))
                    return

            # 2. Fetch from live Elexon API
            try:
                logger.info("Querying Elexon BMRS API for January 2026 data...")
                fuelhh, windfor = await self.elexon_client.fetch_january_2026_data()
                if fuelhh and windfor:
                    self.fuelhh_records = fuelhh
                    self.windfor_records = windfor
                    self.data_source = "Elexon BMRS Live API"
                    self.data_status = "LIVE"
                    self.last_updated = datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")
                    self.cache_manager.save_raw_fuelhh(fuelhh)
                    self.cache_manager.save_raw_windfor(windfor)
                    self._memoized_intervals.clear()
                    logger.info("Successfully fetched and cached live Elexon data: %d FUELHH, %d WINDFOR", len(fuelhh), len(windfor))
                    return
            except Exception as e:
                logger.warning("Live Elexon fetch failed or offline: %s. Falling back to synthetic fixtures.", e)

            # 3. Fallback to synthetic fixture
            logger.info("Generating deterministic synthetic fixture for January 2026...")
            fuelhh_syn, windfor_syn = ElexonClient.generate_synthetic_january_2026_fixtures()
            self.fuelhh_records = fuelhh_syn
            self.windfor_records = windfor_syn
            self.data_source = "Synthetic Fixture (Demo Mode - Offline Fallback)"
            self.data_status = "DEMO"
            self.last_updated = datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")
            self.cache_manager.save_raw_fuelhh(fuelhh_syn)
            self.cache_manager.save_raw_windfor(windfor_syn)
            self._memoized_intervals.clear()
            logger.info("Initialized with synthetic fixtures: %d FUELHH, %d WINDFOR", len(fuelhh_syn), len(windfor_syn))

    def get_processed_intervals(self, cutoff_strategy: str = "D1_1100") -> list[IntervalRecord]:
        """
        Get processed intervals for the chosen cutoff strategy with memoization.
        """
        if cutoff_strategy not in self._memoized_intervals:
            logger.info("Processing intervals with cutoff strategy: %s", cutoff_strategy)
            records = DataProcessor.process_intervals(
                fuelhh_wind_records=self.fuelhh_records,
                windfor_records=self.windfor_records,
                cutoff_strategy=cutoff_strategy,
            )
            self._memoized_intervals[cutoff_strategy] = records
        return self._memoized_intervals[cutoff_strategy]

    def filter_intervals_by_date(
        self,
        intervals: list[IntervalRecord],
        date_from: str | None = None,
        date_to: str | None = None,
    ) -> list[IntervalRecord]:
        if not date_from and not date_to:
            return intervals

        filtered = []
        for r in intervals:
            d = r.settlementDate
            if date_from and d < date_from:
                continue
            if date_to and d > date_to:
                continue
            filtered.append(r)
        return filtered

    def get_overview(
        self,
        cutoff_strategy: str = "D1_1100",
        date_from: str | None = None,
        date_to: str | None = None,
    ) -> OverviewResponse:
        intervals = self.get_processed_intervals(cutoff_strategy)
        filtered = self.filter_intervals_by_date(intervals, date_from, date_to)
        metrics = AccuracyAnalytics.calculate_metrics(filtered)

        p_start = filtered[0].startTime if filtered else settings.TARGET_START_UTC
        p_end = filtered[-1].startTime if filtered else settings.TARGET_END_UTC

        # Cutoff strategy description
        strat_info = next((s for s in DataProcessor.AVAILABLE_CUTOFF_STRATEGIES if s["id"] == cutoff_strategy), None)
        desc = strat_info["description"] if strat_info else cutoff_strategy

        return OverviewResponse(
            reportingPeriod="January 2026",
            periodStart=p_start,
            periodEnd=p_end,
            dataSource=self.data_source,
            dataStatus=self.data_status,
            lastUpdated=self.last_updated,
            cutoffStrategy=cutoff_strategy,
            cutoffDescription=desc,
            metrics=metrics,
        )

    def get_timeseries(
        self,
        cutoff_strategy: str = "D1_1100",
        date_from: str | None = None,
        date_to: str | None = None,
    ) -> TimeseriesResponse:
        intervals = self.get_processed_intervals(cutoff_strategy)
        filtered = self.filter_intervals_by_date(intervals, date_from, date_to)

        p_start = filtered[0].startTime if filtered else settings.TARGET_START_UTC
        p_end = filtered[-1].startTime if filtered else settings.TARGET_END_UTC

        return TimeseriesResponse(
            periodStart=p_start,
            periodEnd=p_end,
            cutoffStrategy=cutoff_strategy,
            totalRecords=len(filtered),
            intervals=filtered,
        )

    def get_accuracy(
        self,
        cutoff_strategy: str = "D1_1100",
        date_from: str | None = None,
        date_to: str | None = None,
    ) -> AccuracyResponse:
        intervals = self.get_processed_intervals(cutoff_strategy)
        filtered = self.filter_intervals_by_date(intervals, date_from, date_to)

        metrics = AccuracyAnalytics.calculate_metrics(filtered)
        daily = AccuracyAnalytics.calculate_daily_breakdown(filtered)
        diurnal = AccuracyAnalytics.calculate_diurnal_breakdown(filtered)
        hist = AccuracyAnalytics.calculate_error_distribution(filtered, num_bins=20)

        p_start = filtered[0].startTime if filtered else settings.TARGET_START_UTC
        p_end = filtered[-1].startTime if filtered else settings.TARGET_END_UTC

        return AccuracyResponse(
            periodStart=p_start,
            periodEnd=p_end,
            cutoffStrategy=cutoff_strategy,
            metrics=metrics,
            dailyBreakdown=daily,
            diurnalBreakdown=diurnal,
            errorDistribution=hist,
        )

    def get_vintages_for_interval(
        self, start_time: str, cutoff_strategy: str = "D1_1100"
    ) -> VintagesResponse:
        return DataProcessor.get_vintages_for_interval(
            st_str=start_time,
            fuelhh_wind_records=self.fuelhh_records,
            windfor_records=self.windfor_records,
            cutoff_strategy=cutoff_strategy,
        )

    def get_paginated_intervals(
        self,
        cutoff_strategy: str = "D1_1100",
        page: int = 1,
        page_size: int = 50,
        status: str | None = None,
        date_from: str | None = None,
        date_to: str | None = None,
        sort_by: str = "startTime",
        sort_desc: bool = False,
    ) -> PaginatedIntervalsResponse:
        intervals = self.get_processed_intervals(cutoff_strategy)
        filtered = self.filter_intervals_by_date(intervals, date_from, date_to)

        if status and status != "ALL":
            filtered = [r for r in filtered if r.status == status]

        # Sorting
        def sort_key(rec: IntervalRecord):
            val = getattr(rec, sort_by, None)
            if val is None:
                return -float("inf") if sort_desc else float("inf")
            return val

        filtered.sort(key=sort_key, reverse=sort_desc)

        total = len(filtered)
        total_pages = max(1, (total + page_size - 1) // page_size)
        start_idx = (page - 1) * page_size
        end_idx = min(start_idx + page_size, total)
        page_records = filtered[start_idx:end_idx]

        return PaginatedIntervalsResponse(
            total=total,
            page=page,
            pageSize=page_size,
            totalPages=total_pages,
            intervals=page_records,
        )

    def get_metadata(self) -> MetadataResponse:
        cutoff_options = [
            {
                "id": s["id"],
                "name": s["name"],
                "description": s["description"],
                "marketRationale": s["marketRationale"],
                "isDefault": s["isDefault"],
            }
            for s in DataProcessor.AVAILABLE_CUTOFF_STRATEGIES
        ]

        return MetadataResponse(
            projectName=settings.PROJECT_NAME,
            version=settings.VERSION,
            reportingPeriod="January 2026",
            targetMonth="2026-01",
            timezone="Europe/London (GMT / UTC+0 in January 2026)",
            dataSource=self.data_source,
            dataStatus=self.data_status,
            elexonDatasets={
                "actuals": {
                    "dataset": "FUELHH",
                    "fuelType": "WIND",
                    "description": "Half-Hourly Generation Outturn by Fuel Type (National Great Britain wind power outturn)",
                    "url": "https://data.elexon.co.uk/bmrs/api/v1/datasets/FUELHH/stream",
                    "recordsLoaded": len(self.fuelhh_records),
                },
                "forecasts": {
                    "dataset": "WINDFOR",
                    "description": "Wind Generation Forecast (GB National wind power forecast vintages)",
                    "url": "https://data.elexon.co.uk/bmrs/api/v1/datasets/WINDFOR/stream",
                    "recordsLoaded": len(self.windfor_records),
                },
            },
            availableCutoffStrategies=cutoff_options,
            currentCutoffStrategy=settings.DEFAULT_CUTOFF_STRATEGY,
            metricDefinitions={
                "Error": "Forecast Generation (MW) - Actual Generation (MW)",
                "MAE": "Mean Absolute Error: mean(|Forecast - Actual|). Measures overall forecast inaccuracy regardless of direction.",
                "RMSE": "Root Mean Squared Error: sqrt(mean((Forecast - Actual)^2)). Penalizes larger forecast errors more heavily.",
                "Bias": "Mean Error: mean(Forecast - Actual). Positive indicates systematic overforecasting; negative indicates systematic underforecasting.",
                "Forecast Coverage": "Percentage of eligible delivery half-hours in the period with both valid forecast and actual generation.",
            },
        )


# Global singleton instance
forecast_service = ForecastDataService()
