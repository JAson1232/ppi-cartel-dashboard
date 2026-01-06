/**
 * Cartel Differentiation Dashboard - JavaScript
 * Loads data from cartel_differentiation_data.json
 */

let cartelData = null;

// Colors for charts
const VERDICT_COLORS = {
    'CARTEL LIKELY': '#ef4444',
    'SUSPICIOUS': '#f97316',
    'MONITOR': '#eab308',
    'LIKELY COMPETITIVE': '#22c55e'
};

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
    'Livestock': '#a855f7'
};

// Initialize dashboard
async function initCartelDashboard() {
    try {
        const response = await fetch('cartel_differentiation_data.json');
        cartelData = await response.json();
        
        updateHeader();
        updateMethodology();
        renderRankings();
        renderPTRChart();
        renderDisconnectChart();
        renderVarianceChart();
        renderScoreBreakdownChart();
        renderVarianceTable();
        renderRFDetails();
        
    } catch (error) {
        console.error('Error loading cartel differentiation data:', error);
        document.body.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; color: #f1f5f9;">
                <h1>⚠️ Data Not Found</h1>
                <p style="margin-top: 16px; color: #94a3b8;">Please run the notebook export cell first to generate the data.</p>
                <p style="margin-top: 8px; color: #64748b;">Expected file: cartel_differentiation_data.json</p>
                <a href="index.html" style="margin-top: 24px; color: #3b82f6;">← Back to Dashboard</a>
            </div>
        `;
    }
}

function updateHeader() {
    document.getElementById('generatedAt').textContent = 
        `Data generated: ${new Date(cartelData.generated_at).toLocaleString()}`;
}

function updateMethodology() {
    const methodA = cartelData.methodology.test_a;
    const methodB = cartelData.methodology.test_b;
    
    document.getElementById('methodA-desc').textContent = methodA.description;
    document.getElementById('methodA-interp').textContent = 
        `${methodA.interpretation} | Thresholds: Input crash < ${methodA.thresholds.input_crash_threshold}%, Output resist > ${methodA.thresholds.output_resist_threshold}%`;
    
    document.getElementById('methodB-desc').textContent = methodB.description;
    document.getElementById('methodB-interp').textContent = 
        `${methodB.interpretation} | Flat month: < ${methodB.thresholds.flat_month_threshold}%, Jump: > ${methodB.thresholds.jump_threshold}%`;
}

function renderRankings() {
    const container = document.getElementById('rankingsGrid');
    container.innerHTML = '';
    
    cartelData.combined_rankings.forEach(entry => {
        const verdictClass = entry.verdict.toLowerCase().replace(' ', '-');
        const card = document.createElement('div');
        card.className = 'ranking-card';
        card.innerHTML = `
            <div class="rank">#${entry.rank}</div>
            <div class="industry-info">
                <div class="industry-name">${entry.industry.replace('_', ' ')}</div>
                <div class="scores">
                    <span>RF: ${entry.rf_score.toFixed(1)}</span>
                    <span>SL: ${entry.sl_score.toFixed(1)}</span>
                    <span>Total: ${entry.total_score.toFixed(1)}</span>
                </div>
            </div>
            <div class="verdict ${verdictClass}">${entry.verdict}</div>
        `;
        container.appendChild(card);
    });
}

function renderPTRChart() {
    const ctx = document.getElementById('ptrChart').getContext('2d');
    
    // Group by output industry and get average PTR
    const industryPTR = {};
    cartelData.rocket_feather_results.forEach(r => {
        if (r.avg_pass_through_ratio !== null) {
            if (!industryPTR[r.output_industry]) {
                industryPTR[r.output_industry] = [];
            }
            industryPTR[r.output_industry].push(r.avg_pass_through_ratio);
        }
    });
    
    const labels = Object.keys(industryPTR);
    const avgPTRs = labels.map(ind => {
        const ptrs = industryPTR[ind];
        return ptrs.reduce((a, b) => a + b, 0) / ptrs.length;
    });
    
    // Color based on PTR value
    const colors = avgPTRs.map(ptr => {
        if (ptr > 0) return '#ef4444';  // Prices rose when input fell - very bad
        if (ptr > -0.3) return '#f97316';  // Low pass-through
        if (ptr > -0.7) return '#eab308';  // Moderate pass-through
        return '#22c55e';  // Good pass-through
    });
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels.map(l => l.replace('_', ' ')),
            datasets: [{
                label: 'Avg Pass-Through Ratio',
                data: avgPTRs,
                backgroundColor: colors,
                borderColor: colors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => {
                            const ptr = ctx.raw;
                            let interpretation = 'Good pass-through';
                            if (ptr > 0) interpretation = '⚠️ Prices ROSE when costs fell';
                            else if (ptr > -0.3) interpretation = '🔴 Very low pass-through';
                            else if (ptr > -0.7) interpretation = '🟡 Low pass-through';
                            return [`PTR: ${ptr.toFixed(2)}`, interpretation];
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    title: { display: true, text: 'Pass-Through Ratio', color: '#94a3b8' },
                    ticks: { color: '#94a3b8' },
                    grid: { color: 'rgba(255,255,255,0.05)' }
                },
                x: {
                    ticks: { color: '#94a3b8' },
                    grid: { display: false }
                }
            }
        }
    });
}

function renderDisconnectChart() {
    const ctx = document.getElementById('disconnectChart').getContext('2d');
    
    const dataPoints = cartelData.rocket_feather_results
        .filter(r => r.avg_correlation !== null)
        .map(r => ({
            x: r.disconnect_count,
            y: r.avg_correlation,
            label: `${r.output_industry} vs ${r.input_cost}`,
            suspicion: r.suspicion_level
        }));
    
    new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'Industry-Input Pairs',
                data: dataPoints,
                backgroundColor: dataPoints.map(p => 
                    p.suspicion.includes('HIGH') ? '#ef4444' :
                    p.suspicion.includes('Moderate') ? '#f97316' : '#22c55e'
                ),
                pointRadius: 8,
                pointHoverRadius: 12
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => {
                            const p = dataPoints[ctx.dataIndex];
                            return [
                                p.label,
                                `Disconnect months: ${p.x}`,
                                `Correlation: ${p.y.toFixed(2)}`,
                                p.suspicion
                            ];
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: { display: true, text: 'Disconnect Months', color: '#94a3b8' },
                    ticks: { color: '#94a3b8' },
                    grid: { color: 'rgba(255,255,255,0.05)' }
                },
                y: {
                    title: { display: true, text: 'Correlation', color: '#94a3b8' },
                    ticks: { color: '#94a3b8' },
                    grid: { color: 'rgba(255,255,255,0.05)' }
                }
            }
        }
    });
}

function renderVarianceChart() {
    const ctx = document.getElementById('varianceChart').getContext('2d');
    
    const sorted = [...cartelData.variance_results].sort((a, b) => b.step_ladder_score - a.step_ladder_score);
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sorted.map(v => v.industry.replace('_', ' ')),
            datasets: [{
                label: 'Step-Ladder Score',
                data: sorted.map(v => v.step_ladder_score),
                backgroundColor: sorted.map(v => v.is_flagged ? '#ef4444' : '#3b82f6'),
                borderColor: sorted.map(v => v.is_flagged ? '#ef4444' : '#3b82f6'),
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => {
                            const v = sorted[ctx.dataIndex];
                            return [
                                `Score: ${v.step_ladder_score.toFixed(1)}`,
                                `Flat months: ${v.flat_months_pct.toFixed(1)}%`,
                                `Jumps: ${v.jump_months_pct.toFixed(1)}%`,
                                v.is_flagged ? '🔴 FLAGGED' : '🟢 Normal'
                            ];
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: { display: true, text: 'Step-Ladder Score', color: '#94a3b8' },
                    ticks: { color: '#94a3b8' },
                    grid: { color: 'rgba(255,255,255,0.05)' }
                },
                y: {
                    ticks: { color: '#94a3b8' },
                    grid: { display: false }
                }
            }
        }
    });
}

function renderScoreBreakdownChart() {
    const ctx = document.getElementById('scoreBreakdownChart').getContext('2d');
    
    const rankings = cartelData.combined_rankings;
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: rankings.map(r => r.industry.replace('_', ' ')),
            datasets: [
                {
                    label: 'Rocket & Feather Score',
                    data: rankings.map(r => r.rf_score),
                    backgroundColor: '#3b82f6',
                    stack: 'stack0'
                },
                {
                    label: 'Step-Ladder Score',
                    data: rankings.map(r => r.sl_score),
                    backgroundColor: '#8b5cf6',
                    stack: 'stack0'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: { color: '#94a3b8' }
                }
            },
            scales: {
                x: {
                    stacked: true,
                    ticks: { color: '#94a3b8' },
                    grid: { display: false }
                },
                y: {
                    stacked: true,
                    title: { display: true, text: 'Score', color: '#94a3b8' },
                    ticks: { color: '#94a3b8' },
                    grid: { color: 'rgba(255,255,255,0.05)' }
                }
            }
        }
    });
}

function renderVarianceTable() {
    const tbody = document.getElementById('varianceTableBody');
    tbody.innerHTML = '';
    
    const sorted = [...cartelData.variance_results].sort((a, b) => b.step_ladder_score - a.step_ladder_score);
    
    sorted.forEach(v => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${v.industry.replace('_', ' ')}</td>
            <td>${v.std_dev.toFixed(2)}</td>
            <td>${v.flat_months_pct.toFixed(1)}%</td>
            <td>${v.jump_months_pct.toFixed(1)}%</td>
            <td>${v.step_ladder_score.toFixed(1)}</td>
            <td class="${v.is_flagged ? 'flagged' : ''}">${v.is_flagged ? '🔴 Flagged' : '🟢 Normal'}</td>
        `;
        tbody.appendChild(row);
    });
}

function renderRFDetails() {
    const container = document.getElementById('rfDetailsContainer');
    container.innerHTML = '';
    
    // Group by output industry
    const byIndustry = {};
    cartelData.rocket_feather_results.forEach(r => {
        if (!byIndustry[r.output_industry]) {
            byIndustry[r.output_industry] = [];
        }
        byIndustry[r.output_industry].push(r);
    });
    
    // Sort industries by total disconnect count
    const sortedIndustries = Object.entries(byIndustry)
        .map(([ind, results]) => ({
            industry: ind,
            results: results,
            totalDisconnects: results.reduce((sum, r) => sum + r.disconnect_count, 0)
        }))
        .sort((a, b) => b.totalDisconnects - a.totalDisconnects);
    
    sortedIndustries.slice(0, 6).forEach(({ industry, results, totalDisconnects }) => {
        const card = document.createElement('div');
        card.className = 'rf-pair';
        
        const suspicionLevel = results.some(r => r.suspicion_level.includes('HIGH')) ? 'HIGH' :
                               results.some(r => r.suspicion_level.includes('Moderate')) ? 'MODERATE' : 'LOW';
        
        card.innerHTML = `
            <div class="rf-pair-header">
                <div class="rf-pair-title">${industry.replace('_', ' ')}</div>
                <div class="verdict ${suspicionLevel === 'HIGH' ? 'cartel-likely' : suspicionLevel === 'MODERATE' ? 'suspicious' : 'competitive'}">
                    ${suspicionLevel} SUSPICION
                </div>
            </div>
            <div class="rf-stats">
                <div class="rf-stat">
                    <div class="value" style="color: ${totalDisconnects > 50 ? '#ef4444' : '#f97316'}">${totalDisconnects}</div>
                    <div class="label">Total Disconnect Months</div>
                </div>
                <div class="rf-stat">
                    <div class="value">${results.length}</div>
                    <div class="label">Input Costs Analyzed</div>
                </div>
                <div class="rf-stat">
                    <div class="value">${(results.reduce((sum, r) => sum + (r.avg_correlation || 0), 0) / results.length).toFixed(2)}</div>
                    <div class="label">Avg Correlation</div>
                </div>
                <div class="rf-stat">
                    <div class="value">${(results.filter(r => r.avg_pass_through_ratio !== null).reduce((sum, r) => sum + r.avg_pass_through_ratio, 0) / results.filter(r => r.avg_pass_through_ratio !== null).length || 0).toFixed(2)}</div>
                    <div class="label">Avg PTR</div>
                </div>
            </div>
            <div style="margin-top: 16px; font-size: 13px; color: var(--text-secondary);">
                <strong>Input costs analyzed:</strong> ${results.map(r => r.input_cost.replace('_', ' ')).join(', ')}
            </div>
        `;
        container.appendChild(card);
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initCartelDashboard);
