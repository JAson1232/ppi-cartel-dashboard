// South Africa SCM Analysis - Chart and Data Logic

let scmData = null;
let monthlySeries = []; // Processed monthly data

// Load the SCM data
async function loadSCMData() {
    try {
        const response = await fetch('scm_data_south_africa.json');
        scmData = await response.json();
        
        // Transform time_series into monthlySeries array of objects
        const ts = scmData.time_series;
        monthlySeries = ts.dates.map((date, i) => ({
            date: date,
            actual: ts.actual[i],
            synthetic: ts.synthetic[i],
            gap: ts.gap[i],
            gap_pct: ts.gap_pct[i]
        }));
        
        initializeDashboard();
    } catch (error) {
        console.error('Error loading SCM data:', error);
        document.querySelector('.dashboard').innerHTML = `
            <div style="text-align: center; padding: 40px; color: #ef4444;">
                <h2>Error Loading Data</h2>
                <p>Could not load scm_data_south_africa.json</p>
                <p style="color: var(--text-secondary); font-size: 14px;">${error.message}</p>
            </div>
        `;
    }
}

function initializeDashboard() {
    updateStats();
    renderMainChart();
    renderGapChart();
    renderWeightsTable();
    renderAnnualTable();
}

function updateStats() {
    const stats = scmData.summary_statistics;
    const donors = scmData.metadata.donors;
    
    document.getElementById('stat-observations').textContent = monthlySeries.length;
    document.getElementById('stat-donors').textContent = donors.length;
    document.getElementById('stat-gap').textContent = stats.post_cartel_period.avg_gap_pct.toFixed(1) + '%';
    document.getElementById('stat-gap-points').textContent = stats.post_cartel_period.avg_gap.toFixed(1);
    document.getElementById('stat-fit').textContent = Math.abs(stats.cartel_period.avg_gap_pct).toFixed(1) + '%';
}

function renderMainChart() {
    const ctx = document.getElementById('mainChart').getContext('2d');
    
    const intervention = new Date(scmData.metadata.intervention_date);
    
    // Parse dates and values from monthlySeries
    const labels = monthlySeries.map(d => new Date(d.date));
    const actualValues = monthlySeries.map(d => d.actual);
    const syntheticValues = monthlySeries.map(d => d.synthetic);
    
    // Create gradient for shaded area
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(16, 185, 129, 0.3)');
    gradient.addColorStop(1, 'rgba(16, 185, 129, 0.05)');
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Synthetic Control (Counterfactual)',
                    data: syntheticValues,
                    borderColor: '#f59e0b',
                    backgroundColor: 'transparent',
                    borderWidth: 2.5,
                    borderDash: [6, 4],
                    pointRadius: 0,
                    tension: 0.1,
                    order: 1
                },
                {
                    label: 'Actual Cement Prices',
                    data: actualValues,
                    borderColor: '#3b82f6',
                    backgroundColor: 'transparent',
                    borderWidth: 2.5,
                    pointRadius: 0,
                    tension: 0.1,
                    order: 2
                },
                {
                    label: 'Consumer Savings (Gap)',
                    data: syntheticValues.map((s, i) => {
                        const date = labels[i];
                        if (date >= intervention) {
                            return s - actualValues[i] > 0 ? s : null;
                        }
                        return null;
                    }),
                    borderColor: 'transparent',
                    backgroundColor: gradient,
                    fill: '+1',
                    pointRadius: 0,
                    order: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 20,
                        font: { size: 12 }
                    }
                },
                tooltip: {
                    callbacks: {
                        title: function(items) {
                            const date = items[0].label;
                            return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
                        },
                        label: function(context) {
                            if (context.dataset.label === 'Consumer Savings (Gap)') return null;
                            return `${context.dataset.label}: ${context.parsed.y.toFixed(1)}`;
                        },
                        afterBody: function(items) {
                            const idx = items[0].dataIndex;
                            const gap = syntheticValues[idx] - actualValues[idx];
                            const gapPct = (gap / syntheticValues[idx] * 100);
                            if (labels[idx] >= intervention && gap > 0) {
                                return [`Gap: ${gap.toFixed(1)} pts (${gapPct.toFixed(1)}%)`];
                            }
                            return [];
                        }
                    }
                },
                annotation: {
                    annotations: {
                        line1: {
                            type: 'line',
                            xMin: intervention,
                            xMax: intervention,
                            borderColor: '#ef4444',
                            borderWidth: 2,
                            borderDash: [6, 6],
                            label: {
                                enabled: true,
                                content: 'Cartel Dissolution',
                                position: 'start'
                            }
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
                        display: false
                    },
                    ticks: {
                        color: '#94a3b8'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Price Index (December 2016 = 100)',
                        color: '#94a3b8'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    },
                    ticks: {
                        color: '#94a3b8'
                    }
                }
            }
        }
    });
    
    // Add custom annotation for intervention line
    addInterventionLine('mainChart', intervention);
}

function renderGapChart() {
    const ctx = document.getElementById('gapChart').getContext('2d');
    
    const intervention = new Date(scmData.metadata.intervention_date);
    
    const labels = monthlySeries.map(d => new Date(d.date));
    const gapValues = monthlySeries.map(d => d.gap);
    
    // Color gaps based on positive/negative
    const backgroundColors = monthlySeries.map((d, i) => {
        const date = labels[i];
        if (date < intervention) {
            return 'rgba(148, 163, 184, 0.6)'; // gray for cartel period
        }
        return d.gap >= 0 ? 'rgba(16, 185, 129, 0.7)' : 'rgba(239, 68, 68, 0.7)';
    });
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Gap (Synthetic - Actual)',
                data: gapValues,
                backgroundColor: backgroundColors,
                borderWidth: 0,
                barPercentage: 1.0,
                categoryPercentage: 1.0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        title: function(items) {
                            const date = items[0].label;
                            return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
                        },
                        label: function(context) {
                            const gap = context.parsed.y;
                            return `Gap: ${gap.toFixed(1)} index points`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'year',
                        displayFormats: { year: 'yyyy' }
                    },
                    grid: { display: false },
                    ticks: { color: '#94a3b8' }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Gap (Index Points)',
                        color: '#94a3b8'
                    },
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#94a3b8' }
                }
            }
        }
    });
}

function renderWeightsTable() {
    const tbody = document.querySelector('#weightsTable tbody');
    const weights = scmData.model_weights;
    
    // Find max absolute weight for scaling
    const maxWeight = Math.max(...Object.values(weights).map(w => Math.abs(w)));
    
    let html = '';
    Object.entries(weights).forEach(([donor, weight]) => {
        const widthPct = Math.abs(weight) / maxWeight * 100;
        const isNegative = weight < 0;
        
        html += `
            <tr>
                <td>${donor}</td>
                <td style="font-weight: 600; color: ${isNegative ? '#ef4444' : '#10b981'}">
                    ${weight.toFixed(3)}
                </td>
                <td>
                    <div class="weight-bar ${isNegative ? 'negative' : ''}" style="width: ${widthPct}%"></div>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

function renderAnnualTable() {
    const tbody = document.querySelector('#annualTable tbody');
    const annual = scmData.annual_summary;
    const interventionYear = new Date(scmData.metadata.intervention_date).getFullYear();
    
    let html = '';
    annual.forEach(row => {
        const isPostCartel = row.year > interventionYear;
        const gapClass = row.avg_gap > 0 ? 'positive' : row.avg_gap < 0 ? 'negative' : '';
        const yearStyle = row.year === interventionYear ? 'font-weight: 700; color: #ef4444;' : '';
        
        html += `
            <tr style="${isPostCartel ? 'background: rgba(16, 185, 129, 0.05);' : ''}">
                <td style="${yearStyle}">
                    ${row.year}
                    ${row.year === interventionYear ? ' ⚡' : ''}
                </td>
                <td>${row.avg_actual.toFixed(1)}</td>
                <td>${row.avg_synthetic.toFixed(1)}</td>
                <td class="${gapClass}">${row.avg_gap >= 0 ? '+' : ''}${row.avg_gap.toFixed(1)}</td>
                <td class="${gapClass}">${row.avg_gap_pct >= 0 ? '+' : ''}${row.avg_gap_pct.toFixed(1)}%</td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

function addInterventionLine(chartId, interventionDate) {
    // Custom vertical line annotation (handled via CSS overlay)
    const canvas = document.getElementById(chartId);
    const wrapper = canvas.parentElement;
    
    // Already handled in chart options for now
}

// Load data on page load
document.addEventListener('DOMContentLoaded', loadSCMData);
