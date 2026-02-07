/**
 * Quantum Sprint Planner - Frontend Logic
 */

class SprintPlanner {
    constructor() {
        this.tasks = [];
        this.team = [];
        this.assignments = [];
        this.chart3D = null;

        this.init();
    }

    async init() {
        this.init3D();
        await this.loadUniverse('universe_speed');
        this.setupDragAndDrop();
    }

    init3D() {
        // Simple Three.js setup for Heatmap
        const container = document.getElementById('heatmap-viewport');
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0f172a);

        const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 1000);
        camera.position.set(0, 10, 20);
        camera.lookAt(0, 0, 0);

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        container.appendChild(renderer.domElement);

        this.chart3D = { scene, camera, renderer, bars: [] };

        const light = new THREE.AmbientLight(0xffffff, 0.8);
        scene.add(light);
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
        dirLight.position.set(10, 20, 10);
        scene.add(dirLight);

        const animate = () => {
            requestAnimationFrame(animate);
            renderer.render(scene, camera);
        };
        animate();
    }

    async loadUniverse(universeId) {
        // Mock payload - in real app would get tasks from backlog
        try {
            const res = await fetch('/api/sprint/optimize', { method: 'POST', body: JSON.stringify({}) }); // tasks: [] implicit
            const response = await res.json();

            if (response.success) {
                this.team = response.data.team;
                const plan = response.data.plans.find(p => p.id === universeId) || response.data.plans[0];
                this.assignments = plan.assignments;

                this.renderBoard();
                this.renderHeatmap();
                this.updateStats({
                    probability: plan.probability * 100,
                    burnoutRisk: plan.burnoutRisk
                });
            }
        } catch (e) {
            console.error(e);
        }
    }

    renderBoard() {
        const lanesContainer = document.getElementById('team-lanes-container');
        lanesContainer.innerHTML = '';

        this.team.forEach(dev => {
            const devTasks = this.assignments.filter(a => a.assignedTo === dev.id);
            const lane = document.createElement('div');
            lane.className = 'dev-lane';
            lane.innerHTML = `
                <div class="dev-header">
                    <span>${dev.name} (${dev.role})</span>
                    <span>Cap: ${dev.velocity * 10} pts</span>
                </div>
                <div class="lane-dropzone" data-dev-id="${dev.id}"></div>
            `;

            const dropzone = lane.querySelector('.lane-dropzone');

            devTasks.forEach(task => {
                const card = document.createElement('div');
                card.className = 'task-card';
                card.setAttribute('data-id', task.taskId);
                card.setAttribute('data-points', 5); // Mock points
                card.innerHTML = `${task.taskName} <span class="points">5 pts</span>`;
                dropzone.appendChild(card);
            });

            lanesContainer.appendChild(lane);
        });
    }

    renderHeatmap() {
        // Clear old bars
        this.chart3D.bars.forEach(b => this.chart3D.scene.remove(b));
        this.chart3D.bars = [];

        // Visualize capacity vs load
        const spacing = 3;
        const totalWidth = (this.team.length - 1) * spacing;

        this.team.forEach((dev, index) => {
            const devLoad = this.assignments.filter(a => a.assignedTo === dev.id).length * 5;
            const capacity = dev.velocity * 10;
            const ratio = devLoad / capacity;

            const height = Math.max(1, ratio * 10);
            let color = 0x10b981; // Green
            if (ratio > 0.8) color = 0xfacc15; // Yellow
            if (ratio > 1.0) color = 0xef4444; // Red

            const geometry = new THREE.BoxGeometry(2, height, 2);
            geometry.translate(0, height / 2, 0);
            const material = new THREE.MeshPhongMaterial({ color });
            const bar = new THREE.Mesh(geometry, material);

            bar.position.x = (index * spacing) - (totalWidth / 2);

            this.chart3D.scene.add(bar);
            this.chart3D.bars.push(bar);
        });
    }

    setupDragAndDrop() {
        interact('.task-card').draggable({
            listeners: {
                move(event) {
                    const target = event.target;
                    const x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
                    const y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

                    target.style.transform = `translate(${x}px, ${y}px)`;
                    target.setAttribute('data-x', x);
                    target.setAttribute('data-y', y);
                    target.style.zIndex = 100;
                }
            }
        });

        interact('.lane-dropzone').dropzone({
            accept: '.task-card',
            overlap: 0.5,
            ondrop: async (event) => {
                const card = event.relatedTarget;
                const dropzone = event.target;
                const devId = dropzone.getAttribute('data-dev-id');
                const taskId = card.getAttribute('data-id');

                // Snap into place (DOM Move)
                dropzone.appendChild(card);
                card.style.transform = 'translate(0, 0)';
                card.setAttribute('data-x', 0);
                card.setAttribute('data-y', 0);
                card.style.zIndex = 1;

                // Update assignments model
                const assignment = this.assignments.find(a => a.taskId == taskId);
                if (assignment) {
                    assignment.assignedTo = devId;
                    await this.recalculate();
                }
            }
        });
    }

    async recalculate() {
        try {
            const res = await fetch('/api/sprint/recalculate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ assignments: this.assignments })
            });

            const data = await res.json();
            if (data.success) {
                this.renderHeatmap(); // Update 3D view
                this.updateStats({
                    probability: data.data.probability,
                    burnoutRisk: data.data.burnoutRisk
                });
            }
        } catch (e) {
            console.error(e);
        }
    }

    updateStats(stats) {
        document.getElementById('stat-prob').textContent = Math.round(stats.probability) + '%';
        const riskEl = document.getElementById('stat-risk');
        riskEl.textContent = stats.burnoutRisk;
        riskEl.style.color = stats.burnoutRisk === 'High' ? '#ef4444' : '#10b981';
    }
}

// Global hook
let planner;
window.loadUniverse = function () {
    const val = document.getElementById('universe-select').value;
    planner.loadUniverse(val);
}

window.autoOptimize = function () {
    alert("AI Constraint Solver re-running... finding optimal distribution.");
    planner.loadUniverse('universe_quality'); // Switch to best plan
}

document.addEventListener('DOMContentLoaded', () => {
    planner = new SprintPlanner();
});
