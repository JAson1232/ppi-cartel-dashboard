// South Africa Cement Cartel Analysis - Dashboard JavaScript

let dashboardData = null;
let mainChart = null;
const miniCharts = {};

// Cartel period dates
const CARTEL_START = new Date('2000-01-01');
const CARTEL_END = new Date('2009-12-31');
const POST_CARTEL_START = new Date('2010-01-01');
const POST_CARTEL_END = new Date('2015-12-31');
const OVERLAP_START = new Date('2006-05-01');

// Chart.js plugin for background regions
const cartelRegionsPlugin = {
    id: 'cartelRegions',
    beforeDraw: (chart) => {
        const ctx = chart.ctx;
        const chartArea = chart.chartArea;
        const xScale = chart.scales.x;
        
        if (!chartArea || !xScale) return;
        
        // Draw cartel period (red)
        const cartelStartX = xScale.getPixelForValue(CARTEL_START);
        const cartelEndX = xScale.getPixelForValue(CARTEL_END);
        
        ctx.save();
        ctx.fillStyle = 'rgba(220, 38, 38, 0.1)';
        ctx.fillRect(
            Math.max(cartelStartX, chartArea.left),
            chartArea.top,
            Math.min(cartelEndX, chartArea.right) - Math.max(cartelStartX, chartArea.left),
            chartArea.bottom - chartArea.top
        );
        
        // Draw post-cartel period (green)
        const postStartX = xScale.getPixelForValue(POST_CARTEL_START);
        const postEndX = xScale.getPixelForValue(POST_CARTEL_END);
        
        ctx.fillStyle = 'rgba(16, 185, 129, 0.1)';
        ctx.fillRect(
            Math.max(postStartX, chartArea.left),
            chartArea.top,
            Math.min(postEndX, chartArea.right) - Math.max(postStartX, chartArea.left),
            chartArea.bottom - chartArea.top
        );
        
        ctx.restore();
    }
};

Chart.register(cartelRegionsPlugin);

// Load data and initialize
async function init() {
    try {
        const response = await fetch('south_africa_cement_data.json');
        dashboardData = await response.json();
        
        // Update stats
        document.getElementById('stat-comparisons').textContent = dashboardData.series_data.length;
        
        // Update chain-linking stats
        const chainLinked = dashboardData.summary_stats?.successful_chain_links || 0;
        document.getElementById('stat-chain-linked').textContent = chainLinked;
        
        const avgFactor = dashboardData.summary_stats?.avg_splicing_factor;
        if (avgFactor) {
            document.getElementById('stat-avg-factor').textContent = avgFactor.toFixed(3);
        }
        
        // Find max overlap (now using gap_months from chain-linking)
        const maxGap = Math.max(...dashboardData.series_data
            .filter(s => s.chain_link?.gap_months)
            .map(s => s.chain_link.gap_months));
        document.getElementById('stat-overlap').textContent = maxGap || 'N/A';
        
        // Initialize main chart
        createMainChart();
        
        // Create mini charts grid
        createMiniCharts();
        
        // Setup event listeners
        setupEventListeners();
        
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

function getSelectedComparison() {
    const item1 = document.getElementById('select-item1').value;
    const item2 = document.getElementById('select-item2').value;
    
    return dashboardData.series_data.find(
        s => s.item_1 === item1 && s.item_2 === item2
    );
}

function getSeriesData(comparison, normType, viewType = 'both') {
    let series1 = null, series2 = null, chainedSeries = null;
    
    switch (normType) {
        case 'overlap':
            series1 = comparison.normalized_overlap_1;
            series2 = comparison.normalized_overlap_2;
            break;
        case 'raw':
            series1 = comparison.raw_series_1;
            series2 = comparison.raw_series_2;
            break;
        case 'chained':
            // Chain-linked normalized series
            if (comparison.chain_link?.success) {
                chainedSeries = comparison.chain_link.chained_series_normalized;
            }
            series1 = comparison.normalized_series_1;
            series2 = comparison.normalized_series_2;
            break;
        case 'chained-raw':
            // Chain-linked raw series
            if (comparison.chain_link?.success) {
                chainedSeries = comparison.chain_link.chained_series_raw;
            }
            series1 = comparison.raw_series_1;
            series2 = comparison.raw_series_2;
            break;
        default: // 'start'
            series1 = comparison.normalized_series_1;
            series2 = comparison.normalized_series_2;
    }
    
    // If view is chained-only, hide individual series
    if (viewType === 'chained-only' && chainedSeries) {
        series1 = null;
        series2 = null;
    }
    
    return { series1, series2, chainedSeries, chainLink: comparison.chain_link };
}

function convertToChartData(seriesObj) {
    if (!seriesObj || Object.keys(seriesObj).length === 0) return [];
    
    return Object.entries(seriesObj)
        .map(([date, value]) => ({ x: new Date(date), y: value }))
        .sort((a, b) => a.x - b.x);
}

function createMainChart() {
    const ctx = document.getElementById('mainChart').getContext('2d');
    const comparison = getSelectedComparison();
    const normType = document.getElementById('select-normalization').value;
    const viewType = document.getElementById('select-view')?.value || 'both';
    const { series1, series2, chainedSeries, chainLink } = getSeriesData(comparison, normType, viewType);
    
    const data1 = convertToChartData(series1);
    const data2 = convertToChartData(series2);
    const dataChained = convertToChartData(chainedSeries);
    
    // Update title with chain-link info
    let titleText = `${comparison.item_1} vs ${comparison.item_2}`;
    if (chainLink?.success && (normType === 'chained' || normType === 'chained-raw')) {
        titleText += ` (Splicing Factor: ${chainLink.splicing_factor.toFixed(3)})`;
    }
    document.getElementById('chart-title').textContent = titleText;
    
    if (mainChart) {
        mainChart.destroy();
    }
    
    const datasets = [];
    
    // Add original series (if showing both)
    if (data1.length > 0 && viewType === 'both') {
        datasets.push({
            label: `${comparison.item_1} (2000-2012)`,
            data: data1,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderWidth: chainedSeries ? 1.5 : 2,
            pointRadius: 0,
            pointHoverRadius: 4,
            tension: 0.1,
            fill: false,
            borderDash: chainedSeries ? [5, 5] : []
        });
    }
    
    if (data2.length > 0 && viewType === 'both') {
        datasets.push({
            label: `${comparison.item_2} (2006-2025)`,
            data: data2,
            borderColor: '#f97316',
            backgroundColor: 'rgba(249, 115, 22, 0.1)',
            borderWidth: chainedSeries ? 1.5 : 2,
            pointRadius: 0,
            pointHoverRadius: 4,
            tension: 0.1,
            fill: false,
            borderDash: chainedSeries ? [5, 5] : []
        });
    }
    
    // Add chain-linked series
    if (dataChained.length > 0) {
        datasets.push({
            label: 'Chain-Linked Series',
            data: dataChained,
            borderColor: '#8b5cf6',
            backgroundColor: 'rgba(139, 92, 246, 0.1)',
            borderWidth: 3,
            pointRadius: 0,
            pointHoverRadius: 4,
            tension: 0.1,
            fill: false
        });
    }
    
    mainChart = new Chart(ctx, {
        type: 'line',
        data: { datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        color: '#f1f5f9',
                        usePointStyle: true,
                        padding: 20
                    }
                },
                tooltip: {
                    backgroundColor: '#1e293b',
                    titleColor: '#f1f5f9',
                    bodyColor: '#94a3b8',
                    borderColor: '#475569',
                    borderWidth: 1,
                    callbacks: {
                        title: (items) => {
                            const date = items[0].parsed.x;
                            return new Date(date).toLocaleDateString('en-US', { 
                                year: 'numeric', 
                                month: 'short' 
                            });
                        },
                        label: (item) => {
                            return `${item.dataset.label}: ${item.parsed.y.toFixed(1)}`;
                        }
                    }
                },
                // Add annotation for link date
                annotation: chainLink?.success ? {
                    annotations: {
                        linkLine: {
                            type: 'line',
                            xMin: new Date(chainLink.link_date),
                            xMax: new Date(chainLink.link_date),
                            borderColor: '#8b5cf6',
                            borderWidth: 2,
                            borderDash: [6, 6],
                            label: {
                                display: true,
                                content: 'Link Point',
                                position: 'start'
                            }
                        }
                    }
                } : {}
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'year',
                        displayFormats: {
                            year: 'yyyy'
                        }
                    },
                    grid: {
                        color: 'rgba(71, 85, 105, 0.3)'
                    },
                    ticks: {
                        color: '#94a3b8'
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(71, 85, 105, 0.3)'
                    },
                    ticks: {
                        color: '#94a3b8'
                    },
                    title: {
                        display: true,
                        text: normType === 'raw' ? 'Index Value' : 'Normalized (Base=100)',
                        color: '#94a3b8'
                    }
                }
            }
        }
    });
}

function createMiniCharts() {
    const grid = document.getElementById('comparison-grid');
    grid.innerHTML = '';
    
    dashboardData.series_data.forEach((comparison, index) => {
        const hasChainLink = comparison.chain_link?.success;
        const card = document.createElement('div');
        card.className = 'mini-chart-card' + (hasChainLink ? ' chain-linked' : '');
        card.innerHTML = `
            <h4>${comparison.item_1}<br>vs<br>${comparison.item_2}</h4>
            ${hasChainLink ? `<span class="chain-badge">🔗 Factor: ${comparison.chain_link.splicing_factor.toFixed(3)}</span>` : '<span class="chain-badge error">❌ No Chain</span>'}
            <div class="mini-chart-container">
                <canvas id="miniChart${index}"></canvas>
            </div>
        `;
        grid.appendChild(card);
        
        // Create mini chart
        setTimeout(() => createMiniChart(comparison, index), 10);
    });
}

function createMiniChart(comparison, index) {
    const ctx = document.getElementById(`miniChart${index}`);
    if (!ctx) return;
    
    // Show chain-linked series if available, otherwise show normalized series
    const hasChainLink = comparison.chain_link?.success;
    let chartData;
    
    if (hasChainLink) {
        // Show chain-linked series
        chartData = convertToChartData(comparison.chain_link.chained_series_normalized);
    }
    
    // Also get individual series for context
    const { series1, series2 } = getSeriesData(comparison, 'start', 'both');
    const data1 = convertToChartData(series1);
    const data2 = convertToChartData(series2);
    
    if (miniCharts[index]) {
        miniCharts[index].destroy();
    }
    
    const datasets = [];
    
    // Show individual series (faded if chain-linked available)
    if (data1.length > 0) {
        datasets.push({
            data: data1,
            borderColor: hasChainLink ? 'rgba(59, 130, 246, 0.4)' : '#3b82f6',
            borderWidth: hasChainLink ? 1 : 1.5,
            pointRadius: 0,
            tension: 0.1,
            fill: false,
            borderDash: hasChainLink ? [3, 3] : []
        });
    }
    
    if (data2.length > 0) {
        datasets.push({
            data: data2,
            borderColor: hasChainLink ? 'rgba(249, 115, 22, 0.4)' : '#f97316',
            borderWidth: hasChainLink ? 1 : 1.5,
            pointRadius: 0,
            tension: 0.1,
            fill: false,
            borderDash: hasChainLink ? [3, 3] : []
        });
    }
    
    // Add chain-linked series (prominent)
    if (hasChainLink && chartData.length > 0) {
        datasets.push({
            data: chartData,
            borderColor: '#8b5cf6',
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.1,
            fill: false
        });
    }
    
    miniCharts[index] = new Chart(ctx, {
        type: 'line',
        data: { datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false }
            },
            scales: {
                x: {
                    type: 'time',
                    display: false
                },
                y: {
                    display: false
                }
            },
            onClick: () => {
                // Update dropdowns and main chart
                document.getElementById('select-item1').value = comparison.item_1;
                document.getElementById('select-item2').value = comparison.item_2;
                // Switch to chained view if available
                if (hasChainLink) {
                    document.getElementById('select-normalization').value = 'chained';
                }
                createMainChart();
                
                // Scroll to main chart
                document.getElementById('mainChart').scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center' 
                });
            }
        }
    });
}

function setupEventListeners() {
    document.getElementById('select-item1').addEventListener('change', createMainChart);
    document.getElementById('select-item2').addEventListener('change', createMainChart);
    document.getElementById('select-normalization').addEventListener('change', createMainChart);
    const viewSelect = document.getElementById('select-view');
    if (viewSelect) {
        viewSelect.addEventListener('change', createMainChart);
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', init);
