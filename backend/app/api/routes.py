
from fastapi import APIRouter, HTTPException, Query

from backend.app.models.schemas import (
    AccuracyResponse,
    MetadataResponse,
    OverviewResponse,
    PaginatedIntervalsResponse,
    TimeseriesResponse,
    VintagesResponse,
)
from backend.app.services.forecast_service import forecast_service

router = APIRouter()


@router.get("/health", summary="Service Health & Data Status")
async def get_health():
    return {
        "status": "healthy",
        "dataSource": forecast_service.data_source,
        "dataStatus": forecast_service.data_status,
        "fuelhhRecords": len(forecast_service.fuelhh_records),
        "windforRecords": len(forecast_service.windfor_records),
        "lastUpdated": forecast_service.last_updated,
    }


@router.get("/metadata", response_model=MetadataResponse, summary="Application Metadata & Methodology")
async def get_metadata():
    return forecast_service.get_metadata()


@router.get("/overview", response_model=OverviewResponse, summary="High-Level Executive Overview")
async def get_overview(
    cutoff_strategy: str = Query("D1_1100", description="Cutoff strategy ID (e.g. D1_1100, D1_1200, ROLLING_24H)"),
    date_from: str | None = Query(None, description="Start date filter (YYYY-MM-DD)"),
    date_to: str | None = Query(None, description="End date filter (YYYY-MM-DD)"),
):
    return forecast_service.get_overview(
        cutoff_strategy=cutoff_strategy,
        date_from=date_from,
        date_to=date_to,
    )


@router.get("/timeseries", response_model=TimeseriesResponse, summary="Forecast vs Actual Time Series")
async def get_timeseries(
    cutoff_strategy: str = Query("D1_1100", description="Cutoff strategy ID"),
    date_from: str | None = Query(None, description="Start date filter (YYYY-MM-DD)"),
    date_to: str | None = Query(None, description="End date filter (YYYY-MM-DD)"),
):
    return forecast_service.get_timeseries(
        cutoff_strategy=cutoff_strategy,
        date_from=date_from,
        date_to=date_to,
    )


@router.get("/accuracy", response_model=AccuracyResponse, summary="Quantitative Forecast Accuracy Metrics")
async def get_accuracy(
    cutoff_strategy: str = Query("D1_1100", description="Cutoff strategy ID"),
    date_from: str | None = Query(None, description="Start date filter (YYYY-MM-DD)"),
    date_to: str | None = Query(None, description="End date filter (YYYY-MM-DD)"),
):
    return forecast_service.get_accuracy(
        cutoff_strategy=cutoff_strategy,
        date_from=date_from,
        date_to=date_to,
    )


@router.get("/forecasts/vintages", response_model=VintagesResponse, summary="Forecast Vintages for Delivery Interval")
async def get_forecast_vintages(
    start_time: str = Query(..., description="Target delivery interval start time (ISO 8601 UTC)"),
    cutoff_strategy: str = Query("D1_1100", description="Cutoff strategy ID"),
):
    try:
        return forecast_service.get_vintages_for_interval(
            start_time=start_time,
            cutoff_strategy=cutoff_strategy,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid start_time parameter: {e}")


@router.get("/intervals", response_model=PaginatedIntervalsResponse, summary="Paginated Interval Data Records")
async def get_intervals(
    cutoff_strategy: str = Query("D1_1100", description="Cutoff strategy ID"),
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(50, ge=1, le=500, description="Items per page"),
    status: str | None = Query(None, description="Status filter: ALL, VALID, MISSING_FORECAST, MISSING_ACTUAL"),
    date_from: str | None = Query(None, description="Start date (YYYY-MM-DD)"),
    date_to: str | None = Query(None, description="End date (YYYY-MM-DD)"),
    sort_by: str = Query("startTime", description="Field to sort by"),
    sort_desc: bool = Query(False, description="Sort descending if true"),
):
    return forecast_service.get_paginated_intervals(
        cutoff_strategy=cutoff_strategy,
        page=page,
        page_size=page_size,
        status=status,
        date_from=date_from,
        date_to=date_to,
        sort_by=sort_by,
        sort_desc=sort_desc,
    )


@router.post("/cache/refresh", summary="Force Refresh from Elexon Live API")
async def refresh_cache():
    try:
        await forecast_service.initialize(force_fetch=True)
        return {
            "status": "success",
            "message": "Data refreshed successfully",
            "dataSource": forecast_service.data_source,
            "dataStatus": forecast_service.data_status,
            "fuelhhRecords": len(forecast_service.fuelhh_records),
            "windforRecords": len(forecast_service.windfor_records),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to refresh data: {e}")
