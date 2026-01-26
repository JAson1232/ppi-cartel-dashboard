# Cartel Detection Dashboard

An interactive dashboard for analyzing price rigidity, cartel behavior, and institutional effects on market competition using Producer Price Index (PPI) data.

## 🔍 Overview

This dashboard provides multiple analytical tools for detecting potential cartel behavior and measuring the "Institutional Dividend" — the consumer welfare gains from antitrust enforcement. It combines:

- **Sticky Price Analysis**: Identifying industries with suspicious price rigidity during market crashes
- **Synthetic Control Method (SCM)**: Causal inference to estimate cartel effects
- **CAGR Comparison**: Growth rate analysis across cartel vs. competitive periods

## 📊 Dashboard Modules

### 1. 🇺🇸 US PPI Sticky Price Analysis
**[ppi-analysis.html](ppi-analysis.html)**

Uses the "Sticky Price Test" to identify industries where prices remain rigid during deflationary periods. Features:
- Time series charts for 14 industries (1925-2023)
- Historical era analysis (Great Depression, Oil Crises, 2008 Crisis, COVID-19)
- Automatic flagging of suspicious months
- Industry risk rankings

### 2. 🇿🇦 South Africa Cement Cartel Analysis
**[south-africa-cement.html](south-africa-cement.html)** | **[south-africa-scm.html](south-africa-scm.html)**

Deep-dive into the South African cement cartel case (2000-2009):
- **CAGR Analysis**: Compare price growth during cartel vs. post-cartel periods
- **Synthetic Control Method**: Estimate counterfactual prices using construction input costs as donors
- **Chain-linked PPI series**: 2000-2025 using rebased datasets
- **Consumer Dividend calculation**: Quantify savings from cartel dissolution

Key findings:
- Post-cartel prices are ~21% lower than the synthetic counterfactual
- Average gap of 120.5 index points (consumer savings)

### 3. 🇬🇷 Greek Procurement Analysis (Archived)
**[greek-advanced.html](greek-advanced.html)** | **[greek-eda.html](greek-eda.html)**

Exploratory analysis of Greek public procurement data:
- Bid rotation detection
- HHI concentration metrics
- Single-bidder index
- Benford's Law deviation
- Geographic monopoly mapping

> ⚠️ *These modules are archived for reference and not included in the final research.*

### 4. ⚖️ Cartel Differentiation Tests (Archived)
**[cartel-differentiation.html](cartel-differentiation.html)**

Advanced tests to distinguish natural monopolies from active cartels:
- Rocket & Feather asymmetry test
- Step-Ladder variance screen
- Input cost pass-through analysis

> ⚠️ *This module is archived for reference and not included in the final research.*

## 🚀 Live Demo

**[View Dashboard](https://jason1232.github.io/ppi-cartel-dashboard/)**

## 📁 Project Structure

```
ppi_dashboard/
├── index.html                    # Landing page with module selection
├── styles.css                    # Global dashboard styling
├── serve.py                      # Local development server
│
├── # US PPI Analysis
├── ppi-analysis.html             # US sticky price dashboard
├── dashboard.js                  # Chart logic for US PPI
├── dashboard_data.json           # US PPI data from FRED
├── generate_dashboard_data.py    # Script to regenerate FRED data
│
├── # South Africa Cement Analysis
├── south-africa-cement.html      # CAGR analysis dashboard
├── south-africa-cement.js        # CAGR chart logic
├── south_africa_cement_data.json # SA cement PPI data
├── south-africa-scm.html         # SCM analysis dashboard
├── south-africa-scm.js           # SCM chart logic
├── scm_data_south_africa.json    # SCM results (monthly/annual)
├── table1_scm_weights.png        # Publication-ready weights table
│
├── # Greek Procurement (Archived)
├── greek-advanced.html           # Advanced cartel detection
├── greek-eda.html                # Risk screening EDA
│
├── # Cartel Differentiation (Archived)
├── cartel-differentiation.html   # Differentiation tests
├── cartel-differentiation.js     # Test logic
├── cartel_differentiation_data.json
│
└── analysis/                     # Jupyter notebooks (source analysis)
```

## 🛠️ Local Development

### Prerequisites
- Python 3.8+
- pandas, pandas-datareader (for US data regeneration)

### Run Locally

```bash
cd ppi_dashboard
python serve.py
# Opens http://localhost:8080
```

Or open `index.html` directly in a browser with a local server.

### Regenerate US PPI Data

```bash
pip install pandas pandas-datareader
python generate_dashboard_data.py
```

## 📈 Data Sources

| Dataset | Source | Coverage |
|---------|--------|----------|
| US PPI (14 industries) | [FRED](https://fred.stlouisfed.org/) | 1925-2023 |
| South Africa Cement PPI | Statistics South Africa | 2000-2025 |
| SA Construction Inputs | Statistics South Africa | 2006-2025 |

## 🧮 Methodology

### Sticky Price Test
**Suspicious Month = Market Crash + Industry Sticky**
- Market Crash: Market Average YoY change < -2%
- Industry Sticky: Industry YoY change > -0.5%

### Synthetic Control Method
1. Train Ridge Regression on cartel period (2000-2009) using construction input costs as donors
2. Predict counterfactual prices for post-cartel period
3. Gap = Synthetic - Actual = Consumer Dividend

### Donor Pool (SCM)
| Donor | Weight |
|-------|--------|
| Plumbing | 2.831 |
| Drainage | 0.306 |
| Ironmongery | -0.306 |

## 📚 Theoretical Foundation

The analysis is grounded in established economic literature:

1. **Rotemberg & Saloner (1986)** - Price wars during booms, cartel stability in recessions
2. **Green & Porter (1984)** - Price wars as cartel discipline mechanisms
3. **Stephan (2012)** - Economic downturns and "crisis cartels"
4. **Porter & Zona (1993)** - Bid rigging detection in procurement

## 📜 License

MIT License - Feel free to use and modify.

## 🙏 Acknowledgments

- Federal Reserve Bank of St. Louis (FRED)
- Statistics South Africa
- Chart.js for visualizations
