#!/usr/bin/env python3
"""
PPI Cartel Detection Dashboard - Data Generator
Fetches PPI data from FRED and generates JSON for the interactive dashboard.
"""

import pandas as pd
import pandas_datareader.data as web
import datetime
import json
import os

# Set FRED API Key
os.environ['FRED_API_KEY'] = '4baa61bb2c2c1eebf4352b4f914c6c03'

# =============================================================================
# CONFIGURATION
# =============================================================================

SERIES_MAP = {
    'Market_Average': 'PPIACO',
    'Steel': 'WPU1017',
    'Cement': 'WPU1322',
    'Glass': 'WPU131',
    'Lumber': 'WPU081',
    'Chemicals': 'WPU061',
    'Rubber': 'WPU07',
    'Paper': 'WPU091',
    'Copper': 'WPU102',
    'Aluminum': 'WPU1023',
    'Fuel_Oil': 'WPU0573',
    'Coal': 'WPU0511',
    'Grains': 'WPU012',
    'Livestock': 'WPU014',
}

# Historical eras with descriptions
HISTORICAL_ERAS = {
    'Great Depression': {
        'start': '1929-01-01',
        'end': '1939-12-31',
        'color': '#8B0000',
        'description': 'Stock market crash and decade-long economic depression. Known for cartel behavior in steel, cement, and glass.'
    },
    'Post-War Boom': {
        'start': '1945-01-01',
        'end': '1955-12-31',
        'color': '#228B22',
        'description': 'Economic expansion after WWII. Industrial production surged with potential oligopolistic pricing.'
    },
    'Oil Crisis I': {
        'start': '1973-01-01',
        'end': '1975-12-31',
        'color': '#FF8C00',
        'description': 'OPEC oil embargo caused energy prices to quadruple. Major deflationary shock to non-oil sectors.'
    },
    'Oil Crisis II': {
        'start': '1979-01-01',
        'end': '1982-12-31',
        'color': '#FF6347',
        'description': 'Iranian Revolution and Iran-Iraq War disrupted oil supplies. Stagflation period.'
    },
    'Dot-Com Bust': {
        'start': '2000-01-01',
        'end': '2003-12-31',
        'color': '#9932CC',
        'description': 'Tech bubble collapse. Manufacturing sector experienced price deflation.'
    },
    'Financial Crisis': {
        'start': '2007-01-01',
        'end': '2010-12-31',
        'color': '#DC143C',
        'description': 'Global financial crisis. Commodity prices crashed then recovered. Major test of price stickiness.'
    },
    'COVID-19 Pandemic': {
        'start': '2020-01-01',
        'end': '2022-12-31',
        'color': '#4169E1',
        'description': 'Global pandemic disrupted supply chains. Initial deflation followed by historic inflation.'
    }
}

# Cartel detection thresholds
MARKET_CRASH_THRESHOLD = -2.0  # Market YoY change below this = crash
INDUSTRY_STICKY_THRESHOLD = -0.5  # Industry YoY change above this during crash = sticky


def fetch_data():
    """Fetch PPI data from FRED."""
    print("Fetching data from FRED...")
    start_date = datetime.datetime(1925, 1, 1)
    end_date = datetime.datetime(2023, 12, 31)
    
    df = web.DataReader(list(SERIES_MAP.values()), 'fred', start_date, end_date)
    df.columns = list(SERIES_MAP.keys())
    print(f"Loaded {len(df)} rows")
    return df


def calculate_yoy_change(df):
    """Calculate Year-over-Year percentage change."""
    return df.pct_change(12) * 100


def find_suspicious_months(df_pct, industry, market_col='Market_Average'):
    """Find months where industry shows sticky prices during market crash."""
    market_crash = df_pct[market_col] < MARKET_CRASH_THRESHOLD
    industry_sticky = df_pct[industry] > INDUSTRY_STICKY_THRESHOLD
    
    suspicious = df_pct[market_crash & industry_sticky].copy()
    suspicious['is_suspicious'] = True
    
    return suspicious.index.tolist()


def generate_time_series_data(df, df_pct):
    """Generate time series data for each industry."""
    data = {}
    
    for industry in df.columns:
        if industry == 'Market_Average':
            continue
            
        industry_data = []
        suspicious_months = find_suspicious_months(df_pct, industry)
        
        for date in df.index:
            if pd.notna(df.loc[date, industry]) and pd.notna(df_pct.loc[date, industry]):
                industry_data.append({
                    'date': date.strftime('%Y-%m-%d'),
                    'price_index': float(df.loc[date, industry]),
                    'yoy_change': float(df_pct.loc[date, industry]) if pd.notna(df_pct.loc[date, industry]) else None,
                    'market_yoy': float(df_pct.loc[date, 'Market_Average']) if pd.notna(df_pct.loc[date, 'Market_Average']) else None,
                    'is_suspicious': date in suspicious_months
                })
        
        data[industry] = industry_data
    
    return data


def calculate_industry_stats(df_pct):
    """Calculate summary statistics for each industry."""
    stats = {}
    
    for industry in df_pct.columns:
        if industry == 'Market_Average':
            continue
            
        suspicious_months = find_suspicious_months(df_pct, industry)
        
        # Group suspicious months by year
        suspicious_by_year = {}
        for date in suspicious_months:
            year = date.year
            suspicious_by_year[year] = suspicious_by_year.get(year, 0) + 1
        
        # Get data availability
        first_valid = df_pct[industry].first_valid_index()
        last_valid = df_pct[industry].last_valid_index()
        
        stats[industry] = {
            'total_suspicious_months': len(suspicious_months),
            'suspicious_by_year': suspicious_by_year,
            'data_start': first_valid.strftime('%Y-%m') if first_valid else None,
            'data_end': last_valid.strftime('%Y-%m') if last_valid else None,
            'avg_yoy_change': float(df_pct[industry].mean()) if not df_pct[industry].isna().all() else None,
            'std_yoy_change': float(df_pct[industry].std()) if not df_pct[industry].isna().all() else None,
        }
    
    return stats


def calculate_era_analysis(df_pct):
    """Analyze each historical era."""
    era_analysis = {}
    
    for era_name, era_info in HISTORICAL_ERAS.items():
        try:
            subset = df_pct.loc[era_info['start']:era_info['end']]
        except:
            continue
            
        if len(subset) == 0:
            continue
            
        era_data = {
            'name': era_name,
            'start': era_info['start'],
            'end': era_info['end'],
            'color': era_info['color'],
            'description': era_info['description'],
            'industries': {}
        }
        
        for industry in df_pct.columns:
            if industry == 'Market_Average':
                continue
                
            industry_subset = subset[industry].dropna()
            if len(industry_subset) < 6:
                continue
                
            # Count suspicious months in this era
            market_crash = subset['Market_Average'] < MARKET_CRASH_THRESHOLD
            industry_sticky = subset[industry] > INDUSTRY_STICKY_THRESHOLD
            suspicious_count = int((market_crash & industry_sticky).sum())
            
            era_data['industries'][industry] = {
                'suspicious_months': suspicious_count,
                'avg_yoy_change': float(industry_subset.mean()),
                'data_points': len(industry_subset)
            }
        
        era_analysis[era_name] = era_data
    
    return era_analysis


def main():
    """Generate all dashboard data and save to JSON."""
    print("=" * 60)
    print("PPI CARTEL DETECTION DASHBOARD - DATA GENERATOR")
    print("=" * 60)
    
    # Fetch and process data
    df = fetch_data()
    df_pct = calculate_yoy_change(df)
    
    # Generate all data components
    print("\nGenerating time series data...")
    time_series = generate_time_series_data(df, df_pct)
    
    print("Calculating industry statistics...")
    industry_stats = calculate_industry_stats(df_pct)
    
    print("Analyzing historical eras...")
    era_analysis = calculate_era_analysis(df_pct)
    
    # Compile dashboard data
    dashboard_data = {
        'metadata': {
            'generated_at': datetime.datetime.now().isoformat(),
            'data_start': df.index.min().strftime('%Y-%m-%d'),
            'data_end': df.index.max().strftime('%Y-%m-%d'),
            'industries': [col for col in df.columns if col != 'Market_Average'],
            'thresholds': {
                'market_crash': MARKET_CRASH_THRESHOLD,
                'industry_sticky': INDUSTRY_STICKY_THRESHOLD
            }
        },
        'series_map': SERIES_MAP,
        'historical_eras': HISTORICAL_ERAS,
        'time_series': time_series,
        'industry_stats': industry_stats,
        'era_analysis': era_analysis,
        'market_average': [
            {
                'date': date.strftime('%Y-%m-%d'),
                'price_index': float(df.loc[date, 'Market_Average']) if pd.notna(df.loc[date, 'Market_Average']) else None,
                'yoy_change': float(df_pct.loc[date, 'Market_Average']) if pd.notna(df_pct.loc[date, 'Market_Average']) else None
            }
            for date in df.index
            if pd.notna(df.loc[date, 'Market_Average'])
        ]
    }
    
    # Save to JSON
    output_path = os.path.join(os.path.dirname(__file__), 'dashboard_data.json')
    with open(output_path, 'w') as f:
        json.dump(dashboard_data, f, indent=2)
    
    print(f"\n✅ Dashboard data saved to: {output_path}")
    print(f"   - {len(dashboard_data['metadata']['industries'])} industries")
    print(f"   - {len(dashboard_data['historical_eras'])} historical eras")
    print(f"   - Data range: {dashboard_data['metadata']['data_start']} to {dashboard_data['metadata']['data_end']}")
    
    return dashboard_data


if __name__ == '__main__':
    main()
