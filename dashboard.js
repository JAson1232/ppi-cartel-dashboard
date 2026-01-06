/**
 * PPI Cartel Detection Dashboard - JavaScript
 */

let dashboardData = null;
let mainChart = null;
let rankingsChart = null;

// Industry colors
const INDUSTRY_COLORS = {
    'Steel': '#ef4444',
    'Cement': '#f97316',
    'Glass': '#eab308',
    'Lumber': '#22c55e',
    'Chemicals': '#06b6d4',
    'Rubber': '#8b5cf6',
    'Paper': '#ec4899',
    'Copper': '#f59e0b',
    'Aluminum': '#6366f1',
    'Fuel_Oil': '#14b8a6',
    'Coal': '#64748b',
    'Grains': '#84cc16',
    'Livestock': '#a855f7',
    'Market_Average': '#6b7280'
};

// Initialize dashboard
async function initDashboard() {
    try {
        const response = await fetch('dashboard_data.json');
        dashboardData = await response.json();
        
        populateControls();
        updateHeaderStats();
        renderEraCards();
        renderRankings();
        renderSuspiciousGrid();
        updateMainChart();
        
        // Add event listeners
        document.getElementById('industrySelect').addEventListener('change', updateMainChart);
        document.getElementById('eraSelect').addEventListener('change', updateMainChart);
        document.getElementById('chartType').addEventListener('change', updateMainChart);
        document.getElementById('showSuspicious').addEventListener('change', updateMainChart);
        document.getElementById('showEraOverlay').addEventListener('change', updateMainChart);
        document.getElementById('searchSuspicious').addEventListener('input', filterSuspiciousGrid);
        document.getElementById('filterSeverity').addEventListener('change', filterSuspiciousGrid);
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        document.body.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; color: #f1f5f9;">
                <h1>⚠️ Data Not Found</h1>
                <p style="margin-top: 16px; color: #94a3b8;">Please run generate_dashboard_data.py first to generate the data.</p>
                <code style="margin-top: 16px; background: #1e293b; padding: 12px 24px; border-radius: 8px;">
                    python generate_dashboard_data.py
                </code>
            </div>
        `;
    }
}

function populateControls() {
    // Populate industry select
    const industrySelect = document.getElementById('industrySelect');
    dashboardData.metadata.industries.forEach(industry => {
        const option = document.createElement('option');
        option.value = industry;
        option.textContent = industry.replace('_', ' ');
        industrySelect.appendChild(option);
    });
    
    // Populate era select
    const eraSelect = document.getElementById('eraSelect');
    Object.keys(dashboardData.historical_eras).forEach(era => {
        const option = document.createElement('option');
        option.value = era;
        option.textContent = era;
        eraSelect.appendChild(option);
    });
}

function updateHeaderStats() {
    const stats = dashboardData.industry_stats;
    let totalSuspicious = 0;
    let highRiskCount = 0;
    
    Object.values(stats).forEach(s => {
        totalSuspicious += s.total_suspicious_months;
        if (s.total_suspicious_months >= 50) highRiskCount++;
    });
    
    document.getElementById('headerStats').innerHTML = `
        <div class="stat-card">
            <div class="value">${dashboardData.metadata.industries.length}</div>
            <div class="label">Industries</div>
        </div>
        <div class="stat-card danger">
            <div class="value">${totalSuspicious.toLocaleString()}</div>
            <div class="label">Suspicious Months</div>
        </div>
        <div class="stat-card warning">
            <div class="value">${highRiskCount}</div>
            <div class="label">High Risk</div>
        </div>
        <div class="stat-card">
            <div class="value">${Object.keys(dashboardData.historical_eras).length}</div>
            <div class="label">Eras Analyzed</div>
        </div>
    `;
}

function renderEraCards() {
    const container = document.getElementById('eraCards');
    container.innerHTML = '';
    
    Object.entries(dashboardData.era_analysis).forEach(([eraName, era]) => {
        // Calculate total suspicious months for this era
        let totalSuspicious = 0;
        let topIndustry = { name: '', count: 0 };
        
        Object.entries(era.industries).forEach(([ind, data]) => {
            totalSuspicious += data.suspicious_months;
            if (data.suspicious_months > topIndustry.count) {
                topIndustry = { name: ind, count: data.suspicious_months };
            }
        });
        
        const card = document.createElement('div');
        card.className = 'era-card';
        card.dataset.era = eraName;
        card.innerHTML = `
            <div class="era-card-header">
                <h3>${eraName}</h3>
                <div class="era-indicator" style="background: ${era.color}"></div>
            </div>
            <div class="era-card-dates">${era.start.slice(0, 4)} - ${era.end.slice(0, 4)}</div>
            <div class="era-card-description">${era.description}</div>
            <div class="era-card-stats">
                <div class="era-stat">
                    <div class="value" style="color: ${era.color}">${totalSuspicious}</div>
                    <div class="label">Suspicious</div>
                </div>
                <div class="era-stat">
                    <div class="value">${Object.keys(era.industries).length}</div>
                    <div class="label">Industries</div>
                </div>
                <div class="era-stat">
                    <div class="value">${topIndustry.name || 'N/A'}</div>
                    <div class="label">Most Suspicious</div>
                </div>
            </div>
        `;
        
        card.addEventListener('click', () => {
            document.querySelectorAll('.era-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            document.getElementById('eraSelect').value = eraName;
            updateMainChart();
        });
        
        container.appendChild(card);
    });
}

function renderRankings() {
    const stats = dashboardData.industry_stats;
    const rankings = Object.entries(stats)
        .map(([industry, data]) => ({ industry, ...data }))
        .sort((a, b) => b.total_suspicious_months - a.total_suspicious_months);
    
    // Bar chart
    const ctx = document.getElementById('rankingsChart').getContext('2d');
    
    if (rankingsChart) rankingsChart.destroy();
    
    rankingsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: rankings.map(r => r.industry),
            datasets: [{
                label: 'Suspicious Months',
                data: rankings.map(r => r.total_suspicious_months),
                backgroundColor: rankings.map(r => INDUSTRY_COLORS[r.industry] || '#6366f1'),
                borderRadius: 4
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    grid: { color: '#334155' },
                    ticks: { color: '#94a3b8' }
                },
                y: {
                    grid: { display: false },
                    ticks: { color: '#f1f5f9' }
                }
            }
        }
    });
    
    // Table
    const tableContainer = document.getElementById('rankingsTable');
    tableContainer.innerHTML = rankings.map((r, i) => `
        <div class="ranking-item">
            <div class="ranking-position ${i < 3 ? 'top-3' : ''}">${i + 1}</div>
            <div class="ranking-info">
                <h4>${r.industry.replace('_', ' ')}</h4>
                <p>Data: ${r.data_start} - ${r.data_end}</p>
            </div>
            <div class="ranking-value">${r.total_suspicious_months}</div>
        </div>
    `).join('');
}

function renderSuspiciousGrid() {
    const container = document.getElementById('suspiciousGrid');
    const items = [];
    
    Object.entries(dashboardData.industry_stats).forEach(([industry, stats]) => {
        Object.entries(stats.suspicious_by_year).forEach(([year, count]) => {
            items.push({
                industry,
                year: parseInt(year),
                count,
                severity: count >= 6 ? 'high' : count >= 3 ? 'medium' : 'low'
            });
        });
    });
    
    // Sort by count descending
    items.sort((a, b) => b.count - a.count);
    
    container.innerHTML = items.slice(0, 100).map(item => `
        <div class="suspicious-item ${item.severity}" data-industry="${item.industry}" data-year="${item.year}" data-severity="${item.severity}">
            <div class="suspicious-header">
                <h4>${item.industry.replace('_', ' ')}</h4>
                <span class="suspicious-badge ${item.severity}">${item.count} months</span>
            </div>
            <div class="suspicious-details">
                Year: ${item.year} | Severity: ${item.severity.toUpperCase()}
            </div>
        </div>
    `).join('');
}

function filterSuspiciousGrid() {
    const searchTerm = document.getElementById('searchSuspicious').value.toLowerCase();
    const severity = document.getElementById('filterSeverity').value;
    
    document.querySelectorAll('.suspicious-item').forEach(item => {
        const matchesSearch = item.dataset.industry.toLowerCase().includes(searchTerm) ||
                              item.dataset.year.includes(searchTerm);
        const matchesSeverity = severity === 'all' || item.dataset.severity === severity;
        
        item.style.display = matchesSearch && matchesSeverity ? 'block' : 'none';
    });
}

function updateMainChart() {
    const industry = document.getElementById('industrySelect').value;
    const era = document.getElementById('eraSelect').value;
    const chartType = document.getElementById('chartType').value;
    const showSuspicious = document.getElementById('showSuspicious').checked;
    const showEraOverlay = document.getElementById('showEraOverlay').checked;
    
    const ctx = document.getElementById('mainChart').getContext('2d');
    
    if (mainChart) mainChart.destroy();
    
    if (chartType === 'comparison') {
        renderComparisonChart(ctx, era);
    } else if (chartType === 'bar') {
        renderBarChart(ctx, industry, era);
    } else {
        renderLineChart(ctx, industry, era, showSuspicious, showEraOverlay);
    }
}

function renderLineChart(ctx, industry, era, showSuspicious, showEraOverlay) {
    let datasets = [];
    let annotations = {};
    
    // Market average
    let marketData = dashboardData.market_average
        .filter(d => d.yoy_change !== null)
        .map(d => ({ x: d.date, y: d.yoy_change }));
    
    // Filter by era
    if (era !== 'all') {
        const eraInfo = dashboardData.historical_eras[era];
        marketData = marketData.filter(d => d.x >= eraInfo.start && d.x <= eraInfo.end);
    }
    
    datasets.push({
        label: 'Market Average',
        data: marketData,
        borderColor: '#6b7280',
        borderDash: [5, 5],
        borderWidth: 2,
        pointRadius: 0,
        fill: false
    });
    
    // Selected industry(s)
    const industries = industry === 'all' ? dashboardData.metadata.industries : [industry];
    
    industries.forEach(ind => {
        let data = dashboardData.time_series[ind] || [];
        
        if (era !== 'all') {
            const eraInfo = dashboardData.historical_eras[era];
            data = data.filter(d => d.date >= eraInfo.start && d.date <= eraInfo.end);
        }
        
        const lineData = data.filter(d => d.yoy_change !== null).map(d => ({
            x: d.date,
            y: d.yoy_change
        }));
        
        datasets.push({
            label: ind,
            data: lineData,
            borderColor: INDUSTRY_COLORS[ind],
            borderWidth: industry === 'all' ? 1.5 : 2.5,
            pointRadius: 0,
            fill: false
        });
        
        // Suspicious points
        if (showSuspicious && industry !== 'all') {
            const suspiciousData = data
                .filter(d => d.is_suspicious && d.yoy_change !== null)
                .map(d => ({ x: d.date, y: d.yoy_change }));
            
            if (suspiciousData.length > 0) {
                datasets.push({
                    label: 'Suspicious',
                    data: suspiciousData,
                    backgroundColor: 'rgba(220, 38, 38, 0.8)',
                    borderColor: '#dc2626',
                    pointRadius: 6,
                    pointStyle: 'triangle',
                    showLine: false
                });
            }
        }
    });
    
    // Era overlays
    if (showEraOverlay && era === 'all') {
        Object.entries(dashboardData.historical_eras).forEach(([eraName, eraInfo], idx) => {
            annotations[`era${idx}`] = {
                type: 'box',
                xMin: eraInfo.start,
                xMax: eraInfo.end,
                backgroundColor: eraInfo.color + '20',
                borderColor: eraInfo.color,
                borderWidth: 1,
                label: {
                    display: true,
                    content: eraName,
                    position: 'start',
                    color: eraInfo.color,
                    font: { size: 10 }
                }
            };
        });
    }
    
    // Threshold line
    annotations.crashThreshold = {
        type: 'line',
        yMin: -2,
        yMax: -2,
        borderColor: '#f59e0b',
        borderWidth: 2,
        borderDash: [6, 6],
        label: {
            display: true,
            content: 'Crash Threshold (-2%)',
            position: 'end',
            color: '#f59e0b',
            font: { size: 10 }
        }
    };
    
    const title = industry === 'all' 
        ? `All Industries YoY Change${era !== 'all' ? ` (${era})` : ''}`
        : `${industry} vs Market YoY Change${era !== 'all' ? ` (${era})` : ''}`;
    
    document.getElementById('chartTitle').textContent = title;
    
    mainChart = new Chart(ctx, {
        type: 'line',
        data: { datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                annotation: { annotations },
                legend: {
                    position: 'top',
                    labels: { color: '#f1f5f9' }
                },
                tooltip: {
                    backgroundColor: '#1e293b',
                    titleColor: '#f1f5f9',
                    bodyColor: '#94a3b8',
                    borderColor: '#475569',
                    borderWidth: 1
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: { unit: 'year' },
                    grid: { color: '#334155' },
                    ticks: { color: '#94a3b8' }
                },
                y: {
                    grid: { color: '#334155' },
                    ticks: { color: '#94a3b8' },
                    title: {
                        display: true,
                        text: 'YoY Change (%)',
                        color: '#94a3b8'
                    }
                }
            }
        }
    });
}

function renderBarChart(ctx, industry, era) {
    const stats = dashboardData.industry_stats;
    const industries = industry === 'all' ? dashboardData.metadata.industries : [industry];
    
    // Get years to show
    let years = new Set();
    industries.forEach(ind => {
        Object.keys(stats[ind]?.suspicious_by_year || {}).forEach(y => years.add(parseInt(y)));
    });
    
    years = Array.from(years).sort((a, b) => a - b);
    
    // Filter by era
    if (era !== 'all') {
        const eraInfo = dashboardData.historical_eras[era];
        const startYear = parseInt(eraInfo.start.slice(0, 4));
        const endYear = parseInt(eraInfo.end.slice(0, 4));
        years = years.filter(y => y >= startYear && y <= endYear);
    }
    
    const datasets = industries.map(ind => ({
        label: ind,
        data: years.map(y => stats[ind]?.suspicious_by_year?.[y] || 0),
        backgroundColor: INDUSTRY_COLORS[ind],
        borderRadius: 4
    }));
    
    document.getElementById('chartTitle').textContent = 
        `Suspicious Months by Year${era !== 'all' ? ` (${era})` : ''}`;
    
    mainChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: years,
            datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: { color: '#f1f5f9' }
                }
            },
            scales: {
                x: {
                    grid: { color: '#334155' },
                    ticks: { color: '#94a3b8' }
                },
                y: {
                    grid: { color: '#334155' },
                    ticks: { color: '#94a3b8' },
                    title: {
                        display: true,
                        text: 'Suspicious Months',
                        color: '#94a3b8'
                    }
                }
            }
        }
    });
}

function renderComparisonChart(ctx, era) {
    const eraData = era === 'all' 
        ? Object.values(dashboardData.era_analysis)
        : [dashboardData.era_analysis[era]];
    
    const industries = dashboardData.metadata.industries;
    
    const datasets = eraData.map(e => ({
        label: e.name,
        data: industries.map(ind => e.industries[ind]?.suspicious_months || 0),
        backgroundColor: e.color,
        borderRadius: 4
    }));
    
    document.getElementById('chartTitle').textContent = 'Industry Comparison Across Eras';
    
    mainChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: industries,
            datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: { color: '#f1f5f9' }
                }
            },
            scales: {
                x: {
                    grid: { color: '#334155' },
                    ticks: { color: '#94a3b8' }
                },
                y: {
                    grid: { color: '#334155' },
                    ticks: { color: '#94a3b8' },
                    title: {
                        display: true,
                        text: 'Suspicious Months',
                        color: '#94a3b8'
                    }
                }
            }
        }
    });
}

// Initialize on load
document.addEventListener('DOMContentLoaded', initDashboard);
