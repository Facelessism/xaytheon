/**
 * XAYTHEON - 3D Dependency Graph Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    const graphDiv = document.getElementById('3d-graph');
    const analyzeBtn = document.getElementById('analyze-btn');
    const repoSearch = document.getElementById('repo-search');

    // Info Card Elements
    const nodeInfoCard = document.getElementById('node-info');
    const nodeNameEl = document.getElementById('node-name');
    const nodeVersionEl = document.getElementById('node-version');
    const nodeTypeEl = document.getElementById('node-type');
    const closeInfoBtn = document.getElementById('close-info');

    let Graph = null;

    // Initialize the graph
    initGraph();

    analyzeBtn.addEventListener('click', () => {
        const repo = repoSearch.value.trim();
        if (repo) {
            updateGraph(repo);
        }
    });

    closeInfoBtn.addEventListener('click', () => {
        nodeInfoCard.classList.add('hidden');
    });

    function initGraph() {
        Graph = ForceGraph3D()(graphDiv)
            .backgroundColor('#000000')
            .nodeLabel('name')
            .nodeColor('color')
            .nodeVal('val')
            .linkColor(() => 'rgba(255,255,255,0.1)')
            .linkWidth(1)
            .onNodeClick(node => {
                // Focus camera on node
                const distance = 40;
                const distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z);

                Graph.cameraPosition(
                    { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio }, // new pos
                    node, // lookAt
                    3000  // ms transition
                );

                // Show Info Card
                showNodeInfo(node);
            });

        // Load default data
        updateGraph('SatyamPandey-07/xaytheon');
    }

    async function updateGraph(repo) {
        try {
            analyzeBtn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Visualizing...';
            analyzeBtn.disabled = true;

            const response = await fetch(`/api/dependency/graph?repo=${repo}`);
            if (!response.ok) throw new Error('Failed to fetch graph data');

            const data = await response.json();

            Graph.graphData(data);

            // Apply some bloom effect if wanted, but keep it simple for now as per requirements
        } catch (error) {
            console.error(error);
            alert('Failed to generate dependency graph for this repository.');
        } finally {
            analyzeBtn.innerText = 'Visualize';
            analyzeBtn.disabled = false;
        }
    }

    function showNodeInfo(node) {
        nodeNameEl.textContent = node.name;
        nodeVersionEl.textContent = node.version || 'Latest';
        nodeTypeEl.textContent = node.type === 'root' ? 'Application Root' :
            node.type === 'dependency' ? 'Production Dependency' :
                'Development Dependency';

        nodeInfoCard.classList.remove('hidden');
    }
});
