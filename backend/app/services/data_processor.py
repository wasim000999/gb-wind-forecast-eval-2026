import logging
from datetime import UTC, datetime, timedelta
from typing import Any
from zoneinfo import ZoneInfo

from backend.app.models.schemas import ForecastVintage, IntervalRecord, VintagesResponse

logger = logging.getLogger(__name__)

LONDON_TZ = ZoneInfo("Europe/London")
UTC_TZ = UTC


class DataProcessor:
    """
    Core domain service for temporal alignment, cutoff enforcement, and resolution mapping.

    Implements wholesale electricity market decision cutoff rules:
    - Strictly prevents look-ahead leakage.
    - Evaluates multiple defensible wholesale market gate closure strategies (EPEX SPOT / Nord Pool).
    - Aligns 30-minute settlement intervals for January 2026.
    - Transparently handles the resolution difference between Elexon WINDFOR (1-hour forecast blocks)
      and FUELHH (30-minute settlement outturn).
    """

    AVAILABLE_CUTOFF_STRATEGIES = [
        {
            "id": "D1_1100",
            "name": "Day-Ahead D-1 11:00 London Time (Primary Market Benchmark)",
            "description": "Latest forecast published before 11:00 UK local time on the day prior to delivery.",
            "marketRationale": "GB Day-Ahead power auction benchmark. Nord Pool GB and EPEX SPOT GB Day-Ahead auction order books close at 11:00 London local time on Day D-1.",
            "isDefault": True,
        },
        {
            "id": "D1_1200",
            "name": "Day-Ahead D-1 12:00 London Time (European Coupling Alignment)",
            "description": "Latest forecast published before 12:00 UK local time on the day prior to delivery.",
            "marketRationale": "Single Day-Ahead Coupling (SDAC) auction gate closure in European coupled markets (EPEX SPOT 12:00 auction).",
            "isDefault": False,
        },
        {
            "id": "D1_1400",
            "name": "Day-Ahead D-1 14:00 London Time (Post-Auction Bilateral)",
            "description": "Latest forecast published before 14:00 UK local time on the day prior to delivery.",
            "marketRationale": "Bilateral post-clearing schedule used by utilities adjusting bilateral contracts post-auction.",
            "isDefault": False,
        },
        {
            "id": "ROLLING_24H",
            "name": "Rolling 24-Hour Horizon",
            "description": "Latest forecast published at least 24 hours prior to the start of each delivery interval.",
            "marketRationale": "Rolling fixed lead-time benchmark for continuous forecast accuracy assessment.",
            "isDefault": False,
        },
        {
            "id": "ROLLING_12H",
            "name": "Rolling 12-Hour Horizon",
            "description": "Latest forecast published at least 12 hours prior to the start of each delivery interval.",
            "marketRationale": "Near-term intraday re-balancing benchmark.",
            "isDefault": False,
        },
    ]

    AVAILABLE_MAPPING_MODES = [
        {
            "id": "step_block",
            "name": "Step-wise Hourly Block (Wholesale Trading Standard)",
            "description": "Each 1-hour WINDFOR forecast applies across both half-hour settlement periods (SP 2k-1 and SP 2k) within that hour as a step-wise constant expectation.",
            "coverageNote": "100.0% coverage (1,488 half-hour intervals). Matches commercial procurement of hourly contracts.",
            "isDefault": True,
        },
        {
            "id": "exact",
            "name": "Strict Half-Hourly Exact Matching",
            "description": "Only evaluates settlement intervals with an exact timestamp match in WINDFOR (:00). Half-hours at :30 are reported as MISSING_FORECAST without transformation.",
            "coverageNote": "50.0% coverage (744 half-hour intervals). Strict unaugmented data match.",
            "isDefault": False,
        },
    ]

    @staticmethod
    def parse_iso_utc(ts_str: str) -> datetime:
        """Parse ISO 8601 string to timezone-aware UTC datetime."""
        dt = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            return dt.replace(tzinfo=UTC_TZ)
        return dt.astimezone(UTC_TZ)

    @classmethod
    def calculate_cutoff_timestamp(
        cls, delivery_start_utc: datetime, strategy: str = "D1_1100"
    ) -> datetime:
        """
        Calculate the decision cutoff timestamp for a given delivery interval.
        Uses Europe/London local time for calendar-based market cutoffs (accounting for DST).
        """
        if strategy == "ROLLING_24H":
            return delivery_start_utc - timedelta(hours=24)
        elif strategy == "ROLLING_12H":
            return delivery_start_utc - timedelta(hours=12)

        # Convert delivery start to London local time
        delivery_local = delivery_start_utc.astimezone(LONDON_TZ)
        delivery_day = delivery_local.date()
        d_minus_1 = delivery_day - timedelta(days=1)

        if strategy == "D1_1200":
            cutoff_hour = 12
        elif strategy == "D1_1400":
            cutoff_hour = 14
        else:  # Default: D1_1100
            cutoff_hour = 11

        cutoff_local = datetime(
            d_minus_1.year, d_minus_1.month, d_minus_1.day, cutoff_hour, 0, 0, tzinfo=LONDON_TZ
        )
        return cutoff_local.astimezone(UTC_TZ)

    @classmethod
    def generate_expected_intervals_january_2026(cls) -> list[tuple[str, str, int]]:
        """
        Generate all 1,488 expected 30-minute intervals for January 2026.
        Returns: List of (startTime_iso, settlementDate_str, settlementPeriod_int)
        """
        intervals = []
        for day in range(1, 32):
            for sp in range(1, 49):
                minute_offset = (sp - 1) * 30
                dt = datetime(2026, 1, day, 0, 0, 0, tzinfo=UTC_TZ) + timedelta(minutes=minute_offset)
                dt_str = dt.strftime("%Y-%m-%dT%H:%M:%SZ")
                date_str = f"2026-01-{day:02d}"
                intervals.append((dt_str, date_str, sp))
        return intervals

    @classmethod
    def process_intervals(
        cls,
        fuelhh_wind_records: list[dict[str, Any]],
        windfor_records: list[dict[str, Any]],
        cutoff_strategy: str = "D1_1100",
        mapping_mode: str = "step_block",
    ) -> list[IntervalRecord]:
        """
        Match actuals and forecast vintages, apply cutoff rule, and calculate errors.
        - mapping_mode='step_block': 1-hour WINDFOR forecast applies across both half-hours (SP 2k-1, SP 2k).
        - mapping_mode='exact': Only matches exact timestamp (intervals with :30 are MISSING_FORECAST).
        """
        # 1. Index actuals by normalized startTime
        actuals_by_start: dict[str, dict[str, Any]] = {}
        for r in fuelhh_wind_records:
            st = r.get("startTime")
            if not st:
                continue
            norm_st = cls.parse_iso_utc(st).strftime("%Y-%m-%dT%H:%M:%SZ")
            if norm_st in actuals_by_start:
                curr_pub = cls.parse_iso_utc(actuals_by_start[norm_st].get("publishTime", "1970-01-01T00:00:00Z"))
                new_pub = cls.parse_iso_utc(r.get("publishTime", "1970-01-01T00:00:00Z"))
                if new_pub > curr_pub:
                    actuals_by_start[norm_st] = r
            else:
                actuals_by_start[norm_st] = r

        # 2. Group all WINDFOR vintages by target startTime
        vintages_by_start: dict[str, list[dict[str, Any]]] = {}
        for r in windfor_records:
            st = r.get("startTime")
            if not st:
                continue
            norm_st = cls.parse_iso_utc(st).strftime("%Y-%m-%dT%H:%M:%SZ")
            if norm_st not in vintages_by_start:
                vintages_by_start[norm_st] = []
            vintages_by_start[norm_st].append(r)

        # 3. Iterate through every expected interval of January 2026
        expected_intervals = cls.generate_expected_intervals_january_2026()
        processed_records: list[IntervalRecord] = []

        for st_str, date_str, sp in expected_intervals:
            dt_utc = cls.parse_iso_utc(st_str)
            cutoff_dt = cls.calculate_cutoff_timestamp(dt_utc, strategy=cutoff_strategy)
            cutoff_str = cutoff_dt.strftime("%Y-%m-%dT%H:%M:%SZ")

            # Get actual outturn
            actual_record = actuals_by_start.get(st_str)
            actual_gen = None
            if actual_record is not None and "generation" in actual_record:
                actual_gen = float(actual_record["generation"])

            # Determine available vintages based on mapping_mode
            if mapping_mode == "exact":
                # Strict exact match only: no parent-hour fallback
                available_vintages = vintages_by_start.get(st_str, [])
            else:
                # Step-wise hourly block: check exact first, then parent hour
                parent_hour_str = dt_utc.replace(minute=0, second=0).strftime("%Y-%m-%dT%H:%M:%SZ")
                available_vintages = vintages_by_start.get(st_str)
                if not available_vintages:
                    available_vintages = vintages_by_start.get(parent_hour_str, [])

            # Filter for forecasts published on or before cutoff
            eligible_vintages = []
            for v in available_vintages:
                pub_str = v.get("publishTime")
                if not pub_str:
                    continue
                pub_dt = cls.parse_iso_utc(pub_str)
                if pub_dt <= cutoff_dt:
                    eligible_vintages.append((pub_dt, v))

            # Select latest eligible forecast
            selected_forecast_gen = None
            selected_pub_str = None
            if eligible_vintages:
                eligible_vintages.sort(key=lambda x: x[0])
                latest_pub_dt, latest_vintage = eligible_vintages[-1]
                selected_forecast_gen = float(latest_vintage["generation"])
                selected_pub_str = latest_pub_dt.strftime("%Y-%m-%dT%H:%M:%SZ")

            # Determine validity and calculate errors
            is_valid = (actual_gen is not None) and (selected_forecast_gen is not None)
            error = None
            abs_error = None
            if is_valid:
                error = round(selected_forecast_gen - actual_gen, 2)
                abs_error = round(abs(error), 2)

            # Determine status
            if actual_gen is None and selected_forecast_gen is None:
                status = "MISSING_BOTH"
            elif actual_gen is None:
                status = "MISSING_ACTUAL"
            elif selected_forecast_gen is None:
                status = "MISSING_FORECAST"
            else:
                status = "VALID"

            processed_records.append(
                IntervalRecord(
                    startTime=st_str,
                    settlementDate=date_str,
                    settlementPeriod=sp,
                    actualGeneration=actual_gen,
                    forecastGeneration=selected_forecast_gen,
                    forecastPublishTime=selected_pub_str,
                    cutoffTime=cutoff_str,
                    error=error,
                    absoluteError=abs_error,
                    isValid=is_valid,
                    status=status,
                )
            )

        return processed_records

    @classmethod
    def get_vintages_for_interval(
        cls,
        st_str: str,
        fuelhh_wind_records: list[dict[str, Any]],
        windfor_records: list[dict[str, Any]],
        cutoff_strategy: str = "D1_1100",
    ) -> VintagesResponse:
        """
        Inspect all forecast publications for a single delivery interval.
        Highlights the selected vintage and explains eligibility.
        """
        norm_st = cls.parse_iso_utc(st_str).strftime("%Y-%m-%dT%H:%M:%SZ")
        delivery_dt = cls.parse_iso_utc(norm_st)
        cutoff_dt = cls.calculate_cutoff_timestamp(delivery_dt, strategy=cutoff_strategy)
        cutoff_str = cutoff_dt.strftime("%Y-%m-%dT%H:%M:%SZ")

        settlement_date = delivery_dt.strftime("%Y-%m-%d")
        sp = (delivery_dt.hour * 2) + (delivery_dt.minute // 30) + 1

        # Actual generation
        actual_gen = None
        for r in fuelhh_wind_records:
            if r.get("startTime") and cls.parse_iso_utc(r["startTime"]).strftime("%Y-%m-%dT%H:%M:%SZ") == norm_st:
                actual_gen = float(r["generation"])
                break

        # Filter vintages for this startTime or parent hour
        parent_hour_str = delivery_dt.replace(minute=0, second=0).strftime("%Y-%m-%dT%H:%M:%SZ")
        matching = [
            r for r in windfor_records
            if r.get("startTime") and cls.parse_iso_utc(r["startTime"]).strftime("%Y-%m-%dT%H:%M:%SZ") == norm_st
        ]
        if not matching:
            matching = [
                r for r in windfor_records
                if r.get("startTime") and cls.parse_iso_utc(r["startTime"]).strftime("%Y-%m-%dT%H:%M:%SZ") == parent_hour_str
            ]

        # Parse and sort by publish time
        parsed_vintages = []
        for r in matching:
            pub_dt = cls.parse_iso_utc(r["publishTime"])
            gen = float(r["generation"])
            hours_before = round((delivery_dt - pub_dt).total_seconds() / 3600.0, 2)
            is_eligible = pub_dt <= cutoff_dt
            parsed_vintages.append({
                "pub_dt": pub_dt,
                "publishTime": pub_dt.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "startTime": norm_st,
                "generation": gen,
                "hoursBeforeDelivery": hours_before,
                "isEligible": is_eligible,
            })

        parsed_vintages.sort(key=lambda x: x["pub_dt"])

        # Find latest eligible
        latest_eligible_idx = None
        for i, pv in enumerate(parsed_vintages):
            if pv["isEligible"]:
                latest_eligible_idx = i

        forecast_vintages: list[ForecastVintage] = []
        selected_fv: ForecastVintage | None = None

        for i, pv in enumerate(parsed_vintages):
            is_selected = (i == latest_eligible_idx)
            reason = None
            if not pv["isEligible"]:
                reason = f"Published after cutoff ({cutoff_str}). Look-ahead leakage if used for Day-Ahead decision."
            elif not is_selected:
                reason = "Superseded by a later forecast published prior to cutoff."

            fv = ForecastVintage(
                publishTime=pv["publishTime"],
                startTime=pv["startTime"],
                generation=pv["generation"],
                hoursBeforeDelivery=pv["hoursBeforeDelivery"],
                isEligible=pv["isEligible"],
                isSelected=is_selected,
                exclusionReason=reason,
            )
            forecast_vintages.append(fv)
            if is_selected:
                selected_fv = fv

        eligible_count = sum(1 for pv in parsed_vintages if pv["isEligible"])

        return VintagesResponse(
            deliveryStartTime=norm_st,
            settlementDate=settlement_date,
            settlementPeriod=sp,
            cutoffTime=cutoff_str,
            actualGeneration=actual_gen,
            selectedForecast=selected_fv,
            vintages=forecast_vintages,
            totalVintages=len(forecast_vintages),
            eligibleCount=eligible_count,
        )
