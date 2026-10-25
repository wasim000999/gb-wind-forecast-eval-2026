# Video Demonstration Script (10 Minutes Total)

This document provides the structured speaking script and on-screen walkthrough for the video demonstration.

- **Part 1 (0:00 - 5:00):** Customer-Oriented Product Demonstration (Energy Wholesale Procurement Focus).
- **Part 2 (5:00 - 10:00):** Technical Architecture, Engineering Practices & Code Review.

---

## Part 1: Customer-Oriented Product Demonstration (Max 5 Minutes)

### 0:00 - 0:45 | Introduction & Problem Context
- **Screen:** Open browser to the dashboard at `http://localhost:8000` (or deployed URL).
- **Spoken:**
  > "Hello! Today I'm demonstrating the GB Wind Generation Forecast Evaluation Platform, built for an electricity utility procuring power in Great Britain's wholesale day-ahead market.
  >
  > In electricity procurement, wind generation has zero marginal fuel cost, making it the bedrock of our day-ahead purchasing decisions. However, wind is inherently intermittent. If our day-ahead purchasing models rely on flawed or biased forecasts, the financial consequences are severe:
  > - An **overforecast** leaves the utility short on physical energy, forcing us to buy back deficit volume at volatile balancing cashout prices.
  > - An **underforecast** leaves us purchasing too much conventional power, dumping the excess into the system at depressed prices.
  >
  > This platform evaluates national-level wind forecast accuracy against actual generation outturn from Elexon for the complete January 2026 delivery window."

### 0:45 - 2:00 | Executive Overview & Primary Metrics
- **Screen:** Point out the top navigation bar, the data provenance badge (`Elexon Live / Cache`), and the six KPI cards.
- **Spoken:**
  > "Looking at our January 2026 Executive Overview:
  > - We evaluated all **1,488 half-hour settlement periods** across the 31 days of January, achieving **100% data coverage**.
  > - Total wind energy generated was **8.62 million MWh**, averaging **11,580.7 MW** per half-hour.
  > - However, our day-ahead forecast models expected **9.98 million MWh**, averaging **13,421.0 MW**.
  > - This resulted in a **Mean Absolute Error (MAE)** of **2,126.1 MW** and an **RMSE** of **2,620.8 MW**.
  > - Most crucially, notice the **Bias** metric: **+1,840.3 MW**. This tells our trading desk that across January 2026, the day-ahead wind forecasts were systematically overforecasting. Knowing this systematic bias allows our procurement team to apply a de-biasing haircut before submitting bids."

### 2:00 - 3:00 | Timeseries & Filter Interactions
- **Screen:** Scroll down to the **Forecast vs Actual Timeseries Chart**. Show the emerald line (Actuals) vs the indigo dashed line (Forecasts). Demonstrate the zoom/brush tool and quick date filters (e.g. click "Week 1", "Week 2"). Hover over a peak to show the tooltip.
- **Spoken:**
  > "Here in the primary timeseries, we can inspect generation outturn hour by hour.
  > - The green solid line represents actual half-hourly outturn from Elexon's `FUELHH` dataset.
  > - The purple dashed line is the day-ahead forecast from `WINDFOR`.
  > - When I use the brush tool or the quick week filters, we can zoom into specific weather events, such as the major wind storm on January 8th to 10th where generation exceeded 18,000 MW, or the drop-off on January 28th where generation plummeted under 5,000 MW.
  > - Every data point is interactive: clicking any point instantly takes us to inspect its forecast publications."

### 3:00 - 4:00 | Day-Ahead Decision Cutoff & Vintage Inspector
- **Screen:** Navigate to the **"Forecast Vintage Inspector"** tab. Select `2026-01-02 12:00 UTC (SP 25)`.
- **Spoken:**
  > "Now let's examine the heart of our forecasting methodology: **Decision Cutoff Enforcement**.
  >
  > In the GB market, Day-Ahead wholesale auctions on EPEX SPOT and Nord Pool close order books at **11:00 London local time on Day D-1**. Therefore, any forecast published after 11:00 on D-1 was not available to our trading desk when day-ahead bids were submitted.
  >
  > Here in the Vintage Inspector for January 2nd at 12:00:
  > - We see forecasts published as early as 48 hours prior.
  > - At 09:30 on D-1, a forecast was published predicting 17,739 MW. Because this was the latest forecast published before the 11:00 cutoff, our system selects it as the valid **Day-Ahead Decision Forecast**.
  > - Notice the forecasts published later that afternoon—at 15:30 and 22:30. These are clearly marked in red as **EXCLUDED (LOOK-AHEAD LEAKAGE)**. Including them would produce falsely optimistic backtest results.
  > - The evolution chart above tracks how meteorological models updated as the weather front approached."

### 4:00 - 5:00 | Accuracy Distributions & Table Export
- **Screen:** Switch to **"Accuracy & Distributions"** tab, showing the Daily Breakdown, Diurnal Curve, and Error Histogram. Then switch to **"Interval Records"** and show the CSV Export.
- **Spoken:**
  > "In the Accuracy tab:
  > - The **Diurnal Profile** breaks down performance across the 48 daily settlement periods, showing that forecast accuracy remains consistent across morning and evening demand peaks.
  > - The **Error Histogram** shows the skew toward positive error (overforecasting), with 90% of intervals falling between -1,200 MW and +5,100 MW.
  > - Finally, in the **Interval Records** tab, energy analysts can filter by status, sort by error magnitude, or click **Export CSV** to download all 1,488 evaluated records for downstream quantitative modelling."

---

## Part 2: Technical Review & Engineering Practices (Max 5 Minutes)

### 5:00 - 6:00 | Architecture & Technology Stack
- **Screen:** Show the VS Code editor with the project structure and `docs/architecture.md`.
- **Spoken:**
  > "Welcome to Part 2. Let's look at the technical architecture.
  > - We implemented a clean, maintainable monorepo separating a **Python FastAPI** backend from a **React TypeScript** frontend.
  > - **Backend:** Python 3.11, FastAPI, Pydantic v2 for strict runtime schema validation, and NumPy/Pandas for vectorized calculations.
  > - **Frontend:** React 18, TypeScript, Vite, Tailwind CSS for modern enterprise styling, and Recharts for responsive SVG visualization.
  > - **DevOps:** Multi-stage Dockerfile, Docker Compose, and GitHub Actions CI running linting and tests on every commit."

### 6:00 - 7:00 | Elexon Integration & Granularity Bridging
- **Screen:** Open `backend/app/services/elexon_client.py` and `backend/app/services/data_processor.py`.
- **Spoken:**
  > "Let's examine how data is ingested and processed:
  > - `ElexonClient` uses asynchronous `httpx.AsyncClient` with automated exponential backoff on HTTP 429 rate limits and 5xx errors.
  > - It pulls `FUELHH/stream`, filtering for `fuelType == 'WIND'`, and `WINDFOR/stream` for forecast vintages.
  > - A critical domain insight: Elexon's `WINDFOR` publishes forecasts in **1-hour blocks**, while `FUELHH` settles in **30-minute intervals**.
  > - In `DataProcessor`, our mapping logic maps each 30-minute settlement period (`00:00`, `00:30`, etc.) to its corresponding parent forecast hour. This bridges the streams accurately without discarding the half-hourly granularity of actual outturn."

### 7:00 - 8:00 | Look-Ahead Prevention & Configurable Gate Closures
- **Screen:** Highlight `calculate_cutoff_timestamp` and `process_intervals` in `data_processor.py`.
- **Spoken:**
  > "Look-ahead bias is strictly prevented in `DataProcessor`:
  > - For delivery day $D$, the cutoff timestamp is computed in local `Europe/London` time (accounting for BST daylight saving transitions where applicable).
  > - The candidate forecasts for each interval are filtered: only those with `publishTime <= cutoff_time` are eligible.
  > - The latest eligible forecast is selected via `max(candidates, key=lambda x: x['publishTime'])`.
  > - Furthermore, the cutoff rule is dynamically configurable: users can switch between `D1_1100` (GB DAM standard), `D1_1200` (Pan-European standard), or rolling lead times like 24 hours ahead. Switching cutoff rules is instantaneous thanks to in-memory memoization."

### 8:00 - 9:00 | Testing & Quality Assurance
- **Screen:** Terminal running `python -m pytest backend/tests` and `cd frontend && npm run test`.
- **Spoken:**
  > "Quality engineering is enforced throughout:
  > - **Backend Test Suite:** 14 tests in Pytest verifying API health, deterministic metric formulas against known mathematical values, empty dataset handling, timezone awareness, and prevention of look-ahead leakage. All 14 tests execute in under 6 seconds.
  > - **Frontend Test Suite:** Vitest and React Testing Library tests verifying dashboard rendering, KPI calculations, and tab navigation.
  > - **Code Quality:** Ruff linting is configured in `pyproject.toml` with zero warnings, and TypeScript compiles in strict mode."

### 9:00 - 10:00 | Containerization, Deployment & Wrap-Up
- **Screen:** Show `Dockerfile`, `docker-compose.yml`, and `render.yaml`.
- **Spoken:**
  > "For deployment:
  > - Our **Dockerfile** uses a multi-stage build: Stage 1 builds the Vite React production bundle into static assets; Stage 2 installs Python dependencies in a lightweight Debian slim image and serves both the FastAPI endpoints and the SPA bundle on port 8000.
  > - A non-root user (`appuser:1001`) and curl healthcheck are configured for production container security.
  > - `docker-compose.yml` mounts a persistent cache volume so that downloaded Elexon records are preserved between restarts.
  > - The application is also pre-configured for one-click deployment to Vercel (via `vercel.json`) and Render/Heroku (via `render.yaml` and `Procfile`).
  >
  > In conclusion, this prototype delivers a defensible, production-quality solution tailored to the UK wholesale electricity market. Thank you!"
