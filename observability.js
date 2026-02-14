/**
 * XAYTHEON - Hyper-Scale "Live-Wire" 3D Observability
 * 
 * Logic for 3D Topology Map, Real-Time Pulses, 
 * Bottleneck Detection and Flame Projection.
 */

class TracePulse3D {
    constructor() {
        this.canvas = document.getElementById('observability-canvas');
        this.nodes = [];
        this.links = [];
        this.pulses = [];
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.hoveredNode = null;

        this.topology = [
            { id: 'gateway', name: 'API Gateway', pos: [0, 40, 0], type: 'core', latency: 45 },
            { id: 'auth', name: 'Auth Service', pos: [-40, 10, -20], type: 'service', latency: 120 },
            { id: 'user', name: 'User Service', pos: [40, 10, -20], type: 'service', latency: 85 },
            { id: 'payment', name: 'Payment Engine', pos: [0, 10, 40], type: 'critical', latency: 450 }, // Latency spike!
            { id: 'db', name: 'DB Master', pos: [0, -30, 0], type: 'data', latency: 15 },
            { id: 'redis', name: 'Redis Cache', pos: [50, -10, 50], type: 'cache', latency: 5 },
            { id: 'ai', name: 'AI Inference', pos: [-50, -10, 50], type: 'ai', latency: 800 } // Bottleneck
        ];

        this.connections = [
            ['gateway', 'auth'], ['gateway', 'user'], ['gateway', 'payment'],
            ['auth', 'db'], ['user', 'db'], ['payment', 'db'],
            ['user', 'redis'], ['payment', 'ai'], ['ai', 'db']
        ];

        this.init();
    }

    init() {
        this.setupScene();
        this.createTopology();
        this.setupLighting();
        this.animate();
        this.startPulseGenerator();
        this.runAIDiagnosis();

        window.addEventListener('resize', () => this.onWindowResize());
        window.addEventListener('mousemove', (e) => this.onMouseMove(e));

        // Stats update loop
        setInterval(() => this.updateStats(), 2000);
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x050508);
        this.scene.fog = new THREE.FogExp2(0x050508, 0.005);

        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
        this.camera.position.set(120, 100, 120);

        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.autoRotate = true;
        this.controls.autoRotateSpeed = 0.5;
    }

    setupLighting() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);

        const pointLight = new THREE.PointLight(0x3b82f6, 1, 500);
        pointLight.position.set(50, 100, 50);
        this.scene.add(pointLight);

        const purpleLight = new THREE.PointLight(0x8b5cf6, 0.5, 300);
        purpleLight.position.set(-50, -50, -50);
        this.scene.add(purpleLight);
    }

    createTopology() {
        const nodeGeometry = new THREE.SphereGeometry(3, 32, 32);

        // Create Nodes
        this.topology.forEach(data => {
            const material = new THREE.MeshPhongMaterial({
                color: this.getNodeColor(data.type),
                emissive: this.getNodeColor(data.type),
                emissiveIntensity: 0.5,
                shininess: 100
            });

            const node = new THREE.Mesh(nodeGeometry, material);
            node.position.set(...data.pos);
            node.userData = data;

            // Add glow ring
            const ringGeo = new THREE.TorusGeometry(5, 0.1, 16, 100);
            const ringMat = new THREE.MeshBasicMaterial({ color: this.getNodeColor(data.type), transparent: true, opacity: 0.3 });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.rotation.x = Math.PI / 2;
            node.add(ring);

            this.scene.add(node);
            this.nodes.push(node);
        });

        // Create Links
        this.connections.forEach(([sourceId, targetId]) => {
            const source = this.nodes.find(n => n.userData.id === sourceId);
            const target = this.nodes.find(n => n.userData.id === targetId);

            if (source && target) {
                const points = [source.position, target.position];
                const geometry = new THREE.BufferGeometry().setFromPoints(points);

                // Color link based on latency (if high, turn red/yellow)
                const highLatency = source.userData.latency > 300 || target.userData.latency > 300;
                const lineColor = highLatency ? 0xef4444 : 0x334155;

                const material = new THREE.LineBasicMaterial({
                    color: lineColor,
                    transparent: true,
                    opacity: 0.5
                });

                const line = new THREE.Line(geometry, material);
                this.scene.add(line);
                this.links.push({ line, source, target, highLatency });
            }
        });
    }

    getNodeColor(type) {
        switch (type) {
            case 'core': return 0xffffff;
            case 'critical': return 0xef4444;
            case 'data': return 0x10b981;
            case 'cache': return 0x60a5fa;
            case 'ai': return 0x8b5cf6;
            default: return 0x3b82f6;
        }
    }

    startPulseGenerator() {
        setInterval(() => {
            // Pick a random connection to send a pulse through
            const link = this.links[Math.floor(Math.random() * this.links.length)];
            this.createPulse(link);
        }, 800);
    }

    createPulse(link) {
        const pulseGeo = new THREE.SphereGeometry(0.8, 16, 16);
        const pulseMat = new THREE.MeshBasicMaterial({
            color: link.highLatency ? 0xef4444 : 0x3b82f6,
            transparent: true,
            opacity: 0.8
        });

        const pulse = new THREE.Mesh(pulseGeo, pulseMat);
        this.scene.add(pulse);

        // Latency determines speed (1/L)
        const latency = (link.source.userData.latency + link.target.userData.latency) / 2;
        const duration = Math.max(1, latency / 100); // Higher latency = longer duration (slower pulse)

        pulse.position.copy(link.source.position);

        gsap.to(pulse.position, {
            x: link.target.position.x,
            y: link.target.position.y,
            z: link.target.position.z,
            duration: duration,
            ease: "none",
            onComplete: () => {
                this.scene.remove(pulse);
            }
        });
    }

    onMouseMove(event) {
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.nodes);

        if (intersects.length > 0) {
            const node = intersects[0].object;
            if (this.hoveredNode !== node) {
                this.onNodeHover(node);
            }
            this.updateTooltip(event, node.userData.name);
        } else {
            if (this.hoveredNode) this.onNodeUnhover();
            this.hideTooltip();
        }
    }

    onNodeHover(node) {
        this.hoveredNode = node;
        document.getElementById('node-tooltip').style.display = 'block';

        gsap.to(node.scale, { x: 1.5, y: 1.5, z: 1.5, duration: 0.3 });
        node.material.emissiveIntensity = 1.0;

        this.show3DFlameGraph(node);
    }

    onNodeUnhover() {
        if (this.flameGroup) {
            this.scene.remove(this.flameGroup);
            this.flameGroup = null;
        }

        if (this.hoveredNode) {
            gsap.to(this.hoveredNode.scale, { x: 1, y: 1, z: 1, duration: 0.3 });
            this.hoveredNode.material.emissiveIntensity = 0.5;
        }
        this.hoveredNode = null;
    }

    show3DFlameGraph(node) {
        if (this.flameGroup) this.scene.remove(this.flameGroup);

        this.flameGroup = new THREE.Group();
        const data = node.userData;

        // Mock layers for flame graph
        const layers = [
            { name: 'Kernel', width: 20, color: 0x450a0a },
            { name: 'Runtime', width: 18, color: 0x7f1d1d },
            { name: 'Middleware', width: 15, color: 0xb91c1c },
            { name: 'Logic', width: 12, color: 0xef4444 },
            { name: 'Wait', width: 8, color: data.latency > 300 ? 0xf87171 : 0x1e3a8a }
        ];

        layers.forEach((l, i) => {
            const geometry = new THREE.BoxGeometry(l.width, 2, 2);
            const material = new THREE.MeshPhongMaterial({
                color: l.color,
                transparent: true,
                opacity: 0.8,
                emissive: l.color,
                emissiveIntensity: 0.5
            });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.y = i * 2.5 + 10;
            mesh.position.x = (20 - l.width) / 2; // Align left
            this.flameGroup.add(mesh);
        });

        this.flameGroup.position.copy(node.position);
        this.scene.add(this.flameGroup);

        // Animate entrance
        this.flameGroup.scale.set(0, 0, 0);
        gsap.to(this.flameGroup.scale, { x: 1, y: 1, z: 1, duration: 0.5, ease: "back.out(1.7)" });
    }

    updateTooltip(e, text) {
        const tooltip = document.getElementById('node-tooltip');
        tooltip.innerHTML = text;
        tooltip.style.left = (e.clientX + 15) + 'px';
        tooltip.style.top = (e.clientY + 15) + 'px';
    }

    hideTooltip() {
        document.getElementById('node-tooltip').style.display = 'none';
    }

    runAIDiagnosis() {
        const alertsContainer = document.getElementById('alerts-container');

        // Simulate high-latencies detection
        setTimeout(() => {
            this.addAlert('bottleneck', 'bottleneck', 'Payment Engine response time spiked to 450ms. AI suggests scaling instances by 2x.');
        }, 3000);

        setTimeout(() => {
            this.addAlert('ai', 'optimization', 'AI Inference node is under-utilized (12% CPU). Consider down-sizing to save cost.');
        }, 8000);
    }

    addAlert(type, titleKey, message) {
        const alertsContainer = document.getElementById('alerts-container');
        const alert = document.createElement('div');
        alert.className = 'alert-card';
        if (type === 'ai') alert.style.borderColor = 'var(--accent-purple)';

        const title = window.i18n ? window.i18n.t(`observability.alerts.${titleKey}`) : titleKey;

        alert.innerHTML = `
            <h4>${title}</h4>
            <p>${message}</p>
        `;

        alertsContainer.appendChild(alert);

        // Remove after 10s
        setTimeout(() => {
            alert.style.opacity = '0';
            setTimeout(() => alert.remove(), 500);
        }, 10000);
    }

    updateStats() {
        const avgLat = Math.floor(Math.random() * 50) + 120;
        document.getElementById('stat-latency').textContent = `${avgLat} ms`;
        document.getElementById('stat-throughput').textContent = `${Math.floor(Math.random() * 500) + 1200} req/s`;

        const health = avgLat > 200 ? '84%' : '98%';
        document.getElementById('stat-health').textContent = health;
        document.getElementById('stat-health').style.color = avgLat > 200 ? 'var(--accent-red)' : 'var(--accent-green)';
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}

// Start the application
document.addEventListener('DOMContentLoaded', () => {
    new TracePulse3D();
});
