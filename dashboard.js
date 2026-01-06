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

// Against the Market Analysis
let analysisData = null;
let againstMarketChart = null;
let heatmapChart = null;

async function loadAgainstMarketData() {
    try {
        // Try the comprehensive analysis file first (generated by notebook)
        const response = await fetch('ppi_analysis_data.json');
        analysisData = await response.json();
        renderAgainstMarketSection();
        renderHeatmap();
    } catch (error) {
        // Fall back to legacy file
        try {
            const response = await fetch('against_market_data.json');
            analysisData = { against_market: await response.json() };
            renderAgainstMarketSection();
        } catch (e) {
            console.log('Analysis data not available yet');
            document.getElementById('againstMarketStats').innerHTML = `
                <div style="text-align: center; padding: 20px; color: var(--text-secondary);">
                    <p>⚠️ Run the data_cpi_analysis notebook to generate this data</p>
                    <p style="font-size: 12px; margin-top: 8px;">Execute all cells and check for 'ppi_analysis_data.json' in ppi_dashboard/</p>
                </div>
            `;
        }
    }
}

function renderAgainstMarketSection() {
    if (!analysisData || !analysisData.against_market) return;
    
    const analysis = analysisData.against_market.summary;
    const rankings = analysisData.against_market.industry_rankings || [];
    const eras = analysisData.against_market.era_breakdown || [];
    
    // Stats cards
    document.getElementById('againstMarketStats').innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px;">
            <div class="stat-card" style="background: var(--bg-dark);">
                <div class="value" style="color: #8b5cf6;">${analysis.total_instances.toLocaleString()}</div>
                <div class="label">Total Instances</div>
            </div>
            <div class="stat-card" style="background: var(--bg-dark);">
                <div class="value" style="color: #f59e0b;">${analysis.unique_months}</div>
                <div class="label">Unique Months</div>
            </div>
            <div class="stat-card" style="background: var(--bg-dark);">
                <div class="value" style="color: #ef4444;">${rankings[0]?.industry || 'N/A'}</div>
                <div class="label">Most Suspicious</div>
            </div>
            <div class="stat-card" style="background: var(--bg-dark);">
                <div class="value" style="color: #22c55e;">${analysis.date_range.start} - ${analysis.date_range.end?.slice(0,4) || ''}</div>
                <div class="label">Date Range</div>
            </div>
        </div>
    `;
    
    // Rankings table
    let tableHtml = `
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <thead>
                <tr style="border-bottom: 2px solid var(--border);">
                    <th style="padding: 10px; text-align: left; color: var(--text-secondary);">Rank</th>
                    <th style="padding: 10px; text-align: left; color: var(--text-secondary);">Industry</th>
                    <th style="padding: 10px; text-align: right; color: var(--text-secondary);">Occurrences</th>
                    <th style="padding: 10px; text-align: right; color: var(--text-secondary);">Avg Change</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    rankings.forEach((r, idx) => {
        const color = INDUSTRY_COLORS[r.industry] || '#6366f1';
        const emoji = idx < 3 ? '🚨' : idx < 6 ? '⚠️' : '📊';
        const avgChange = r.avg_pct_change !== undefined ? r.avg_pct_change : 0;
        tableHtml += `
            <tr style="border-bottom: 1px solid var(--border);">
                <td style="padding: 10px;">${emoji} ${idx + 1}</td>
                <td style="padding: 10px; color: ${color}; font-weight: 600;">${r.industry}</td>
                <td style="padding: 10px; text-align: right;">${r.occurrences}</td>
                <td style="padding: 10px; text-align: right; color: ${avgChange >= 0 ? '#22c55e' : '#ef4444'};">
                    ${avgChange >= 0 ? '+' : ''}${avgChange.toFixed(1)}%
                </td>
            </tr>
        `;
    });
    
    tableHtml += '</tbody></table>';
    document.getElementById('againstMarketTable').innerHTML = tableHtml;
    
    // Chart
    const ctx = document.getElementById('againstMarketChart').getContext('2d');
    
    if (againstMarketChart) againstMarketChart.destroy();
    
    againstMarketChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: rankings.map(r => r.industry),
            datasets: [{
                label: 'Occurrences',
                data: rankings.map(r => r.occurrences),
                backgroundColor: rankings.map(r => INDUSTRY_COLORS[r.industry] || '#8b5cf6'),
                borderRadius: 4
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#1e293b',
                    titleColor: '#f1f5f9',
                    bodyColor: '#94a3b8',
                    callbacks: {
                        afterLabel: (ctx) => {
                            const r = rankings[ctx.dataIndex];
                            const avgChange = r.avg_pct_change !== undefined ? r.avg_pct_change : 0;
                            return `Avg change when resisting: ${avgChange >= 0 ? '+' : ''}${avgChange.toFixed(1)}%`;
                        }
                    }
                }
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
    
    // Era breakdown cards
    let eraCardsHtml = '';
    eras.forEach(era => {
        const topInds = Object.entries(era.top_industries || {}).slice(0, 3);
        eraCardsHtml += `
            <div class="era-card" style="background: var(--bg-dark); border-color: #8b5cf6;">
                <div class="era-card-header">
                    <h3 style="font-size: 14px;">${era.era}</h3>
                </div>
                <div class="era-card-stats" style="margin-top: 12px;">
                    <div class="era-stat">
                        <div class="value" style="color: #8b5cf6; font-size: 20px;">${era.total_instances}</div>
                        <div class="label">Instances</div>
                    </div>
                    <div class="era-stat">
                        <div class="value" style="font-size: 20px;">${era.unique_months}</div>
                        <div class="label">Months</div>
                    </div>
                </div>
                <div style="margin-top: 12px; font-size: 12px; color: var(--text-secondary);">
                    <strong>Top resisters:</strong><br>
                    ${topInds.map(([ind, count]) => `${ind}: ${count}`).join('<br>')}
                </div>
            </div>
        `;
    });
    document.getElementById('againstMarketEras').innerHTML = eraCardsHtml;
}

function renderHeatmap() {
    if (!analysisData || !analysisData.against_market || !analysisData.against_market.heatmap) {
        console.log('No heatmap data available');
        return;
    }
    
    const heatmap = analysisData.against_market.heatmap;
    if (!heatmap.years || !heatmap.industries || !heatmap.matrix) {
        console.log('Incomplete heatmap data');
        return;
    }
    
    const canvas = document.getElementById('heatmapChart');
    if (!canvas) {
        console.log('Heatmap canvas not found');
        return;
    }
    
    const years = heatmap.years;
    const industries = heatmap.industries;
    const matrix = heatmap.matrix;
    
    // Find max value for color scaling
    let maxVal = 0;
    for (let i = 0; i < matrix.length; i++) {
        for (let j = 0; j < matrix[i].length; j++) {
            if (matrix[i][j] > maxVal) maxVal = matrix[i][j];
        }
    }
    
    // Filter to years with data
    const yearsWithData = [];
    const matrixFiltered = [];
    for (let i = 0; i < years.length; i++) {
        if (matrix[i].some(v => v > 0)) {
            yearsWithData.push(years[i]);
            matrixFiltered.push(matrix[i]);
        }
    }
    
    // Canvas dimensions
    const cellWidth = 25;
    const cellHeight = 30;
    const labelWidth = 100;
    const labelHeight = 50;
    const width = labelWidth + yearsWithData.length * cellWidth + 80; // extra for colorbar
    const height = labelHeight + industries.length * cellHeight + 20;
    
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);
    
    // Color function (purple gradient)
    function getColor(val) {
        if (val === 0) return '#1e293b';
        const intensity = Math.min(val / maxVal, 1);
        const r = Math.round(30 + intensity * (139 - 30));
        const g = Math.round(41 + intensity * (92 - 41));
        const b = Math.round(59 + intensity * (246 - 59));
        return `rgb(${r}, ${g}, ${b})`;
    }
    
    // Draw cells
    for (let i = 0; i < yearsWithData.length; i++) {
        for (let j = 0; j < industries.length; j++) {
            const val = matrixFiltered[i][j] || 0;
            const x = labelWidth + i * cellWidth;
            const y = labelHeight + j * cellHeight;
            
            ctx.fillStyle = getColor(val);
            ctx.fillRect(x, y, cellWidth - 1, cellHeight - 1);
            
            // Draw value if > 0
            if (val > 0) {
                ctx.fillStyle = val > maxVal * 0.5 ? '#fff' : '#94a3b8';
                ctx.font = '10px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(val.toString(), x + cellWidth / 2, y + cellHeight / 2);
            }
        }
    }
    
    // Draw year labels (x-axis)
    ctx.fillStyle = '#94a3b8';
    ctx.font = '9px Arial';
    ctx.textAlign = 'center';
    for (let i = 0; i < yearsWithData.length; i++) {
        if (i % 2 === 0) { // Show every other year to avoid crowding
            const x = labelWidth + i * cellWidth + cellWidth / 2;
            ctx.save();
            ctx.translate(x, labelHeight - 5);
            ctx.rotate(-Math.PI / 4);
            ctx.fillText(yearsWithData[i].toString(), 0, 0);
            ctx.restore();
        }
    }
    
    // Draw industry labels (y-axis)
    ctx.fillStyle = '#f1f5f9';
    ctx.font = '11px Arial';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let j = 0; j < industries.length; j++) {
        const y = labelHeight + j * cellHeight + cellHeight / 2;
        ctx.fillText(industries[j], labelWidth - 5, y);
    }
    
    // Draw color legend
    const legendX = width - 60;
    const legendY = labelHeight;
    const legendHeight = industries.length * cellHeight;
    const legendWidth = 15;
    
    // Gradient bar
    const gradient = ctx.createLinearGradient(legendX, legendY + legendHeight, legendX, legendY);
    gradient.addColorStop(0, '#1e293b');
    gradient.addColorStop(0.5, 'rgb(84, 66, 152)');
    gradient.addColorStop(1, 'rgb(139, 92, 246)');
    ctx.fillStyle = gradient;
    ctx.fillRect(legendX, legendY, legendWidth, legendHeight);
    
    // Legend labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('0', legendX + legendWidth + 5, legendY + legendHeight);
    ctx.fillText(maxVal.toString(), legendX + legendWidth + 5, legendY + 10);
    
    // Title
    ctx.fillStyle = '#f1f5f9';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Months Resisting Market Decline', width / 2, 15);
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    initDashboard();
    loadAgainstMarketData();
});
