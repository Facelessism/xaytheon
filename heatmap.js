document.addEventListener('DOMContentLoaded', () => {
    const svgContainer = document.getElementById('heatmap-svg-container');
    const exportBtn = document.getElementById('export-btn');
    const themeBtns = document.querySelectorAll('.theme-btn');
    const currentStreakEl = document.getElementById('current-streak');
    const longestStreakEl = document.getElementById('longest-streak');
    const totalAttribEl = document.getElementById('total-attrib');
    const bestDayEl = document.getElementById('best-day');
    const bestHourEl = document.getElementById('best-hour');

    // -------------------------
    // Themes configuration
    // -------------------------
    const themes = {
        default: ['rgba(255,255,255,0.05)', '#064e3b', '#059669', '#10b981', '#34d399'],
        fire:    ['rgba(255,255,255,0.05)', '#7c2d12', '#c2410c', '#ea580c', '#fb923c'],
        ocean:   ['rgba(255,255,255,0.05)', '#0c4a6e', '#0284c7', '#0ea5e9', '#38bdf8'],
        forest:  ['rgba(255,255,255,0.05)', '#14532d', '#16a34a', '#22c55e', '#4ade80'],
        pink:    ['rgba(255,255,255,0.05)', '#831843', '#db2777', '#f472b6', '#fbcfe8']
    };

    let currentTheme = 'default';
    let contributionData = null;

    // -------------------------
    // Initialize
    // -------------------------
    fetchHeatmapData();

    // -------------------------
    // Theme buttons
    // -------------------------
    themeBtns.forEach(btn => {
        btn.addEventListener('click', e => {
            document.querySelector('.theme-btn.active')?.classList.remove('active');
            e.currentTarget.classList.add('active');
            currentTheme = e.currentTarget.dataset.theme;
            if (contributionData) renderHeatmap(contributionData.contributions);
            updateLegendColors();
        });
    });

    // -------------------------
    // Export button
    // -------------------------
    exportBtn.addEventListener('click', handleExport);

    // -------------------------
    // Fetch contribution data
    // -------------------------
    async function fetchHeatmapData() {
        try {
            const response = await fetch('/api/heatmap');
            if (!response.ok) throw new Error('Failed to fetch data');
            const data = await response.json();
            contributionData = data;

            renderHeatmap(data.contributions);
            updateInsights(data.insights, data.stats);
            updateLegendColors();
        } catch (error) {
            console.error('Data fetch error:', error);
            svgContainer.innerHTML = '<p style="color:red">Failed to load activity data.</p>';
        }
    }

    // -------------------------
    // Render SVG Heatmap
    // -------------------------
    function renderHeatmap(contributions) {
        const squareSize = 12;
        const gap = 3;
        const weekWidth = squareSize + gap;
        const totalWeeks = 53;
        const height = (squareSize + gap) * 7 + 20;
        const width = totalWeeks * weekWidth + 40;

        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("width", "100%");
        svg.setAttribute("height", "100%");
        svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
        svg.style.fontFamily = "sans-serif";
        svg.style.fontSize = "10px";

        const today = new Date();
        const startDate = new Date();
        startDate.setDate(today.getDate() - 365);
        while (startDate.getDay() !== 0) startDate.setDate(startDate.getDate() - 1);

        const colors = themes[currentTheme];

        // Weeks and days loop
        for (let w = 0; w < totalWeeks; w++) {
            const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
            g.setAttribute("transform", `translate(${20 + w * weekWidth}, 20)`);

            for (let d = 0; d < 7; d++) {
                const currentDate = new Date(startDate);
                currentDate.setDate(startDate.getDate() + w * 7 + d);
                if (currentDate > today) break;

                const dateStr = currentDate.toISOString().split('T')[0];
                const count = contributions[dateStr] || 0;

                // Determine level dynamically
                let level = 0;
                if (count > 0) level = Math.min(4, Math.floor(count / 3) + 1);

                const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                rect.setAttribute("width", squareSize);
                rect.setAttribute("height", squareSize);
                rect.setAttribute("y", d * (squareSize + gap));
                rect.setAttribute("rx", 2);
                rect.setAttribute("fill", colors[level]);
                rect.setAttribute("data-date", dateStr);
                rect.setAttribute("data-count", count);

                // Tooltip
                const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
                title.textContent = `${count} contributions on ${dateStr}`;
                rect.appendChild(title);

                g.appendChild(rect);
            }
            svg.appendChild(g);
        }

        // Month Labels
        const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
        let currentMonth = -1;
        for (let w = 0; w < totalWeeks; w++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + w * 7);
            const m = date.getMonth();
            if (m !== currentMonth) {
                const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
                text.setAttribute("x", 20 + w * weekWidth);
                text.setAttribute("y", 12);
                text.setAttribute("fill", "#94a3b8");
                text.setAttribute("font-size", "10px");
                text.textContent = monthNames[m];
                svg.appendChild(text);
                currentMonth = m;
            }
        }

        svgContainer.innerHTML = '';
        svgContainer.appendChild(svg);
    }

    // -------------------------
    // Update Stats / Insights
    // -------------------------
    function updateInsights(insights, stats) {
        currentStreakEl.textContent = `${stats.currentStreak} days`;
        longestStreakEl.textContent = `${stats.maxStreak} days`;
        totalAttribEl.textContent = stats.total;

        bestDayEl.textContent = `${insights.bestDay.name} (${insights.bestDay.count})`;
        bestHourEl.textContent = formatHour(insights.mostProductiveHour.hour);
    }

    function formatHour(hour) {
        if (hour === 0) return '12 AM';
        if (hour === 12) return '12 PM';
        return hour > 12 ? `${hour-12} PM` : `${hour} AM`;
    }

    // -------------------------
    // Update Legend Colors
    // -------------------------
    function updateLegendColors() {
        const colors = themes[currentTheme];
        document.querySelectorAll('.legend-colors li').forEach((item, i) => {
            item.style.backgroundColor = colors[i];
        });
    }

    // -------------------------
    // Export Heatmap
    // -------------------------
    async function handleExport() {
        const element = document.getElementById('capture-area');
        try {
            const canvas = await html2canvas(element, {
                backgroundColor: '#0f172a',
                scale: 2
            });
            const link = document.createElement('a');
            link.download = `xaytheon-heatmap-${Date.now()}.png`;
            link.href = canvas.toDataURL();
            link.click();
        } catch (err) {
            console.error('Export failed', err);
            alert('Could not export image.');
        }
    }
});
