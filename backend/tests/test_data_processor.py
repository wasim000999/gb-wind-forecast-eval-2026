from datetime import UTC, datetime
from backend.app.services.data_processor import DataProcessor


def test_cutoff_calculation():
    # Delivery on 2026-01-02 14:00 UTC
    dt = datetime(2026, 1, 2, 14, 0, 0, tzinfo=UTC)

    # D1_1100: Cutoff should be 2026-01-01 11:00 UTC
    cutoff_11 = DataProcessor.calculate_cutoff_timestamp(dt, strategy="D1_1100")
    assert cutoff_11 == datetime(2026, 1, 1, 11, 0, 0, tzinfo=UTC)

    # D1_1200: Cutoff should be 2026-01-01 12:00 UTC
    cutoff_12 = DataProcessor.calculate_cutoff_timestamp(dt, strategy="D1_1200")
    assert cutoff_12 == datetime(2026, 1, 1, 12, 0, 0, tzinfo=UTC)

    # ROLLING_24H: Cutoff should be 2026-01-01 14:00 UTC (24h before delivery)
    cutoff_24 = DataProcessor.calculate_cutoff_timestamp(dt, strategy="ROLLING_24H")
    assert cutoff_24 == datetime(2026, 1, 1, 14, 0, 0, tzinfo=UTC)


def test_prevention_of_look_ahead_leakage():
    """
    CRITICAL TEST: Ensure a forecast published AFTER the cutoff is never used
    in evaluating a day-ahead decision.
    """
    delivery_time = "2026-01-02T12:00:00Z"

    fuelhh = [
        {
            "dataset": "FUELHH",
            "publishTime": "2026-01-02T12:30:00Z",
            "startTime": delivery_time,
            "settlementDate": "2026-01-02",
            "settlementPeriod": 25,
            "fuelType": "WIND",
            "generation": 10000.0,
        }
    ]

    # Two vintages for this interval:
    # 1. Published 2026-01-01T09:30:00Z (Eligible before 11:00 cutoff) -> 12000 MW
    # 2. Published 2026-01-01T15:30:00Z (Post-cutoff lookahead) -> 9800 MW
    windfor = [
        {
            "dataset": "WINDFOR",
            "publishTime": "2026-01-01T09:30:00Z",
            "startTime": delivery_time,
            "generation": 12000.0,
        },
        {
            "dataset": "WINDFOR",
            "publishTime": "2026-01-01T15:30:00Z",
            "startTime": delivery_time,
            "generation": 9800.0,
        },
    ]

    # Under D1_1100 cutoff:
    records = DataProcessor.process_intervals(fuelhh, windfor, cutoff_strategy="D1_1100")
    rec = next(r for r in records if r.startTime == delivery_time)

    # Must select 12000.0 (from 09:30:00Z), NOT the look-ahead 9800.0!
    assert rec.forecastGeneration == 12000.0
    assert rec.forecastPublishTime == "2026-01-01T09:30:00Z"
    assert rec.actualGeneration == 10000.0
    assert rec.error == 2000.0
    assert rec.isValid is True

    # Under D1_1400: still before 15:30, so still 12000.0
    records_14 = DataProcessor.process_intervals(fuelhh, windfor, cutoff_strategy="D1_1400")
    rec_14 = next(r for r in records_14 if r.startTime == delivery_time)
    assert rec_14.forecastGeneration == 12000.0

    # Under ROLLING_12H (cutoff is 2026-01-02 00:00):
    # 15:30 is before midnight, so 9800.0 becomes eligible!
    records_roll12 = DataProcessor.process_intervals(fuelhh, windfor, cutoff_strategy="ROLLING_12H")
    rec_roll12 = next(r for r in records_roll12 if r.startTime == delivery_time)
    assert rec_roll12.forecastGeneration == 9800.0
    assert rec_roll12.forecastPublishTime == "2026-01-01T15:30:00Z"


def test_resolution_mapping_modes():
    """
    Test difference between step_block (parent hour mapped) and exact (strict :00 only).
    """
    t_00 = "2026-01-02T12:00:00Z"
    t_30 = "2026-01-02T12:30:00Z"

    fuelhh = [
        {"dataset": "FUELHH", "publishTime": "2026-01-02T12:30:00Z", "startTime": t_00, "settlementDate": "2026-01-02", "settlementPeriod": 25, "fuelType": "WIND", "generation": 10000.0},
        {"dataset": "FUELHH", "publishTime": "2026-01-02T13:00:00Z", "startTime": t_30, "settlementDate": "2026-01-02", "settlementPeriod": 26, "fuelType": "WIND", "generation": 10500.0},
    ]

    # WINDFOR only has hourly timestamp for 12:00
    windfor = [
        {"dataset": "WINDFOR", "publishTime": "2026-01-01T09:30:00Z", "startTime": t_00, "generation": 11000.0},
    ]

    # Mode A: step_block -> both :00 and :30 receive the 11000.0 forecast
    records_block = DataProcessor.process_intervals(fuelhh, windfor, cutoff_strategy="D1_1100", mapping_mode="step_block")
    r00_b = next(r for r in records_block if r.startTime == t_00)
    r30_b = next(r for r in records_block if r.startTime == t_30)
    assert r00_b.forecastGeneration == 11000.0
    assert r00_b.isValid is True
    assert r30_b.forecastGeneration == 11000.0
    assert r30_b.isValid is True

    # Mode B: exact -> only :00 matches; :30 is MISSING_FORECAST
    records_exact = DataProcessor.process_intervals(fuelhh, windfor, cutoff_strategy="D1_1100", mapping_mode="exact")
    r00_e = next(r for r in records_exact if r.startTime == t_00)
    r30_e = next(r for r in records_exact if r.startTime == t_30)
    assert r00_e.forecastGeneration == 11000.0
    assert r00_e.isValid is True
    assert r30_e.forecastGeneration is None
    assert r30_e.status == "MISSING_FORECAST"
    assert r30_e.isValid is False


def test_vintages_inspection():
    delivery_time = "2026-01-02T12:00:00Z"
    fuelhh = [
        {
            "dataset": "FUELHH",
            "publishTime": "2026-01-02T12:30:00Z",
            "startTime": delivery_time,
            "settlementDate": "2026-01-02",
            "settlementPeriod": 25,
            "fuelType": "WIND",
            "generation": 10000.0,
        }
    ]
    windfor = [
        {"dataset": "WINDFOR", "publishTime": "2025-12-31T22:30:00Z", "startTime": delivery_time, "generation": 11000.0},
        {"dataset": "WINDFOR", "publishTime": "2026-01-01T09:30:00Z", "startTime": delivery_time, "generation": 11500.0},
        {"dataset": "WINDFOR", "publishTime": "2026-01-01T15:30:00Z", "startTime": delivery_time, "generation": 10200.0},
    ]

    v_resp = DataProcessor.get_vintages_for_interval(
        st_str=delivery_time,
        fuelhh_wind_records=fuelhh,
        windfor_records=windfor,
        cutoff_strategy="D1_1100",
    )

    assert v_resp.totalVintages == 3
    assert v_resp.eligibleCount == 2
    assert v_resp.selectedForecast is not None
    assert v_resp.selectedForecast.publishTime == "2026-01-01T09:30:00Z"
    assert v_resp.selectedForecast.generation == 11500.0
    assert v_resp.selectedForecast.isSelected is True

    # 15:30 vintage should be marked ineligible with reason
    post_v = next(v for v in v_resp.vintages if v.publishTime == "2026-01-01T15:30:00Z")
    assert post_v.isEligible is False
    assert "Look-ahead leakage" in post_v.exclusionReason
