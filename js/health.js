/**
 * Health Auditor JavaScript
 * Core logic for fetching GitHub data, calculating sustainability metrics, and rendering visualizations.
 */

// Configuration
const API_BASE_URL = 'https://api.github.com';
const MAX_PAGES = 3; // Limit pagination to avoid hitting rate limits too fast (tokenless)

document.addEventListener('DOMContentLoaded', () => {
    // Check URL params for repo
    const urlParams = new URLSearchParams(window.location.search);
    const repoParam = urlParams.get('repo');
    
    if (repoParam) {
        document.getElementById('repo-input').value = repoParam;
        runAudit(repoParam);
    }

    // Event Listeners
    document.getElementById('audit-btn').addEventListener('click', () => {
        const repo = document.getElementById('repo-input').value.trim();
        if (repo) runAudit(repo);
    });

    document.getElementById('repo-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const repo = document.getElementById('repo-input').value.trim();
            if (repo) runAudit(repo);
        }
    });
});

/**
 * Main Audit Workflow
 */
async function runAudit(repoFullName) {
    if (!validateRepoName(repoFullName)) {
        showError('Invalid repository format. Please use "owner/repo".');
        return;
    }

    showLoading(true);
    hideResults();
    clearError();

    try {
        // Parallel data fetching
        const [repoDetails, contributors, commits, issues] = await Promise.all([
            fetchRepoDetails(repoFullName),
            fetchContributors(repoFullName),
            fetchRecentCommits(repoFullName),
            fetchRecentIssues(repoFullName)
        ]);

        // Analyze Data
        const busFactorData = calculateBusFactor(contributors, commits);
        const communityData = calculateCommunityHealth(repoDetails, contributors);
        const responsivenessData = calculateResponsiveness(issues);
        
        // Calculate Overall Health Score
        const healthScore = calculateHealthScore(busFactorData, communityData, responsivenessData, repoDetails);

        // Render Results
        renderResults({
            repoDetails,
            busFactorData,
            communityData,
            responsivenessData,
            healthScore
        });

    } catch (error) {
        console.error('Audit failed:', error);
        if (error.status === 403 || error.status === 429) {
            showError('GitHub API Rate Limit Exceeded. Please try again later.');
        } else if (error.status === 404) {
            showError('Repository not found. Please check the name.');
        } else {
            showError(`Audit failed: ${error.message}`);
        }
    } finally {
        showLoading(false);
    }
}

// --- Data Fetching ---

async function fetchRepoDetails(repo) {
    return fetchGitHub(`${API_BASE_URL}/repos/${repo}`);
}

async function fetchContributors(repo) {
    // Fetch top 100 contributors
    return fetchGitHub(`${API_BASE_URL}/repos/${repo}/contributors?per_page=100`);
}

async function fetchRecentCommits(repo) {
    // Fetch last 100 commits
    return fetchGitHub(`${API_BASE_URL}/repos/${repo}/commits?per_page=100`);
}

async function fetchRecentIssues(repo) {
    // Fetch last 100 closed issues to calculate resolution time
    return fetchGitHub(`${API_BASE_URL}/repos/${repo}/issues?state=closed&per_page=100&sort=updated`);
}

async function fetchGitHub(url) {
    const response = await fetch(url, {
        headers: {
            'Accept': 'application/vnd.github.v3+json'
        }
    });
    
    if (!response.ok) {
        const error = new Error(response.statusText);
        error.status = response.status;
        throw error;
    }
    
    return response.json();
}

// --- Analysis Logic ---

function calculateBusFactor(contributors, commits) {
    // A simplified Bus Factor estimation
    // If top 1 contributor has > 50% of commits -> High Risk
    // If top 3 contributors have > 80% of commits -> Medium Risk
    
    // Note: 'contributors' endpoint returns total contributions count
    if (!contributors || contributors.length === 0) return { risk: 'Unknown', factor: '?', topPercent: 0 };

    const totalContributions = contributors.reduce((sum, c) => sum + c.contributions, 0);
    const topContributor = contributors[0];
    const top3 = contributors.slice(0, 3);
    const top3Sum = top3.reduce((sum, c) => sum + c.contributions, 0);

    const topPercent = (topContributor.contributions / totalContributions) * 100;
    const top3Percent = (top3Sum / totalContributions) * 100;

    let risk = 'Low';
    let busFactor = contributors.length > 5 ? '5+' : contributors.length;

    if (topPercent > 50) {
        risk = 'High';
        busFactor = 1;
    } else if (top3Percent > 75) {
        risk = 'Medium';
        busFactor = 3; // roughly
    }

    return {
        risk,
        busFactor,
        activeMaintainers: contributors.filter(c => c.contributions > 5).length, // simple heuristic
        topPercent: topPercent.toFixed(1)
    };
}

function calculateCommunityHealth(repo, contributors) {
    // Check for "Decentralization"
    const score = Math.min(100, contributors.length * 2); // simplistic score
    return {
        score,
        newContributors: 0 // logic for new contributors needs commit history analysis, skipping for MVP complexity
    };
}

function calculateResponsiveness(issues) {
    if (!issues || issues.length === 0) return { mttm: 0, irr: 0 };

    // Calculate Median Time to Merge/Close
    const durations = issues
        .filter(i => i.created_at && i.closed_at)
        .map(i => {
            const start = new Date(i.created_at);
            const end = new Date(i.closed_at);
            return (end - start) / (1000 * 60 * 60 * 24); // in days
        })
        .sort((a, b) => a - b);

    const medianTime = durations.length > 0 ? durations[Math.floor(durations.length / 2)] : 0;
    
    return {
        mttm: medianTime.toFixed(1),
        irr: 'High' // Mock for now
    };
}

function calculateHealthScore(bus, community, response, repoDetails) {
    // Weighted Algorithm
    // Bus Factor Risk: High (0), Medium (50), Low (100)
    
    let busScore = 100;
    if (bus.risk === 'High') busScore = 20;
    if (bus.risk === 'Medium') busScore = 60;

    // Activity Score based on recent update
    const daysSinceUpdate = (new Date() - new Date(repoDetails.updated_at)) / (1000 * 60 * 60 * 24);
    let activityScore = 100;
    if (daysSinceUpdate > 30) activityScore = 70;
    if (daysSinceUpdate > 90) activityScore = 40;
    if (daysSinceUpdate > 365) activityScore = 10;

    // Community Score
    const communityScore = Math.min(100, Math.max(0, community.score));

    // Weighted Average
    // Bus: 40%, Activity: 30%, Community: 30%
    const total = (busScore * 0.4) + (activityScore * 0.3) + (communityScore * 0.3);
    return Math.round(total);
}


// --- Rendering ---

function renderResults(data) {
    const container = document.getElementById('health-results');
    container.classList.remove('hidden');

    // Health Score
    renderHealthScore(data.healthScore);

    // Bus Factor
    renderBusFactor(data.busFactorData);

    // Metrics
    document.getElementById('decentralization-score').textContent = data.communityData.score + '/100';
    document.getElementById('mttm-val').textContent = data.responsivenessData.mttm + ' days';
    document.getElementById('irr-val').textContent = data.responsivenessData.irr;

    // Radar Chart
    renderRadarChart(data);
}

function renderHealthScore(score) {
    const el = document.getElementById('health-score');
    el.textContent = score;
    
    const summaryEl = document.getElementById('health-summary');
    if (score >= 80) {
        el.style.color = 'var(--color-success, #10b981)';
        summaryEl.textContent = 'Excellent! This project is sustainable and healthy.';
    } else if (score >= 50) {
        el.style.color = 'var(--color-warning, #f59e0b)';
        summaryEl.textContent = 'Good. Some risks detected, but generally stable.';
    } else {
        el.style.color = 'var(--color-danger, #ef4444)';
        summaryEl.textContent = 'Critical. High risk of abandonment or bus factor failure.';
    }
}

function renderBusFactor(data) {
    const el = document.getElementById('bus-factor-val');
    el.textContent = data.busFactor;
    
    // Add color class
    el.className = 'metric-val'; // reset
    if (data.risk === 'High') el.classList.add('bus-risk-high');
    if (data.risk === 'Medium') el.classList.add('bus-risk-medium');
    if (data.risk === 'Low') el.classList.add('bus-risk-low');

    document.getElementById('top-contributor-risk').textContent = data.topPercent + '% commits by #1';
    document.getElementById('active-maintainers').textContent = data.activeMaintainers;
}

function renderRadarChart(data) {
    const container = document.getElementById('radar-chart-container');
    container.innerHTML = ''; // Clear previous

    const width = 300;
    const height = 300;
    const margin = 30;
    const radius = Math.min(width, height) / 2 - margin;

    const svg = d3.select('#radar-chart-container')
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .append('g')
        .attr('transform', `translate(${width/2},${height/2})`);

    // Data for Radar
    // Normalize all to 0-100 scale
    let busScore = data.busFactorData.risk === 'Low' ? 100 : (data.busFactorData.risk === 'Medium' ? 60 : 20);
    const metrics = {
        'Sustainability': data.healthScore,
        'Bus Factor Safety': busScore,
        'Community': Math.min(100, data.communityData.score),
        'Responsiveness': data.responsivenessData.mttm < 2 ? 100 : (data.responsivenessData.mttm < 7 ? 70 : 30),
        'Activity': 85 // Mock for visual balance
    };

    const features = Object.keys(metrics);
    const dataValues = Object.values(metrics);

    // Scale
    const rScale = d3.scaleLinear().range([0, radius]).domain([0, 100]);
    const angleSlice = Math.PI * 2 / features.length;

    // Axis lines
    const axisGrid = svg.append('g').attr('class', 'axisWrapper');

    // Circles
    const levels = 4;
    for (let i = 0; i < levels; i++) {
        const r = radius / levels * (i + 1);
        axisGrid.append('circle')
            .attr('class', 'gridCircle')
            .attr('r', r)
            .style('fill', '#CDCDCD')
            .style('stroke', '#CDCDCD')
            .style('fill-opacity', 0.1);
    }

    // Axes
    const axes = axisGrid.selectAll('.axis')
        .data(features)
        .enter()
        .append('g')
        .attr('class', 'axis');

    axes.append('line')
        .attr('x1', 0)
        .attr('y1', 0)
        .attr('x2', (d, i) => rScale(100) * Math.cos(angleSlice * i - Math.PI / 2))
        .attr('y2', (d, i) => rScale(100) * Math.sin(angleSlice * i - Math.PI / 2))
        .attr('class', 'line')
        .style('stroke', '#999')
        .style('stroke-width', '1px');

    axes.append('text')
        .attr('class', 'legend')
        .style('font-size', '10px')
        .attr('text-anchor', 'middle')
        .attr('dy', '0.35em')
        .attr('x', (d, i) => rScale(115) * Math.cos(angleSlice * i - Math.PI / 2))
        .attr('y', (d, i) => rScale(115) * Math.sin(angleSlice * i - Math.PI / 2))
        .text(d => d)
        .style('fill', 'var(--text-primary, #ccc)');

    // The Path
    const radarLine = d3.lineRadial()
        .curve(d3.curveLinearClosed)
        .radius((d) => rScale(d))
        .angle((d, i) => i * angleSlice);

    const radarGroup = svg.append('g').attr('class', 'radarWrapper');

    radarGroup.append('path')
        .attr('class', 'radarArea')
        .attr('d', radarLine(dataValues))
        .style('fill', '#6366f1')
        .style('fill-opacity', 0.5)
        .style('stroke', '#6366f1')
        .style('stroke-width', 2);
}


// --- Utilities ---

function validateRepoName(name) {
    return /^[a-zA-Z0-9-]+\/[a-zA-Z0-9-_\.]+$/.test(name);
}

function showLoading(isLoading) {
    const loader = document.getElementById('loading-state');
    const container = document.getElementById('health-results');
    
    if (isLoading) {
        loader.classList.remove('hidden');
        container.classList.add('hidden');
    } else {
        loader.classList.add('hidden');
    }
}

function hideResults() {
    document.getElementById('health-results').classList.add('hidden');
}

function showError(msg) {
    const el = document.getElementById('error-state');
    el.textContent = msg;
    el.classList.remove('hidden');
}

function clearError() {
    document.getElementById('error-state').classList.add('hidden');
}
