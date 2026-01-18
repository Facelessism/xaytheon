document.addEventListener('DOMContentLoaded', () => {
    const svgContainer = document.getElementById('heatmap-svg-container');
    const exportBtn = document.getElementById('export-btn');
    const themeBtns = document.querySelectorAll('.theme-btn');
    const currentStreakEl = document.getElementById('current-streak');
    const longestStreakEl = document.getElementById('longest-streak');
    const totalAttribEl = document.getElementById('total-attrib');
    const bestDayEl = document.getElementById('best-day');
    const bestHourEl = document.getElementById('best-hour');

    // Themes configuration
    const themes = {
        default: ['rgba(255,255,255,0.05)', '#064e3b', '#059669', '#10b981', '#34d399'], // Greenish
        fire: ['rgba(255,255,255,0.05)', '#7c2d12', '#c2410c', '#ea580c', '#fb923c'], // Orange/Red
        ocean: ['rgba(255,255,255,0.05)', '#0c4a6e', '#0284c7', '#0ea5e9', '#38bdf8'], // Blue
        forest: ['rgba(255,255,255,0.05)', '#14532d', '#16a34a', '#22c55e', '#4ade80'], // Pure Green
        pink: ['rgba(255,255,255,0.05)', '#831843', '#db2777', '#f472b6', '#fbcfe8']  // Pink
    };

    let currentTheme = 'default';
    let contributionData = null;

    // Initialize
    fetchHeatmapData();

    // Event Listeners
    themeBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelector('.theme-btn.active').classList.remove('active');
            e.target.classList.add('active');
            currentTheme = e.target.dataset.theme;
            if (contributionData) renderHeatmap(contributionData.contributions);
            updateLegendColors();
        });
    });

    exportBtn.addEventListener('click', handleExport);

    async function fetchHeatmapData() {
        try {
            // Check IndexedDB cache first
            // Note: For simplicity in this demo, accessing API directly first, 
            // but structure allows implementation of cache check.

            const response = await fetch('/api/heatmap');
            if (!response.ok) throw new Error('Failed to fetch data');

            const data = await response.json();
            contributionData = data;

            renderHeatmap(data.contributions);
            updateInsights(data.insights, data.stats);
        } catch (error) {
            console.error('Data fetch error:', error);
            svgContainer.innerHTML = '<p style="color:red">Failed to load activity data.</p>';
        }
    }

    function renderHeatmap(contributions) {
        // SVG Parameters
        const squareSize = 12;
        const gap = 3;
        const weekWidth = squareSize + gap;
        const totalWeeks = 53;
        const height = (squareSize + gap) * 7 + 20; // 7 days + padding
        const width = totalWeeks * weekWidth + 40; // 53 weeks + padding

        // Create SVG element
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("width", "100%");
        svg.setAttribute("height", "100%");
        svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
        svg.style.fontFamily = "sans-serif";
        svg.style.fontSize = "10px";

        // Generate grid
        const today = new Date();
        // Start from 1 year ago (approx 52 weeks)
        // Align to previous Sunday
        const startDate = new Date();
        startDate.setDate(today.getDate() - 365);
        while (startDate.getDay() !== 0) {
            startDate.setDate(startDate.getDate() - 1);
        }

        const colors = themes[currentTheme];

        // Loop weeks
        for (let w = 0; w < totalWeeks; w++) {
            const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
            g.setAttribute("transform", `translate(${20 + w * weekWidth}, 20)`);

            // Loop days (0=Sun, 6=Sat)
            for (let d = 0; d < 7; d++) {
                const currentDate = new Date(startDate);
                currentDate.setDate(startDate.getDate() + (w * 7) + d);

                if (currentDate > today) break;

                const dateStr = currentDate.toISOString().split('T')[0];
                const count = contributions[dateStr] || 0;

                // Determine color level
                let level = 0;
                if (count > 0) level = 1;
                if (count > 3) level = 2;
                if (count > 6) level = 3;
                if (count > 9) level = 4;

                const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                rect.setAttribute("width", squareSize);
                rect.setAttribute("height", squareSize);
                rect.setAttribute("y", d * (squareSize + gap));
                rect.setAttribute("rx", 2);
                rect.setAttribute("fill", colors[level]);
                rect.setAttribute("data-date", dateStr);
                rect.setAttribute("data-count", count);

                // Tooltip title
                const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
                title.textContent = `${count} contributions on ${dateStr}`;
                rect.appendChild(title);

                g.appendChild(rect);
            }
            svg.appendChild(g);
        }

        // Add Month Labels
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        let currentMonth = -1;
        for (let w = 0; w < totalWeeks; w++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + (w * 7));
            const m = date.getMonth();

            if (m !== currentMonth) {
                const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
                text.setAttribute("x", 20 + w * weekWidth);
                text.setAttribute("y", 12);
                text.setAttribute("fill", "#94a3b8");
                text.textContent = monthNames[m];
                svg.appendChild(text);
                currentMonth = m;
            }
        }

        svgContainer.innerHTML = '';
        svgContainer.appendChild(svg);
    }

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
        return hour > 12 ? `${hour - 12} PM` : `${hour} AM`;
    }

    function updateLegendColors() {
        const colors = themes[currentTheme];
        const legendItems = document.querySelectorAll('.legend-colors li');
        legendItems.forEach((item, index) => {
            item.style.backgroundColor = colors[index];
        });
    }

    async function handleExport() {
        const element = document.getElementById('capture-area');
        try {
            const canvas = await html2canvas(element, {
                backgroundColor: '#0f172a', // Match card bg approximately or null
                scale: 2
            });
            const link = document.createElement('a');
            link.download = `xaytheon-heatmap-${new Date().getTime()}.png`;
            link.href = canvas.toDataURL();
            link.click();
        } catch (err) {
            console.error('Export failed', err);
            alert('Could not export image.');
        }
    }
});
