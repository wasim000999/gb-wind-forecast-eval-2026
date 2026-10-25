# Forecasting Evaluation Methodology & Market Provenance

## 1. Problem Statement & Procurement Context

A UK electricity utility purchasing wholesale electricity must decide how much volume to contract in the **Day-Ahead Wholesale Market** versus how much to leave exposed to the **Intraday Market** and the **Balancing Mechanism (BM)** cashout price.

Because wind power has zero fuel cost and constitutes a large share of Great Britain's generation mix, accurate wind forecasts are critical:
- **Overforecasting ($Forecast > Actual$, $Bias > 0$):**
  If the utility expects high wind generation, it may under-hedge thermal power or over-sell contracted renewable power. When outturn falls short, the utility must buy back energy in the intraday market or pay system imbalance cashout prices, which spike during wind drop-offs.
- **Underforecasting ($Forecast < Actual$, $Bias < 0$):**
  If the utility expects low wind generation, it purchases excess power day-ahead. The resulting long position must be sold back into the balancing mechanism at system sell prices (SSP), causing value erosion.

---

## 2. Great Britain Wholesale Market Gate Closure

In Great Britain, power delivery is settled on 30-minute intervals (48 Settlement Periods per day, numbered 1 through 48).

### Primary Benchmark: Day D-1 at 11:00 London Time
- **Market Mechanism:** Nord Pool GB Day-Ahead Auction and EPEX SPOT GB Day-Ahead Auction.
- **Order Book Gate Closure:** **11:00 London local time on Day D-1**.
- **Procurement Horizon:** For all settlement periods of delivery day $D$ (00:00 to 24:00 local time), bids and offers must be submitted prior to 11:00 on day $D-1$.
- **Rule:** A forecast published at 11:15 or 15:30 on day $D-1$ was **not available** when day-ahead procurement decisions were finalized. Evaluating day-ahead decisions using post-cutoff forecasts introduces **look-ahead leakage**, rendering backtests invalid.

### Supported Cutoff Strategies in This Application
1. `D1_1100` *(Default)*: Day D-1 at 11:00 Europe/London (GB Day-Ahead Auction standard).
2. `D1_1200`: Day D-1 at 12:00 Europe/London (Single Day-Ahead Coupling SDAC standard).
3. `D1_1400`: Day D-1 at 14:00 Europe/London (Bilateral post-clearing schedule).
4. `ROLLING_24H`: 24 hours prior to each delivery interval start (Rolling fixed-lead benchmark).
5. `ROLLING_12H`: 12 hours prior to each delivery interval start (Intraday re-balancing benchmark).

---

## 3. Data Sources & Granularity Bridging

### 3.1 Datasets
- **Actual Generation:** Elexon BMRS endpoint `/datasets/FUELHH/stream`, filtering for `fuelType == "WIND"`.
- **Forecast Generation:** Elexon BMRS endpoint `/datasets/WINDFOR/stream`.

### 3.2 Granularity Mapping
- `FUELHH` actuals are recorded at 30-minute resolution (48 settlement periods per day).
- `WINDFOR` forecasts are produced in 1-hour delivery blocks (24 blocks per day).
- **Mapping Rule:** Each hourly forecast block (`HH:00:00Z`) covers both half-hours within that hour (`HH:00-HH:30`, Settlement Period $2k-1$, and `HH:30-HH:00`, Settlement Period $2k$).
- This accurately reflects trading operations: a day-ahead hourly block purchase draws from the hourly forecast valid before gate closure.

---

## 4. Analytical Metrics & Mathematical Definitions

All metrics are calculated across all eligible valid settlement intervals $i \in \{1, \dots, N\}$ in the reporting period:

### 4.1 Error
$$\text{Error}_i = \text{Forecast}_i - \text{Actual}_i \quad (\text{MW})$$

### 4.2 Mean Absolute Error (MAE)
$$\text{MAE} = \frac{1}{N} \sum_{i=1}^N |\text{Forecast}_i - \text{Actual}_i| \quad (\text{MW})$$
*Measures the average magnitude of forecasting error regardless of direction.*

### 4.3 Root Mean Squared Error (RMSE)
$$\text{RMSE} = \sqrt{\frac{1}{N} \sum_{i=1}^N (\text{Forecast}_i - \text{Actual}_i)^2} \quad (\text{MW})$$
*Penalizes large outlier misses disproportionately compared to small misses.*

### 4.4 Mean Forecasting Error (Bias)
$$\text{Bias} = \frac{1}{N} \sum_{i=1}^N (\text{Forecast}_i - \text{Actual}_i) \quad (\text{MW})$$
- $\text{Bias} > 0$: Systematic **overforecasting** (surplus procurement risk).
- $\text{Bias} < 0$: Systematic **underforecasting** (deficit shortfall risk).

### 4.5 Forecast Coverage
$$\text{Coverage} = \frac{N_{\text{valid}}}{N_{\text{total}}} \times 100\%$$
Where $N_{\text{total}} = 31 \times 48 = 1,488$ intervals for January 2026.

---

## 5. Quantitative Results for January 2026 (Live Elexon Data)

Under the primary GB Day-Ahead gate closure benchmark (`D1_1100`):

| Metric | Measured Value | Unit | Interpretation |
| :--- | :--- | :--- | :--- |
| **Total Intervals** | 1,488 | intervals | Full month of January 2026 (31 days $\times$ 48 SPs) |
| **Valid Evaluated Intervals** | 1,488 | intervals | 100% data coverage |
| **Missing Actuals** | 0 | intervals | Complete outturn in FUELHH |
| **Missing Forecasts** | 0 | intervals | Complete forecast coverage in WINDFOR |
| **Mean Actual Generation** | 11,580.7 | MW | Average GB wind generation outturn |
| **Mean Forecast Generation** | 13,421.0 | MW | Average day-ahead expected generation |
| **Mean Absolute Error (MAE)** | 2,126.1 | MW | Average miss magnitude |
| **Root Mean Squared Error (RMSE)**| 2,620.8 | MW | Volatility penalty metric |
| **Forecasting Bias** | **+1,840.3** | MW | **Systematic Overforecasting** |
| **Total Energy Outturn** | 8,619,520 | MWh | MW $\times$ 0.5h across month |
| **Total Forecast Energy** | 9,984,850 | MWh | Day-ahead contracted expectation |

### Business Insight
In January 2026, the national wind forecast systematically overpredicted generation by an average of **+1,840.3 MW** across the month. A utility that mechanically bought power based solely on the day-ahead forecast would have ended up significantly **long**, having to sell excess power into intraday markets often at discounted cashout prices. Incorporating a de-biasing adjustment or dynamic risk buffer would have prevented substantial imbalance penalties.
