# `gb-wind-forecast-eval-2026`
### Great Britain Wholesale Electricity Day-Ahead Wind Forecast Evaluation Platform

> **Hiring Assignment Submission:** REint Full Stack Software Engineer Challenge v4  
> **Anonymous Repository Name:** `gb-wind-forecast-eval-2026`  
> **Reporting Window:** January 2026 Delivery Period (1,488 Half-Hour Settlement Intervals)  
> **Primary Technology Stack:** React 18, TypeScript, Tailwind CSS, Recharts, Python 3.11, FastAPI, Pydantic, Pandas, Docker  

---

## 1. Project Purpose & Executive Summary

In Great Britain's wholesale electricity market, day-ahead power procurement decisions depend heavily on expected renewable generation. Because wind generation operates with near-zero marginal cost, it forms the bedrock of supply scheduling. However:
- **Systematic Overforecasting ($Forecast > Actual$):** Leaves the purchasing utility short of physical power, exposing the trading desk to volatile balancing mechanism (BM) cashout settlement prices.
- **Systematic Underforecasting ($Forecast < Actual$):** Forces the utility to over-contract thermal generation, spilling excess energy at lower imbalance system sell prices.

This production-grade platform:
1. Ingests genuine outturn and forward forecast vintages directly from **Elexon BMRS** stream endpoints (`FUELHH` and `WINDFOR`).
2. Applies a defensible wholesale market gate closure rule (**11:00 London local time on Day D-1**, matching Nord Pool GB & EPEX SPOT GB Day-Ahead auction order book closures) to strictly eliminate **look-ahead leakage**.
3. Bridges the 1-hour granularity of Elexon wind forecasts with the 30-minute settlement period resolution of the UK grid across the entire month of **January 2026 (1,488 settlement intervals)**.
4. Quantifies forecasting error via **MAE, RMSE, Bias, and Coverage** and surfaces interactive visualizations (diurnal curves, error distributions, and publication vintage trajectories).

---

## 2. Key Analytical Results (January 2026)

Evaluated with genuine Elexon BMRS stream data under the primary `D1_1100` gate closure benchmark:

| Metric | Measured Value | Unit | Definition / Business Significance |
| :--- | :--- | :--- | :--- |
| **Total Eligible Intervals** | **1,488** | half-hours | Complete 31-day January 2026 delivery window ($31 \times 48$) |
| **Valid Evaluated Intervals** | **1,488** | half-hours | **100.0% Forecast Coverage** |
| **Missing Actuals / Forecasts**| **0 / 0** | intervals | Zero data gaps in Elexon BMRS outturn and forecast feeds |
| **Mean Actual Generation** | **11,580.7** | MW | Average GB wind power outturn across January 2026 |
| **Mean Forecast Generation**| **13,421.0** | MW | Average expected generation published prior to auction gate closure |
| **Mean Absolute Error (MAE)** | **2,126.1** | MW | Average magnitude of forecast error |
| **Root Mean Squared Error (RMSE)**| **2,620.8** | MW | Disproportionately penalizes large forecasting misses |
| **Forecasting Bias** | **+1,840.3** | MW | **Systematic Overforecast** |
| **Total Energy Outturn** | **8,619,520** | MWh | Total actual wind energy delivered (MW $\times$ 0.5h) |
| **Total Energy Forecast** | **9,984,850** | MWh | Total energy expected prior to gate closure |

> **Key Finding:** In January 2026, the national wind forecast systematically overpredicted generation by an average of **+1,840.3 MW** (+15.8% above actuals). A utility procuring power day-ahead without a de-biasing adjustment would have been chronically long, suffering cashout imbalance losses.

---

## 3. Architecture & Data Flow

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

## 4. Repository Structure

```
gb-wind-forecast-eval-2026/
├── .github/workflows/ci.yml       # Automated GitHub Actions CI workflow
├── backend/
│   ├── app/
│   │   ├── main.py                # FastAPI app, lifespan initialization & SPA serving
│   │   ├── core/config.py         # Pydantic BaseSettings environment configuration
│   │   ├── models/schemas.py      # Typed Pydantic models for API contracts
│   │   ├── services/
│   │   │   ├── elexon_client.py   # Asynchronous HTTP client for Elexon BMRS
│   │   │   ├── cache_manager.py   # Filesystem persistence & offline support
│   │   │   ├── data_processor.py  # Temporal matching & cutoff decision rules
│   │   │   └── forecast_service.py# Memoization coordinator
│   │   ├── analytics/metrics.py   # Vectorized MAE, RMSE, Bias, Diurnal & Quantiles
│   │   └── api/routes.py          # Typed REST API endpoints
│   ├── tests/
│   │   ├── test_metrics.py        # Verified deterministic metric calculations
│   │   ├── test_data_processor.py # Cutoff rules & look-ahead prevention tests
│   │   └── test_api.py            # API endpoint integration tests
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/            # Header, MetricCard, DateFilter, Table, Vintages
│   │   ├── charts/                # TimeseriesChart, DailyAccuracy, Diurnal, Histogram
│   │   ├── services/api.ts        # Typed fetch client with base URL handling
│   │   ├── types/index.ts         # TypeScript interfaces
│   │   ├── utils/formatters.ts    # MW, MWh, Date & Percentage formatters
│   │   └── App.tsx                # Main view coordinator
│   ├── tests/
│   │   ├── setup.ts               # Vitest environment setup
│   │   └── App.test.tsx           # React Testing Library unit tests
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── docs/
│   ├── architecture.md            # Technical architecture specification
│   ├── methodology.md             # Market context, cutoffs & formulas
│   └── demo-script.md             # 10-minute video presentation guide
├── Dockerfile                     # Multi-stage production container build
├── docker-compose.yml             # Local orchestration with persistent cache volume
├── render.yaml                    # Infrastructure-as-code for Cloud hosting
├── vercel.json                    # Static frontend hosting configuration
├── pyproject.toml                 # Ruff & Pytest configuration
├── .env.example
├── .gitignore
└── README.md
```

---

## 5. Forecasting Methodology & Market Cutoff

### 5.1 Day-Ahead Decision Cutoff Rationale
In Great Britain, wholesale day-ahead auctions on **EPEX SPOT** and **Nord Pool** close order books at **11:00 London local time on Day D-1**.
- For each 30-minute delivery interval on day $D$, the system evaluates:
  $$\text{Cutoff Timestamp} = (D-1)\text{ at } 11:00 \text{ Europe/London}$$
- Any forecast publication with $\text{publishTime} > \text{Cutoff Timestamp}$ is **strictly excluded** from decision evaluation.
- The latest eligible publication on or before the cutoff is selected:
  $$\text{Selected Forecast} = \max_{\{v \in \text{Vintages} \mid \text{publishTime}_v \le \text{Cutoff}\}} (\text{publishTime}_v)$$
- The cutoff is dynamically configurable via API parameters:
  - `D1_1100`: Day D-1 at 11:00 (GB DAM standard - default)
  - `D1_1200`: Day D-1 at 12:00 (Pan-European Single Day-Ahead Coupling SDAC)
  - `D1_1400`: Day D-1 at 14:00 (Post-clearing bilateral schedule)
  - `ROLLING_24H`: 24 hours prior to interval start
  - `ROLLING_12H`: 12 hours prior to interval start

### 5.2 Granularity Mapping
Elexon `WINDFOR` forecasts are produced in 1-hour blocks (`HH:00`), whereas `FUELHH` generation is recorded at 30-minute intervals (`HH:00` and `HH:30`).
- For each half-hour delivery interval, the platform maps to its parent forecast hour (`dt.replace(minute=0)`).
- This mirrors physical trading: a day-ahead procurement bid submitted for an hourly block covers both settlement periods within that hour.

---

## 6. Installation & Local Startup

### Prerequisites
- Python 3.11+
- Node.js 18+ and npm
- (Optional) Docker and Docker Compose

### Step 1: Clone Repository
```bash
git clone https://github.com/<anonymous-user>/gb-wind-forecast-eval-2026.git
cd gb-wind-forecast-eval-2026
```

### Step 2: Backend Setup
```bash
# Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate       # On Linux/macOS
# .venv\Scripts\activate        # On Windows PowerShell

# Install dependencies
pip install -r backend/requirements.txt
pip install ruff pytest pytest-asyncio

# Start FastAPI backend (runs on http://localhost:8000)
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

### Step 3: Frontend Setup (in separate terminal)
```bash
cd frontend
npm install
npm run dev
```
Open **`http://localhost:5173`** in your browser. (The Vite dev server automatically proxies `/api` requests to `http://localhost:8000`).

---

## 7. Docker Startup

The project includes a multi-stage `Dockerfile` that builds the React bundle and serves both the API and the SPA from a single secure container:

```bash
# Build and run with Docker Compose
docker compose up --build -d

# Open application
# http://localhost:8000
```
- A persistent Docker volume (`elexon_cache`) caches downloaded Elexon records across container restarts.
- Built-in container healthcheck monitors `http://localhost:8000/api/health`.

---

## 8. Verification & Testing Commands

### Backend Tests & Linting
```bash
# Run Ruff lint check
ruff check backend

# Run Pytest suite (14 unit and integration tests)
python -m pytest backend/tests -v
```

### Frontend Tests & Typecheck
```bash
cd frontend

# TypeScript check
npm run lint

# Run Vitest test suite
npm run test

# Production bundle build
npm run build
```

---

## 9. API Endpoint Reference

Interactive OpenAPI documentation is available at **`/docs`** and **`/redoc`**.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Health check, data source provenance, and cached records count |
| `GET` | `/api/metadata` | Market cutoff descriptions, Elexon endpoints, and metric definitions |
| `GET` | `/api/overview` | Aggregated MAE, RMSE, Bias, Coverage, MWh, and mean generation |
| `GET` | `/api/timeseries` | Full 1,488 interval records with forecast, actual, and error |
| `GET` | `/api/accuracy` | Detailed accuracy: daily breakdown, diurnal curve, and error histogram |
| `GET` | `/api/forecasts/vintages` | Chronological forecast publications for a single interval with lookahead flags |
| `GET` | `/api/intervals` | Paginated interval records with sorting and status filtering |
| `POST`| `/api/cache/refresh` | Trigger re-synchronization with live Elexon BMRS API |

---

## 10. Deployment Strategy

The application is structured for flexible production deployment:
1. **Single-Container Deployment (Render / Heroku / AWS ECS):**
   - The Dockerfile builds the React SPA and serves it directly alongside FastAPI on port 8000.
   - Pre-configured with `render.yaml` and `Procfile`.
2. **Decoupled Deployment (Vercel + Python Backend):**
   - Frontend deployed statically on Vercel with `vercel.json` rewriting `/api/(.*)` to the deployed backend service.
   - Zero CORS issues when using same-origin rewrites.

---

## 11. Known Limitations & Future Roadmap

1. **National-Level Aggregation:** Elexon `WINDFOR` and `FUELHH` report Great Britain national totals. Future iterations could incorporate zonal wind forecasts (e.g. Scottish export constraints) to assess transmission bottlenecks.
2. **Weather Model Ingestion:** Currently evaluates Elexon's published wind forecast. Ingesting raw Numerical Weather Prediction (NWP) ensembles (ECMWF, GFS) would allow probabilistic quantile modeling.
3. **Financial Imbalance Modeling:** While this dashboard calculates physical MW/MWh errors, pairing with Elexon System Price (`DISBSAD` / `SBP`) data would enable exact calculation of financial cashout penalties.

---

## 12. Explicit AI Assistance Disclosure

AI-assisted development tools were used to support implementation, debugging, and documentation. The developer reviewed and tested the resulting code and remains responsible for its correctness.
