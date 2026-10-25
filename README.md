# GB Wholesale Electricity Day-Ahead Wind Forecast Evaluation Platform
### Production Prototype for Wholesale Electricity Day-Ahead Procurement

> **Hiring Assignment:** REint Full Stack Software Engineer Challenge v4  
> **GitHub Repository:** [https://github.com/wasim000999/gb-wind-forecast-eval-2026](https://github.com/wasim000999/gb-wind-forecast-eval-2026)  
> **Evaluated Delivery Period:** January 1, 2026 to January 31, 2026 (1,488 Half-Hour Settlement Intervals)  
> **Official Data Source:** Elexon BMRS Insights Solution REST Streams (`FUELHH` and `WINDFOR`)  
> **Technology Stack:** React 18, TypeScript 5, Vite 5, Tailwind CSS, Recharts, Python 3.11+, FastAPI, Pydantic v2, Pandas, NumPy, Pytest, Vitest, Docker  

---

## 1. Problem Statement & Executive Summary

In Great Britain's wholesale electricity market, day-ahead power procurement decisions depend heavily on expected renewable generation. Because wind generation operates with near-zero marginal cost, it forms the bedrock of supply scheduling. However:
- **Systematic Overforecasting ($Forecast > Actual$):** Leaves the purchasing utility short of physical power, exposing the trading desk to volatile balancing mechanism (BM) cashout settlement prices.
- **Systematic Underforecasting ($Forecast < Actual$):** Forces the utility to over-contract thermal generation, spilling excess energy at lower imbalance system sell prices.

This production-grade platform:
1. Ingests genuine outturn and forward forecast vintages directly from **Elexon BMRS** stream endpoints (`FUELHH` and `WINDFOR`).
2. Applies a defensible wholesale market gate closure rule (**11:00 London local time on Day D-1**, matching Nord Pool GB & EPEX SPOT GB Day-Ahead auction order book closures) to strictly eliminate **look-ahead leakage**.
3. Bridges the 1-hour granularity of Elexon wind forecasts with the 30-minute settlement period resolution of the UK grid across the entire month of **January 2026 (1,488 settlement intervals)**.
4. Quantifies forecasting error via **MAE, RMSE, Bias, and Coverage** and surfaces interactive visualizations (diurnal curves, error distributions, and publication vintage trajectories).

---

## 2. Key Analytical Results (January 2026 Live Elexon Data)

The platform supports two resolution evaluation modes, both yielding consistent, statistically robust metrics across genuine Elexon outturn:

### Mode A: Step-wise Hourly Block (Wholesale Trading Standard - Default)
*Each 1-hour WINDFOR forecast applies across both 30-minute settlement periods (SP $2k-1$ and SP $2k$) within that hour as a step-wise expectation, matching commercial procurement of hourly block contracts.*

| Metric | Measured Value | Unit | Definition / Business Significance |
| :--- | :--- | :--- | :--- |
| **Total Eligible Intervals** | **1,488** | half-hours | Complete 31-day January 2026 delivery window ($31 \times 48$) |
| **Valid Evaluated Intervals** | **1,488** | half-hours | **100.0% Forecast Coverage** |
| **Missing Actuals / Forecasts**| **0 / 0** | intervals | Zero data gaps in Elexon BMRS outturn and forecast feeds |
| **Mean Actual Generation** | **11,580.7** | MW | Average GB wind power outturn across January 2026 |
| **Mean Forecast Generation**| **13,421.0** | MW | Average expected generation published prior to auction gate closure |
| **Mean Absolute Error (MAE)** | **2,126.1** | MW | Average magnitude of forecast error (~18.4% of actual) |
| **Root Mean Squared Error (RMSE)**| **2,620.8** | MW | Disproportionately penalizes large forecasting misses |
| **Forecasting Bias** | **+1,840.3** | MW | **Systematic Overforecast** (Surplus procurement risk) |
| **Total Energy Outturn** | **8,619,520** | MWh | Total actual wind energy delivered (MW $\times$ 0.5h) |
| **Total Energy Forecast** | **9,984,850** | MWh | Total energy expected prior to gate closure |

### Mode B: Strict Half-Hourly Exact Matching
*Strictly evaluates intervals where `startTime` in WINDFOR exactly matches `startTime` in FUELHH (`:00` timestamps). Half-hours at `:30` are reported unaugmented as `MISSING_FORECAST`.*

| Metric | Measured Value | Unit | Definition |
| :--- | :--- | :--- | :--- |
| **Total Evaluated Intervals** | **744** / 1,488 | half-hours | **50.0% Exact Coverage** (744 `:00` intervals matched) |
| **Mean Actual Generation** | **11,581.1** | MW | Average actual generation on hourly boundary intervals |
| **Mean Forecast Generation**| **13,421.0** | MW | Average day-ahead forecast generation |
| **Mean Absolute Error (MAE)** | **2,107.2** | MW | Average miss magnitude on hourly boundaries |
| **Root Mean Squared Error (RMSE)**| **2,611.2** | MW | Large miss penalty metric |
| **Forecasting Bias** | **+1,839.9** | MW | **Systematic Overforecast** |

> **Key Takeaway:** Across all methodologies, the day-ahead wind forecast exhibited a statistically significant positive bias of approximately **+1,840 MW** throughout January 2026. A utility trading solely on raw day-ahead forecasts would have been systematically long, suffering balancing mechanism cashout penalties.

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
|  | - Chunked Windows  |    | - Demo Generator    |    | - Resolution Modes     |  |
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
├── Dockerfile                     # Multi-stage production container (Node 20 build -> Python 3.11 runner)
├── docker-compose.yml             # Local orchestration with persistent cache volume (elexon_cache)
├── render.yaml                    # Infrastructure-as-code for Render/Heroku backend deployment
├── vercel.json                    # Configuration for Vercel SPA hosting & API rewrites
├── Procfile                       # Procfile for Heroku/Railway startup
├── pyproject.toml                 # Ruff linting & Pytest configuration
├── .env.example                   # Annotated environment variable template
├── .gitignore                     # Git ignore rules
├── README.md                      # Comprehensive project documentation
├── docs/
│   ├── architecture.md            # Technical architecture specification
│   ├── methodology.md             # Market context, gate closures & metric formulas
│   └── demo-script.md             # 10-minute video presentation guide (Part 1 & Part 2)
├── backend/
│   ├── app/
│   │   ├── main.py                # FastAPI app, lifespan setup & SPA static serving
│   │   ├── core/config.py         # Pydantic BaseSettings configuration
│   │   ├── models/schemas.py      # Typed Pydantic models for API contracts
│   │   ├── services/
│   │   │   ├── elexon_client.py   # Asynchronous HTTPX client for Elexon BMRS
│   │   │   ├── cache_manager.py   # Atomic disk caching and offline support
│   │   │   ├── data_processor.py  # Temporal alignment & cutoff decision rules
│   │   │   └── forecast_service.py# Memoization coordinator
│   │   ├── analytics/metrics.py   # Vectorized quantitative metrics (NumPy)
│   │   └── api/routes.py          # Typed REST API endpoints
│   ├── tests/
│   │   ├── test_metrics.py        # Verified deterministic metric calculations
│   │   ├── test_data_processor.py # Cutoff rules & look-ahead prevention tests
│   │   └── test_api.py            # API endpoint integration tests
│   └── requirements.txt           # Pinned backend dependencies
└── frontend/
    ├── src/
    │   ├── components/            # Header, MetricCard, DateFilter, Table, VintageInspector
    │   ├── charts/                # TimeseriesChart, DailyAccuracy, Diurnal, ErrorHistogram
    │   ├── services/api.ts        # Typed fetch client with base URL handling
    │   ├── types/index.ts         # TypeScript interfaces
    │   ├── utils/formatters.ts    # MW, MWh, Date & Percentage formatters
    │   └── App.tsx                # Main view coordinator & state container
    ├── tests/
    │   ├── setup.ts               # Vitest environment setup & ResizeObserver mock
    │   └── App.test.tsx           # React Testing Library unit tests
    ├── package.json               # Frontend dependencies & scripts
    ├── tsconfig.json              # TypeScript strict configuration
    └── vite.config.ts             # Vite bundler & API dev proxy configuration
```

---

## 5. Forecasting Methodology & Market Cutoff

### 5.1 Day-Ahead Decision Cutoff Rationale
In Great Britain, wholesale day-ahead power auctions on **EPEX SPOT** and **Nord Pool** close order books at **11:00 London local time on Day D-1**.
- Elexon BMRS operates the Balancing Mechanism for physical outturn settlement, but commercial procurement gate closures are established by the power exchanges.
- For each 30-minute delivery interval on day $D$, the system evaluates:
  $$\text{Cutoff Timestamp} = (D - 1)\text{ at 11:00 Europe/London Time}$$
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
- **Step-wise Hourly Block (Default):** For each half-hour delivery interval, the platform maps to its parent forecast hour (`dt.replace(minute=0)`). This mirrors physical trading: a day-ahead procurement bid submitted for an hourly block covers both settlement periods within that hour.
- **Strict Exact Match:** Evaluates only `:00` intervals without parent-hour fallback (50% coverage).

---

## 6. Installation & Local Startup (Windows PowerShell)

### Prerequisites
- Python 3.11+ (installed and in `PATH`)
- Node.js 18+ and npm (installed and in `PATH`)
- PowerShell 5.1+ or PowerShell 7+

### Step 1: Clone Repository
```powershell
git clone https://github.com/wasim000999/gb-wind-forecast-eval-2026.git
cd gb-wind-forecast-eval-2026
```

### Step 2: Backend Setup
```powershell
# Create and activate virtual environment
python -m venv .venv
.venv\Scripts\Activate.ps1

# Install backend dependencies
python -m pip install --upgrade pip
pip install -r backend/requirements.txt
pip install ruff pytest pytest-asyncio

# Start FastAPI backend (runs on http://127.0.0.1:8000)
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
*Backend API and Swagger UI will be live at `http://127.0.0.1:8000/docs`.*

### Step 3: Frontend Setup (in a separate PowerShell terminal)
```powershell
cd frontend
npm install
npm run dev
```
Open **`http://localhost:5173`** in your browser. (The Vite dev server automatically proxies `/api` calls to `http://127.0.0.1:8000`).

---

## 7. Docker Startup

A production-ready multi-stage `Dockerfile` (Node 20 alpine builder + Python 3.11 debian-slim runner, non-root user `appuser:1001`, and healthcheck) and `docker-compose.yml` are provided.

To run with Docker Desktop:
```powershell
# Build and start container in detached mode
docker compose up --build -d

# Check container status
docker compose ps

# View application logs
docker compose logs -f

# Shutdown container
docker compose down
```
*Open `http://localhost:8000` to view the unified application.*

---

## 8. Verification & Testing Commands

### Backend Tests & Linting
```powershell
# Lint with Ruff (must return 'All checks passed!')
ruff check backend

# Run Pytest suite (15 unit and integration tests)
python -m pytest backend/tests -v
```

### Frontend Tests, Typecheck & Production Build
```powershell
cd frontend

# TypeScript strict typecheck
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

---

## 11. Known Limitations & Roadmap

1. **National-Level Aggregation:** Elexon `WINDFOR` and `FUELHH` report Great Britain national totals. Future iterations could incorporate zonal wind forecasts (e.g. Scottish export constraints) to assess transmission bottlenecks.
2. **Weather Model Ingestion:** Currently evaluates Elexon's published wind forecast. Ingesting raw Numerical Weather Prediction (NWP) ensembles (ECMWF, GFS) would allow probabilistic quantile modeling.
3. **Financial Imbalance Modeling:** While this dashboard calculates physical MW/MWh errors, pairing with Elexon System Price (`DISBSAD` / `SBP`) data would enable exact calculation of financial cashout penalties.

---

## 12. Explicit AI Assistance Disclosure

AI-assisted development tools were used to support implementation, debugging, and documentation. The developer reviewed and tested the resulting code and remains responsible for its correctness.
