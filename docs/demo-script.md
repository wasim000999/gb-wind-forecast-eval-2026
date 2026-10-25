# 10-Minute Video Demonstration Script

> **Assignment:** REint Full Stack SWE Challenge v4  
> **Repository:** [https://github.com/wasim000999/gb-wind-forecast-eval-2026](https://github.com/wasim000999/gb-wind-forecast-eval-2026)  
> **Total Duration:** 10:00 maximum  
> - **Part 1 (0:00 - 5:00):** Customer & Product Demonstration (Commercial Wholesale Procurement)  
> - **Part 2 (5:00 - 10:00):** Technical Architecture, Data Integrity & Engineering Practices  

---

## Part 1: Customer-Oriented Product Demonstration (Max 5 Minutes)

### [0:00 - 0:50] The Commercial Electricity Procurement Challenge
- **Visual:** Open browser at `http://localhost:8000` (or deployed URL). Hover over the dashboard header.
- **Narrative:**
  > "Hello. Today I am demonstrating the GB Wholesale Electricity Wind Forecast Evaluation Platform.
  >
  > Our client is a UK energy utility purchasing power in the Great Britain wholesale Day-Ahead market. Because wind generation has near-zero marginal cost, it forms the foundation of our supply stack. However, wind generation is inherently volatile.
  >
  > If our trading desk relies on a **systematically overforecasted** model, we buy too little conventional power and must scramble to buy deficit volume in the balancing mechanism at cashout prices that spike during wind lulls. Conversely, **underforecasting** forces us to purchase excess power that we must sell back into the market at discounted system sell prices.
  >
  > This platform evaluates national wind forecast accuracy against actual outturn from official Elexon BMRS data for the complete month of **January 2026**."

### [0:50 - 2:00] Executive Overview & Key Metrics
- **Visual:** Point out the Data Provenance pill (`Elexon Live / Cache`), the Cutoff dropdown (`D-1 11:00 London Time`), the Resolution dropdown (`Hourly Block`), and the 6 KPI cards.
- **Narrative:**
  > "Looking at our January 2026 Executive Overview:
  > - We evaluated all **1,488 half-hour settlement periods** across the 31 days of January, achieving **100% data coverage**.
  > - Total wind energy generated was **8.62 million MWh**, averaging **11,580.7 MW** per settlement period.
  > - However, our day-ahead forecasts expected **9.98 million MWh**, averaging **13,421.0 MW**.
  > - This produced a **Mean Absolute Error (MAE)** of **2,126.1 MW** and an **RMSE** of **2,620.8 MW**.
  > - Most crucially, notice the **Bias** metric: **+1,840.3 MW**. This confirms that across January 2026, day-ahead forecasts systematically overpredicted generation. Rather than bidding blindly on raw forecasts, our procurement team can now quantify this +1,840 MW surplus risk and apply a de-biasing adjustment before submitting auction bids."

### [2:00 - 3:15] Interactive Timeseries & Resolution Analysis
- **Visual:** Scroll down to the **Timeseries Chart**. Show the solid green actuals vs the dashed purple forecast line. Demonstrate the brush tool and quick date filters ("Week 1", "Week 2"). Hover over a storm peak on Jan 9.
- **Narrative:**
  > "Here in the primary timeseries, we inspect generation outturn hour by hour.
  > - The green solid line represents actual half-hourly outturn from Elexon's `FUELHH` dataset.
  > - The purple dashed line is the day-ahead forecast from `WINDFOR`.
  > - Using the quick filters, we can isolate weather events: for example, the major storm on January 8th to 10th where generation exceeded 18,000 MW, or the drop-off on January 28th where generation plunged under 5,000 MW.
  > - Notice the **Resolution selector** in the header: Elexon publishes `WINDFOR` forecasts in 1-hour blocks, while `FUELHH` settles every 30 minutes. In our default **Hourly Block mode**, we apply the forecast across both settlement periods, evaluating all 1,488 intervals. When switching to **Strict Exact Match**, we evaluate only the 744 boundary intervals. Notice how the Bias remains virtually identical at +1,839.9 MW, confirming that our findings are statistically robust and not an artifact of mapping."

### [3:15 - 4:15] Day-Ahead Gate Closure & Vintage Inspector
- **Visual:** Click on the **"Forecast Vintage Inspector"** tab. Select `2026-01-02 12:00 UTC (SP 25)`. Show the timeline and table.
- **Narrative:**
  > "Now let's examine the heart of our methodology: **Decision Cutoff Enforcement**.
  >
  > In the GB market, wholesale Day-Ahead auctions on EPEX SPOT and Nord Pool close order books at **11:00 London local time on Day D-1**. Any forecast published after 11:00 on D-1 was not available when our procurement commitments were locked in.
  >
  > Here in the Vintage Inspector for January 2nd at 12:00:
  > - We see forecasts published from 48 hours prior.
  > - At 09:30 on D-1, a forecast predicted 17,739 MW. Because this was the latest forecast published before the 11:00 cutoff, our system selects it as the valid **Selected Day-Ahead Forecast**.
  > - Forecasts published later that afternoon—such as at 15:30 and 22:30—are clearly marked in red as **EXCLUDED (LOOK-AHEAD LEAKAGE)**. Including them would produce falsely optimistic backtest results."

### [4:15 - 5:00] Accuracy Distributions & Data Export
- **Visual:** Switch to **"Accuracy & Distributions"** tab, highlight the Diurnal curve and Error Histogram. Switch to **"Interval Records"** and click **"Export CSV"**.
- **Narrative:**
  > "In the Accuracy tab:
  > - The **Diurnal Profile** shows performance across the 48 daily settlement periods, proving that forecast bias remains consistent across morning and evening peak demand hours.
  > - The **Error Histogram** visualizes the distribution, showing the skew toward positive error.
  > - Finally, in the **Interval Records** tab, energy analysts can search, sort by error magnitude, or click **Export CSV** to download all 1,488 evaluated records for downstream quantitative trading models."

---

## Part 2: Technical Walkthrough & Engineering Practices (Max 5 Minutes)

### [5:00 - 6:00] Architecture & Technology Stack
- **Visual:** Show VS Code editor with project structure, `pyproject.toml`, and `docs/architecture.md`.
- **Narrative:**
  > "Welcome to Part 2. Let's look at the technical architecture.
  > - We implemented a clean monorepo separating a **Python FastAPI** backend from a **React TypeScript** frontend.
  > - **Backend:** Python 3.11+, FastAPI, Pydantic v2 for strict runtime schema validation, and NumPy/Pandas for vectorized calculations.
  > - **Frontend:** React 18, TypeScript in strict mode, Vite 5, Tailwind CSS for neutral enterprise styling, and Recharts for responsive SVG visualization.
  > - **Engineering Standards:** Multi-stage Dockerfile, Docker Compose, Ruff linting, and automated GitHub Actions CI running on every commit."

### [6:00 - 7:00] Elexon Ingestion & Granularity Bridging
- **Visual:** Open `backend/app/services/elexon_client.py` and `backend/app/services/data_processor.py`.
- **Narrative:**
  > "Let's examine how data is ingested:
  > - `ElexonClient` uses asynchronous `httpx.AsyncClient` with automated exponential backoff on HTTP 429 rate limits and 5xx errors.
  > - It pulls `FUELHH/stream`, filtering for `fuelType == 'WIND'`, and `WINDFOR/stream` for forecast vintages.
  > - A critical domain insight: Elexon's `WINDFOR` publishes forecasts in **1-hour blocks**, while `FUELHH` settles in **30-minute intervals**.
  > - In `DataProcessor`, our mapping logic transparently bridges these streams without discarding the half-hourly granularity of actual outturn. We also provide strict unaugmented matching so analysts can evaluate either perspective."

### [7:00 - 8:00] Look-Ahead Prevention & Configurable Gate Closures
- **Visual:** Highlight `calculate_cutoff_timestamp` and `process_intervals` in `data_processor.py`.
- **Narrative:**
  > "Look-ahead bias is strictly prevented in `DataProcessor`:
  > - For delivery day $D$, the cutoff timestamp is computed in local `Europe/London` time (accounting for BST daylight saving transitions where applicable).
  > - Candidate forecasts are filtered: only those with `publishTime <= cutoff_time` are eligible.
  > - The latest eligible forecast is selected via `max(candidates, key=lambda x: x['publishTime'])`.
  > - The cutoff rule is dynamically configurable: users can switch between `D1_1100` (GB DAM standard), `D1_1200` (Pan-European standard), or rolling lead times like 24 hours ahead. In-memory memoization ensures switching cutoff rules takes less than 5 milliseconds."

### [8:00 - 9:00] Automated Testing & Quality Assurance
- **Visual:** Terminal running `python -m pytest backend/tests` and `cd frontend && npm run test`.
- **Narrative:**
  > "Quality engineering is enforced throughout:
  > - **Backend Test Suite:** 14 tests in Pytest verifying API health, deterministic metric formulas against known mathematical values, empty dataset handling, timezone awareness, and prevention of look-ahead leakage. All 14 tests pass in under 6 seconds.
  > - **Frontend Test Suite:** Vitest and React Testing Library tests verifying dashboard rendering, KPI calculations, and tab navigation.
  > - **Code Quality:** Ruff linting is configured in `pyproject.toml` with zero warnings, and TypeScript compiles in strict mode with zero errors."

### [9:00 - 10:00] Containerization, Deployment & Wrap-Up
- **Visual:** Show `Dockerfile`, `docker-compose.yml`, and `render.yaml`.
- **Narrative:**
  > "For deployment:
  > - Our **Dockerfile** uses a multi-stage build: Stage 1 builds the Vite React production bundle into static assets; Stage 2 installs Python dependencies in a lightweight Debian slim image and serves both the FastAPI endpoints and the SPA bundle on port 8000.
  > - A non-root user (`appuser:1001`) and curl healthcheck are configured for production container security.
  > - `docker-compose.yml` mounts a persistent cache volume so that downloaded Elexon records are preserved between restarts.
  > - The application is also pre-configured for one-click deployment to Vercel (via `vercel.json`) and Render/Heroku (via `render.yaml` and `Procfile`).
  >
  > In conclusion, this prototype delivers a defensible, production-quality solution tailored to the UK wholesale electricity market. Thank you!"
