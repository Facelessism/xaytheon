/**
 * Refactor Safety Net - Frontend Logic
 */

let confidenceChart = null;

document.addEventListener('DOMContentLoaded', () => {
    initChart();
});

function initChart() {
    const ctx = document.getElementById('confidenceGauge').getContext('2d');
    confidenceChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Confidence', 'Risk'],
            datasets: [{
                data: [0, 100],
                backgroundColor: ['#10b981', '#334155'],
                borderWidth: 0,
                cutout: '80%',
                circumference: 180,
                rotation: 270
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { tooltip: { enabled: false }, legend: { display: false } }
        }
    });
}

function updateChart(score) {
    confidenceChart.data.datasets[0].data = [score, 100 - score];

    // Dynamic Color
    let color = '#10b981'; // Green
    if (score < 70) color = '#f59e0b'; // Orange
    if (score < 50) color = '#ef4444'; // Red

    confidenceChart.data.datasets[0].backgroundColor[0] = color;
    confidenceChart.update();

    // Text Animation
    const scoreEl = document.getElementById('score-val');
    gsap.to(scoreEl, {
        innerHTML: score,
        snap: { innerHTML: 1 },
        duration: 1.5,
        ease: 'power2.out',
        onUpdate: function () {
            scoreEl.innerHTML = Math.round(this.targets()[0].innerHTML);
        }
    });
}

async function createCheckpoint() {
    try {
        const res = await fetch('/api/refactor/checkpoint', { method: 'POST' });
        const data = await res.json();

        if (data.success) {
            document.getElementById('checkpoint-badge').classList.remove('hidden');
            alert(data.message);
        }
    } catch (e) {
        console.error(e);
    }
}

async function analyzeRefactor() {
    const filePath = document.getElementById('target-file').value;
    const codeSnippet = document.getElementById('code-editor').value;

    document.getElementById('safety-summary').textContent = 'Simulating blast radius across dependency graph...';

    try {
        const res = await fetch('/api/refactor/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filePath, codeSnippet })
        });

        const result = await res.json();
        if (result.success) {
            const { blastRadius, confidence, safetyTests } = result.data;

            // Update UI
            updateChart(confidence.score);
            document.getElementById('safety-summary').textContent = confidence.summary;

            // Render Blast list
            const list = document.getElementById('blast-list');
            list.innerHTML = blastRadius.affectedFiles.map(f => `
                <li class="blast-item">
                    <div>
                        <div style="font-weight:bold">${f.path.split('/').pop()}</div>
                        <div style="font-size:0.75rem; color:#94a3b8">${f.reason}</div>
                    </div>
                    <span class="risk-tag risk-${f.risk}">${f.risk}</span>
                </li>
            `).join('');

            // Safety Tests
            const testSection = document.getElementById('safety-tests-section');
            const rollbackBtn = document.getElementById('rollback-btn');

            if (confidence.requiresSafetyTests) {
                testSection.classList.remove('hidden');
                document.getElementById('test-preview').textContent = safetyTests.map(t => t.testCode).join('\n');
                rollbackBtn.classList.remove('hidden');
            } else {
                testSection.classList.add('hidden');
                rollbackBtn.classList.add('hidden');
            }
        }
    } catch (e) {
        console.error(e);
        document.getElementById('safety-summary').textContent = 'Analysis Failed. Check console.';
    }
}

async function rollback() {
    if (!confirm("Are you sure? This will revert code and database state.")) return;

    try {
        const res = await fetch('/api/refactor/rollback', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
            alert(data.message);
            location.reload();
        }
    } catch (e) {
        console.error(e);
    }
}
