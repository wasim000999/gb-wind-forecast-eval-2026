import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.services.forecast_service import forecast_service


@pytest.fixture(scope="module", autouse=True)
def setup_test_data():
    # Load synthetic fixture data for deterministic API testing
    fuelhh, windfor = forecast_service.elexon_client.generate_synthetic_january_2026_fixtures()
    forecast_service.fuelhh_records = fuelhh
    forecast_service.windfor_records = windfor
    forecast_service.data_source = "Synthetic Fixture (Test Suite)"
    forecast_service.data_status = "TEST"
    forecast_service._memoized_intervals.clear()


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def test_health_endpoint(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["fuelhhRecords"] > 0
    assert data["windforRecords"] > 0


def test_metadata_endpoint(client):
    res = client.get("/api/metadata")
    assert res.status_code == 200
    data = res.json()
    assert data["reportingPeriod"] == "January 2026"
    assert "Europe/London" in data["timezone"]
    assert len(data["availableCutoffStrategies"]) >= 3
    assert "MAE" in data["metricDefinitions"]


def test_overview_endpoint(client):
    res = client.get("/api/overview?cutoff_strategy=D1_1100")
    assert res.status_code == 200
    data = res.json()
    assert data["reportingPeriod"] == "January 2026"
    assert data["cutoffStrategy"] == "D1_1100"
    metrics = data["metrics"]
    assert metrics["totalIntervals"] == 1488
    assert metrics["validIntervals"] > 1400
    assert metrics["coveragePercentage"] > 95.0
    assert metrics["mae"] is not None
    assert metrics["rmse"] is not None
    assert metrics["bias"] is not None


def test_timeseries_endpoint(client):
    res = client.get("/api/timeseries?date_from=2026-01-01&date_to=2026-01-02")
    assert res.status_code == 200
    data = res.json()
    assert data["totalRecords"] == 96  # 2 days * 48 half-hours
    intervals = data["intervals"]
    assert len(intervals) == 96
    assert intervals[0]["startTime"] == "2026-01-01T00:00:00Z"
    assert intervals[0]["settlementPeriod"] == 1


def test_accuracy_endpoint(client):
    res = client.get("/api/accuracy?cutoff_strategy=D1_1100")
    assert res.status_code == 200
    data = res.json()
    assert len(data["dailyBreakdown"]) == 31
    assert len(data["diurnalBreakdown"]) == 48
    assert len(data["errorDistribution"]) > 0


def test_vintages_endpoint(client):
    st = "2026-01-02T12:00:00Z"
    res = client.get(f"/api/forecasts/vintages?start_time={st}&cutoff_strategy=D1_1100")
    assert res.status_code == 200
    data = res.json()
    assert data["deliveryStartTime"] == st
    assert data["totalVintages"] > 0
    assert data["selectedForecast"] is not None
    assert data["selectedForecast"]["isSelected"] is True


def test_intervals_paginated_endpoint(client):
    res = client.get("/api/intervals?page=1&page_size=20&status=VALID")
    assert res.status_code == 200
    data = res.json()
    assert data["page"] == 1
    assert data["pageSize"] == 20
    assert len(data["intervals"]) == 20
    assert data["total"] > 1400
    assert data["totalPages"] > 70
