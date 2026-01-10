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
        
        // Find max overlap
        const maxOverlap = Math.max(...dashboardData.series_data.map(s => s.overlap_months));
        document.getElementById('stat-overlap').textContent = maxOverlap;
        
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

function getSeriesData(comparison, normType) {
    let series1, series2;
    
    switch (normType) {
        case 'overlap':
            series1 = comparison.normalized_overlap_1;
            series2 = comparison.normalized_overlap_2;
            break;
        case 'raw':
            series1 = comparison.raw_series_1;
            series2 = comparison.raw_series_2;
            break;
        default: // 'start'
            series1 = comparison.normalized_series_1;
            series2 = comparison.normalized_series_2;
    }
    
    return { series1, series2 };
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
    const { series1, series2 } = getSeriesData(comparison, normType);
    
    const data1 = convertToChartData(series1);
    const data2 = convertToChartData(series2);
    
    // Update title
    document.getElementById('chart-title').textContent = 
        `${comparison.item_1} vs ${comparison.item_2}`;
    
    if (mainChart) {
        mainChart.destroy();
    }
    
    mainChart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [
                {
                    label: `${comparison.item_1} (2000-2012)`,
                    data: data1,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    tension: 0.1,
                    fill: false
                },
                {
                    label: `${comparison.item_2} (2006-2025)`,
                    data: data2,
                    borderColor: '#f97316',
                    backgroundColor: 'rgba(249, 115, 22, 0.1)',
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    tension: 0.1,
                    fill: false
                }
            ]
        },
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
                }
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
        const card = document.createElement('div');
        card.className = 'mini-chart-card';
        card.innerHTML = `
            <h4>${comparison.item_1}<br>vs<br>${comparison.item_2}</h4>
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
    
    const { series1, series2 } = getSeriesData(comparison, 'start');
    const data1 = convertToChartData(series1);
    const data2 = convertToChartData(series2);
    
    if (miniCharts[index]) {
        miniCharts[index].destroy();
    }
    
    miniCharts[index] = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [
                {
                    data: data1,
                    borderColor: '#3b82f6',
                    borderWidth: 1.5,
                    pointRadius: 0,
                    tension: 0.1,
                    fill: false
                },
                {
                    data: data2,
                    borderColor: '#f97316',
                    borderWidth: 1.5,
                    pointRadius: 0,
                    tension: 0.1,
                    fill: false
                }
            ]
        },
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
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', init);
