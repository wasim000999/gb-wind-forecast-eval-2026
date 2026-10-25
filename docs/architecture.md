# Technical Architecture: GB Wind Generation Forecast Evaluation Platform

## 1. System Overview

The **GB Wind Generation Forecast Evaluation Platform** is a production-grade energy analytics decision-support prototype. It is engineered for a UK electricity utility procuring power in the Great Britain (GB) wholesale Day-Ahead wholesale electricity market.

The system ingests national wind generation forecasts and outturn generation from official Elexon Balancing Mechanism Reporting Service (BMRS) stream endpoints, enforces wholesale day-ahead gate closure rules to eliminate look-ahead leakage, quantitatively measures forecast performance across the January 2026 delivery period, and surfaces interactive decision-support insights through a high-performance React dashboard.

```
                      +------------------------------------------+
                      |          Official Elexon BMRS API        |
                      |  - FUELHH/stream (Actual Generation)     |
                      |  - WINDFOR/stream (Forecast Vintages)    |
                      +--------------------+---------------------+
                                           |
                                    HTTPS / JSON
                                           v
+-----------------------------------------------------------------------------------+
| FastAPI Backend Service (Python 3.11+)                                            |
|                                                                                   |
|  +--------------------+    +---------------------+    +------------------------+  |
|  |   ElexonClient     |--->|    CacheManager     |--->|     DataProcessor      |  |
|  | - Async HTTPX      |    | - Atomic JSON Cache |    | - Market Cutoff Rules  |  |
|  | - Retry & Backoff  |    | - Offline Fallback  |    | - Temporal Alignment   |  |
|  | - Chunked Windows  |    | - Demo Generator    |    | - Leakage Prevention   |  |
|  +--------------------+    +---------------------+    +-----------+------------+  |
|                                                                   |               |
|                                                                   v               |
|  +--------------------+    +---------------------+    +------------------------+  |
|  |    API Router      |<---|   ForecastService   |<---|    AccuracyAnalytics   |  |
|  | - /api/overview    |    | - State Coordinator |    | - MAE, RMSE, Bias      |  |
|  | - /api/timeseries  |    | - Cutoff Memoizer   |    | - Coverage, Quantiles  |  |
|  | - /api/accuracy    |    +---------------------+    | - Diurnal/Daily Break  |  |
|  | - /api/vintages    |                               +------------------------+  |
|  +--------------------+                                                           |
+------------------------------------------+----------------------------------------+
                                           |
                                      REST / JSON
                                           v
+-----------------------------------------------------------------------------------+
| React Single-Page Application (TypeScript + Vite + Tailwind CSS + Recharts)       |
|                                                                                   |
|  +------------------+  +-------------------+  +------------------+  +----------+  |
|  | Executive Cards  |  | Timeseries Chart  |  | VintageTimeline  |  | CSV Data |  |
|  | MAE, RMSE, Bias  |  | Interactive Brush |  | Lookahead Marker |  | Export   |  |
|  +------------------+  +-------------------+  +------------------+  +----------+  |
+-----------------------------------------------------------------------------------+
```

---

## 2. Monorepo Organization

```
/
├── .github/workflows/ci.yml       # GitHub Actions CI for linting, tests & build
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                # FastAPI entrypoint, lifespan & SPA serving
│   │   ├── core/
│   │   │   ├── config.py          # Pydantic BaseSettings environment config
│   │   ├── models/
│   │   │   └── schemas.py         # Pydantic schemas (typed API contracts)
│   │   ├── services/
│   │   │   ├── elexon_client.py   # Asynchronous client for Elexon BMRS
│   │   │   ├── cache_manager.py   # Disk persistence & cache synchronization
│   │   │   ├── data_processor.py  # Temporal alignment & cutoff gate logic
│   │   │   └── forecast_service.py# State coordinator & memoization engine
│   │   ├── analytics/
│   │   │   └── metrics.py         # Vectorized quantitative metrics (NumPy)
│   │   └── api/
│   │       └── routes.py          # Typed REST API endpoints
│   ├── tests/
│   │   ├── test_metrics.py        # Verified deterministic metric calculations
│   │   ├── test_data_processor.py # Cutoff and look-ahead prevention tests
│   │   └── test_api.py            # Integration tests for all REST endpoints
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/            # Header, KPI cards, table, vintage inspector
│   │   ├── charts/                # Timeseries, Diurnal, Daily, Error Histogram
│   │   ├── services/              # Typed fetch API client
│   │   ├── types/                 # Shared TypeScript models
│   │   ├── utils/                 # Unit, currency, date & number formatters
│   │   ├── App.tsx                # Main view coordinator & state container
│   │   └── index.css              # Tailwind base & custom styles
│   ├── tests/
│   │   ├── setup.ts               # Jest DOM & ResizeObserver mocks
│   │   └── App.test.tsx           # React Testing Library unit tests
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── docs/
│   ├── architecture.md            # Technical architecture specification
│   ├── methodology.md             # Market context, cutoffs & formulas
│   └── demo-script.md             # 10-minute demonstration recording guide
├── Dockerfile                     # Multi-stage production container build
├── docker-compose.yml             # Local orchestration with persistent cache
├── render.yaml                    # Infrastructure-as-code for Cloud hosting
├── vercel.json                    # Static frontend hosting configuration
├── pyproject.toml                 # Ruff & Pytest configuration
├── .env.example
├── .gitignore
└── README.md
```

---

## 3. Data Pipeline & Reliability Engineering

### 3.1 Official Elexon BMRS Integration
The platform consumes two datasets from `https://data.elexon.co.uk/bmrs/api/v1/`:
1. **Actual Wind Generation (`FUELHH/stream`):**
   - Half-hourly generation outturn aggregated by fuel category.
   - Filtered exclusively for `fuelType == "WIND"`.
   - Query window: `2026-01-01T00:00:00Z` to `2026-02-01T02:00:00Z` (captures all settlement periods of January).
2. **Wind Generation Forecast (`WINDFOR/stream`):**
   - Forward-looking wind generation forecast vintages published across rolling horizons.
   - Query window: `2025-12-31T00:00:00Z` to `2026-01-31T23:59:59Z` (captures forecasts published on Dec 31 for delivery on Jan 1).

### 3.2 Granularity Bridging
Elexon `WINDFOR` publishes forecasts in **1-hour blocks** (`00:00`, `01:00`, `02:00`, ...), whereas `FUELHH` records outturn in **30-minute settlement periods** (`00:00`, `00:30`, `01:00`, `01:30`, ...).
In wholesale electricity market procurement operations, each hourly forecast block applies across both half-hours in that hour (Settlement Period $2k-1$ and $2k$). The `DataProcessor` bridges these streams seamlessly, enabling complete 1,488 interval evaluation across all 31 days of January 2026.

### 3.3 Disk Caching & Offline Resilience
- Downloaded records are persisted locally in `backend/app/data/cache/` as JSON documents.
- First request or container startup reads from disk in $<50\text{ ms}$.
- If the Elexon API is unreachable (e.g. offline CI environment or upstream network outage), the system automatically falls back to deterministic synthetic fixtures, with a visible `dataStatus = "DEMO"` indicator so users are never misled.

---

## 4. Forecasting Cutoff Logic & Anti-Leakage Guarantee

```
Delivery Day D: 2026-01-02 [00:00 to 24:00 London Time]
Decision Day D-1: 2026-01-01

                    Day-Ahead Gate Closure: 11:00 UTC
                                  |
                                  v
+---------------------------------+-----------------------------------+
|   ELIGIBLE FORECAST VINTAGES    |     EXCLUDED LOOK-AHEAD VINTAGES  |
|                                 |                                   |
| - 2026-01-01 02:30 (Superseded) | - 2026-01-01 11:30 (Excluded)     |
| - 2026-01-01 04:30 (Superseded) | - 2026-01-01 15:30 (Excluded)     |
| - 2026-01-01 07:30 (Superseded) | - 2026-01-01 18:30 (Excluded)     |
| - 2026-01-01 09:30 [SELECTED]   | - 2026-01-01 22:30 (Excluded)     |
+---------------------------------+-----------------------------------+
```

The algorithm evaluates:
1. `cutoff_time = calculate_cutoff_timestamp(delivery_start_utc, strategy)`
2. `candidates = [v for v in vintages if v.publishTime <= cutoff_time]`
3. `selected_forecast = max(candidates, key=lambda v: v.publishTime)`

Any forecast with `publishTime > cutoff_time` is strictly discarded from decision evaluation and marked as `EXCLUDED (LOOK-AHEAD LEAKAGE)`.

---

## 5. Security and Operational Standards

1. **No Hardcoded Secrets:** Configuration is managed via Pydantic settings and environment variables.
2. **CORS Configuration:** Configurable origin allowlists for development and production domains.
3. **Container Security:** Non-root user (`appuser:1001`), read-only container root support, and built-in Docker health check.
4. **Resilience:** Automatic retry with exponential backoff on HTTP 429/5xx from Elexon BMRS.
