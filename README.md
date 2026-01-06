# PPI Cartel Detection Dashboard

An interactive dashboard for analyzing "sticky prices" in US Producer Price Index (PPI) data to detect potential cartel behavior.

## 🔍 What It Does

This dashboard uses the **"Sticky Price" Test** to identify industries where prices remain rigid during deflationary periods when market-wide prices are falling. This is a classic economic indicator of potential price-fixing agreements.

## 📊 Features

- **Time Series Charts**: View YoY price changes for 13 industries from 1925-2023
- **Historical Era Analysis**: Compare behavior during Great Depression, Oil Crises, 2008 Financial Crisis, COVID-19
- **Suspicious Month Detection**: Automatically flags months where industry prices stayed high while market crashed
- **Industry Rankings**: See which industries show the most "sticky" behavior
- **Interactive Filters**: Filter by industry, era, chart type, and severity

## 🚀 Live Demo

**[View Dashboard](https://YOUR_USERNAME.github.io/ppi-cartel-dashboard/)**

## 📁 Files

- `index.html` - Main dashboard page
- `styles.css` - Dashboard styling
- `dashboard.js` - Interactive chart logic
- `dashboard_data.json` - Pre-generated data from FRED
- `generate_dashboard_data.py` - Python script to regenerate data

## 🛠️ Local Development

### Prerequisites
- Python 3.8+
- pandas, pandas-datareader

### Generate Fresh Data

```bash
pip install pandas pandas-datareader
python generate_dashboard_data.py
```

### Run Locally

```bash
python serve.py
# Opens http://localhost:8080
```

Or simply open `index.html` in your browser (with a local server for CORS).

## 📈 Data Source

All data is sourced from the [Federal Reserve Economic Data (FRED)](https://fred.stlouisfed.org/):

| Industry | FRED Series | Data Range |
|----------|-------------|------------|
| Market Average | PPIACO | 1925-2023 |
| Steel | WPU1017 | 1939-2023 |
| Cement | WPU1322 | 1971-2023 |
| Glass | WPU131 | 1947-2023 |
| Lumber | WPU081 | 1926-2023 |
| Chemicals | WPU061 | 1933-2023 |
| And 7 more... | | |

## 🧮 Methodology

**Suspicious Month = Market Crash + Industry Sticky**

- **Market Crash**: Market Average YoY change < -2%
- **Industry Sticky**: Industry YoY change > -0.5%

Industries that maintain prices during crashes may indicate:
1. Price-fixing agreements (cartels)
2. Oligopolistic market power
3. Long-term contracts
4. Government price controls

## 📜 License

MIT License - Feel free to use and modify.

## 🙏 Acknowledgments

- Federal Reserve Bank of St. Louis (FRED)
- Chart.js for visualizations
