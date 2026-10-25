import asyncio
import logging
from datetime import UTC, datetime, timedelta
from typing import Any

import httpx

from backend.app.core.config import settings

logger = logging.getLogger(__name__)


class ElexonClient:
    """
    HTTP client for querying official Elexon BMRS API endpoints:
    - FUELHH (Half-Hourly Generation Outturn by Fuel Type): filtered for fuelType='WIND'
    - WINDFOR (Wind Generation Forecast): all published vintages
    """

    def __init__(
        self,
        base_url: str = settings.ELEXON_BASE_URL,
        timeout: float = settings.ELEXON_TIMEOUT_SECONDS,
        max_retries: int = settings.ELEXON_MAX_RETRIES,
    ):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.max_retries = max_retries
        self.client: httpx.AsyncClient | None = None

    async def get_client(self) -> httpx.AsyncClient:
        if self.client is None or self.client.is_closed:
            self.client = httpx.AsyncClient(
                timeout=httpx.Timeout(self.timeout, connect=10.0),
                headers={
                    "Accept": "application/json",
                    "User-Agent": "REint-Energy-Forecast-Evaluator/1.0",
                },
            )
        return self.client

    async def close(self) -> None:
        if self.client and not self.client.is_closed:
            await self.client.aclose()

    async def fetch_endpoint_chunk(
        self, endpoint: str, params: dict[str, str]
    ) -> list[dict[str, Any]]:
        """
        Fetch a single chunk with retry and exponential backoff.
        """
        client = await self.get_client()
        url = f"{self.base_url}/datasets/{endpoint}/stream"

        for attempt in range(1, self.max_retries + 1):
            try:
                logger.info("Fetching %s chunk with params %s (attempt %d/%d)", endpoint, params, attempt, self.max_retries)
                response = await client.get(url, params=params)
                if response.status_code == 200:
                    data = response.json()
                    if isinstance(data, list):
                        return data
                    return []
                elif response.status_code == 429:
                    wait_time = float(response.headers.get("Retry-After", 2.0 * attempt))
                    logger.warning("Rate limit (429) hit for %s. Backing off for %.1fs", endpoint, wait_time)
                    await asyncio.sleep(wait_time)
                else:
                    logger.warning("Unexpected status %d from %s: %s", response.status_code, url, response.text[:200])
                    if attempt == self.max_retries:
                        response.raise_for_status()
                    await asyncio.sleep(settings.ELEXON_RETRY_DELAY * attempt)
            except (httpx.RequestError, httpx.HTTPStatusError) as exc:
                logger.warning("Error fetching %s (attempt %d/%d): %s", endpoint, attempt, self.max_retries, exc)
                if attempt == self.max_retries:
                    raise
                await asyncio.sleep(settings.ELEXON_RETRY_DELAY * attempt)

        return []

    async def fetch_dataset_in_chunks(
        self,
        endpoint: str,
        start_dt: datetime,
        end_dt: datetime,
        chunk_days: int = 5,
    ) -> list[dict[str, Any]]:
        """
        Fetch data across a wide time range by breaking it into manageable chunks.
        """
        all_records: list[dict[str, Any]] = []
        current_start = start_dt

        while current_start < end_dt:
            current_end = min(current_start + timedelta(days=chunk_days), end_dt)
            params = {
                "publishDateTimeFrom": current_start.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "publishDateTimeTo": current_end.strftime("%Y-%m-%dT%H:%M:%SZ"),
            }
            try:
                chunk = await self.fetch_endpoint_chunk(endpoint, params)
                all_records.extend(chunk)
                logger.info("Retrieved %d records for %s [%s to %s]", len(chunk), endpoint, params["publishDateTimeFrom"], params["publishDateTimeTo"])
            except Exception as e:
                logger.error("Failed to fetch chunk for %s [%s to %s]: %s", endpoint, params["publishDateTimeFrom"], params["publishDateTimeTo"], e)
                raise
            current_start = current_end

        return all_records

    async def fetch_january_2026_data(self) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
        """
        Fetch January 2026 data for both FUELHH (filtered for WIND) and WINDFOR.
        - FUELHH is queried from 2026-01-01T00:00:00Z to 2026-02-01T02:00:00Z.
        - WINDFOR is queried from 2025-12-31T00:00:00Z to 2026-01-31T23:59:59Z to ensure
          all Day-Ahead forecasts published on 2025-12-31 for delivery on 2026-01-01 are captured.
        """
        fuelhh_start = datetime(2026, 1, 1, 0, 0, 0, tzinfo=UTC)
        fuelhh_end = datetime(2026, 2, 1, 2, 0, 0, tzinfo=UTC)

        windfor_start = datetime(2025, 12, 31, 0, 0, 0, tzinfo=UTC)
        windfor_end = datetime(2026, 1, 31, 23, 59, 59, tzinfo=UTC)

        logger.info("Fetching FUELHH records from Elexon API...")
        fuelhh_raw = await self.fetch_dataset_in_chunks("FUELHH", fuelhh_start, fuelhh_end, chunk_days=5)
        # Filter FUELHH for WIND fuelType
        fuelhh_wind = [r for r in fuelhh_raw if r.get("fuelType") == "WIND"]
        logger.info("Filtered %d WIND records out of %d total FUELHH records", len(fuelhh_wind), len(fuelhh_raw))

        logger.info("Fetching WINDFOR records from Elexon API...")
        windfor_raw = await self.fetch_dataset_in_chunks("WINDFOR", windfor_start, windfor_end, chunk_days=5)
        logger.info("Retrieved %d WINDFOR records", len(windfor_raw))

        return fuelhh_wind, windfor_raw

    @staticmethod
    def generate_synthetic_january_2026_fixtures() -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
        """
        Generate deterministic synthetic fixture data for testing and offline demo mode.
        Clearly tagged so it is never confused with live data.
        Generates realistic wind generation profiles (diurnal patterns, storm events).
        """
        import math
        import random

        rng = random.Random(42)  # Deterministic seed

        fuelhh_records: list[dict[str, Any]] = []
        windfor_records: list[dict[str, Any]] = []

        start_dt = datetime(2026, 1, 1, 0, 0, 0, tzinfo=UTC)
        total_half_hours = 31 * 48  # 1488 intervals

        for i in range(total_half_hours):
            interval_start = start_dt + timedelta(minutes=30 * i)
            interval_str = interval_start.strftime("%Y-%m-%dT%H:%M:%SZ")
            settlement_date = interval_start.strftime("%Y-%m-%d")
            settlement_period = (interval_start.hour * 2) + (interval_start.minute // 30) + 1

            # Base seasonal generation + weather wave + diurnal effect
            day_of_month = interval_start.day
            hour_of_day = interval_start.hour + interval_start.minute / 60.0
            base_gen = 12000.0 + 5000.0 * math.sin(day_of_month * 0.4) + 1500.0 * math.cos(hour_of_day * 0.26)
            noise = rng.gauss(0, 400.0)
            actual_gen = max(200.0, round(base_gen + noise, 1))

            # FuelHH record
            pub_time = (interval_start + timedelta(minutes=30)).strftime("%Y-%m-%dT%H:%M:%SZ")
            fuelhh_records.append({
                "dataset": "FUELHH",
                "publishTime": pub_time,
                "startTime": interval_str,
                "settlementDate": settlement_date,
                "settlementPeriod": settlement_period,
                "fuelType": "WIND",
                "generation": actual_gen,
                "_is_synthetic": True,
            })

            # Generate multiple forecast vintages:
            # 1. Day D-2 15:30 (48h before D)
            # 2. Day D-1 09:30 (Day-Ahead pre-11:00 cutoff) -> Selected forecast
            # 3. Day D-1 15:30 (Day-Ahead post-11:00 cutoff)
            # 4. Day D 02:30 (Intraday)
            d_minus_1 = interval_start.replace(hour=0, minute=0, second=0) - timedelta(days=1)

            # Vintage 1: D-2 15:30
            v1_pub = (d_minus_1 - timedelta(days=1)).replace(hour=15, minute=30).strftime("%Y-%m-%dT%H:%M:%SZ")
            v1_gen = max(100.0, round(actual_gen + rng.gauss(400, 1200), 1))
            windfor_records.append({
                "dataset": "WINDFOR",
                "publishTime": v1_pub,
                "startTime": interval_str,
                "generation": v1_gen,
                "_is_synthetic": True,
            })

            # Vintage 2: D-1 09:30 (Eligible for 11:00 cutoff)
            v2_pub = d_minus_1.replace(hour=9, minute=30).strftime("%Y-%m-%dT%H:%M:%SZ")
            # Systematic positive bias + random forecast uncertainty
            v2_gen = max(150.0, round(actual_gen + 350.0 + rng.gauss(0, 850), 1))
            windfor_records.append({
                "dataset": "WINDFOR",
                "publishTime": v2_pub,
                "startTime": interval_str,
                "generation": v2_gen,
                "_is_synthetic": True,
            })

            # Vintage 3: D-1 15:30 (Post-cutoff, look-ahead vintage)
            v3_pub = d_minus_1.replace(hour=15, minute=30).strftime("%Y-%m-%dT%H:%M:%SZ")
            v3_gen = max(150.0, round(actual_gen + 150.0 + rng.gauss(0, 500), 1))
            windfor_records.append({
                "dataset": "WINDFOR",
                "publishTime": v3_pub,
                "startTime": interval_str,
                "generation": v3_gen,
                "_is_synthetic": True,
            })

        return fuelhh_records, windfor_records
