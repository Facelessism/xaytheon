/**
 * Sprint Forecaster Frontend Logic
 * Handles Monte Carlo simulations and chart animations.
 */
class SprintForecaster {
    constructor() {
        this.confidenceGauge = null;
        this.volatilityChart = null;
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.fetchData();
    }

    setupEventListeners() {
        document.getElementById('scope-adj').addEventListener('input', (e) => {
            document.getElementById('scope-val').innerText = e.target.value;
            this.runSimulation();
        });

        document.getElementById('velocity-adj').addEventListener('input', (e) => {
            document.getElementById('velocity-val').innerText = e.target.value;
            this.runSimulation();
        });
    }

    async fetchData() {
        try {
            const response = await fetch('/api/sprint-forecaster/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            });
            const result = await response.json();

            if (result.success) {
                this.updateUI(result.data);
                this.renderCharts(result.data);
            }
        } catch (error) {
            console.error('Failed to fetch foresting data:', error);
        }
    }

    updateUI(data) {
        const { simulation, fatigue } = data;

        // Update confidence
        this.animateValue('confidence-percent', simulation.confidenceLevel, '%');
        document.getElementById('avg-outcome').innerText = `${Math.round(simulation.averageOutcome)} pts`;
        document.getElementById('p90-forecast').innerText = `${Math.round(simulation.p90)} pts`;

        // Update fatigue
        document.getElementById('fatigue-val').innerText = fatigue.index;
        document.getElementById('fatigue-fill').style.width = `${fatigue.index}%`;
        document.getElementById('fatigue-status').innerText = `Current Status: ${fatigue.status}`;
        document.getElementById('fatigue-rec').innerText = fatigue.recommendation;

        const fatigueFill = document.getElementById('fatigue-fill');
        if (fatigue.index > 70) fatigueFill.style.background = '#ef4444';
        else if (fatigue.index > 40) fatigueFill.style.background = '#facc15';
        else fatigueFill.style.background = '#10b981';
    }

    renderCharts(data) {
        const { simulation, volatility } = data;

        // Confidence Gauge
        const ctxGauge = document.getElementById('confidenceGauge').getContext('2d');
        this.confidenceGauge = new Chart(ctxGauge, {
            type: 'doughnut',
            data: {
                datasets: [{
                    data: [simulation.confidenceLevel, 100 - simulation.confidenceLevel],
                    backgroundColor: ['#3b82f6', 'rgba(255,255,255,0.05)'],
                    borderWidth: 0,
                    cutout: '85%',
                    circumference: 180,
                    rotation: 270
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { tooltip: { enabled: false } }
            }
        });

        // Volatility Chart
        const ctxVol = document.getElementById('volatilityChart').getContext('2d');
        this.volatilityChart = new Chart(ctxVol, {
            type: 'line',
            data: {
                labels: volatility.map(v => v.sprint),
                datasets: [{
                    label: 'Actual Velocity',
                    data: volatility.map(v => v.actual),
                    borderColor: '#3b82f6',
                    tension: 0.4,
                    fill: false
                }, {
                    label: 'Estimated',
                    data: volatility.map(v => v.estimated),
                    borderColor: 'rgba(255,255,255,0.2)',
                    borderDash: [5, 5],
                    tension: 0.4,
                    fill: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { grid: { color: 'rgba(255,255,255,0.05)' } },
                    x: { grid: { display: false } }
                }
            }
        });
    }

    async runSimulation() {
        const addedFeatures = parseInt(document.getElementById('scope-adj').value);
        const velocityChange = parseInt(document.getElementById('velocity-adj').value);

        try {
            const response = await fetch('/api/sprint-forecaster/simulate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ adjustments: { addedFeatures, velocityChange } })
            });
            const result = await response.json();

            if (result.success) {
                const sim = result.data;
                this.confidenceGauge.data.datasets[0].data = [sim.confidenceLevel, 100 - sim.confidenceLevel];
                this.confidenceGauge.update();

                document.getElementById('confidence-percent').innerText = `${sim.confidenceLevel}%`;

                const impactText = document.getElementById('simulation-impact');
                if (sim.confidenceLevel < 50) {
                    impactText.innerHTML = `<span style="color:#ef4444!important"><i class="ri-error-warning-fill"></i> High Risk:</span> Only ${sim.confidenceLevel}% chance of completion with these adjustments.`;
                } else if (sim.confidenceLevel < 80) {
                    impactText.innerHTML = `<span style="color:#facc15!important"><i class="ri-alert-fill"></i> Caution:</span> Deadline is tight. Consider cutting scope.`;
                } else {
                    impactText.innerHTML = `<span style="color:#10b981!important"><i class="ri-checkbox-circle-fill"></i> Healthy:</span> High probability (${sim.confidenceLevel}%) of hitting the target.`;
                }
            }
        } catch (error) {
            console.error('Simulation failed:', error);
        }
    }

    animateValue(id, value, suffix = '') {
        const obj = document.getElementById(id);
        gsap.to(obj, {
            innerHTML: value,
            duration: 1.5,
            snap: { innerHTML: 1 },
            onUpdate: function () {
                obj.innerHTML = Math.round(obj.innerHTML) + suffix;
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new SprintForecaster();
});
