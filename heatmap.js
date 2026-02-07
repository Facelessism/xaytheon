document.addEventListener('DOMContentLoaded', () => {

    /* =====================================================
       DOM ELEMENTS (SAFE)
    ===================================================== */
    const svgContainer = document.getElementById('heatmap-svg-container');
    const exportBtn = document.getElementById('export-btn');
    const themeBtns = document.querySelectorAll('.theme-btn');

    const currentStreakEl = document.getElementById('current-streak');
    const longestStreakEl = document.getElementById('longest-streak');
    const totalAttribEl = document.getElementById('total-attrib');
    const bestDayEl = document.getElementById('best-day');
    const bestHourEl = document.getElementById('best-hour');

    if (!svgContainer) {
        console.error('Heatmap container missing');
        return;
    }

    /* =====================================================
       THEME CONFIG
    ===================================================== */
    const themes = {
        default: ['rgba(255,255,255,0.06)', '#064e3b', '#059669', '#10b981', '#34d399'],
        fire:    ['rgba(255,255,255,0.06)', '#7c2d12', '#c2410c', '#ea580c', '#fb923c'],
        ocean:   ['rgba(255,255,255,0.06)', '#0c4a6e', '#0284c7', '#0ea5e9', '#38bdf8'],
        forest:  ['rgba(255,255,255,0.06)', '#14532d', '#16a34a', '#22c55e', '#4ade80'],
        pink:    ['rgba(255,255,255,0.06)', '#831843', '#db2777', '#f472b6', '#fbcfe8']
    };

    let currentTheme = 'default';
    let cachedData = null;

    /* =====================================================
       INIT
    ===================================================== */
    svgContainer.innerHTML = '<p class="loading">Loading heatmap…</p>';
    fetchHeatmapData();

    /* =====================================================
       THEME SWITCHING
    ===================================================== */
    themeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelector('.theme-btn.active')?.classList.remove('active');
            btn.classList.add('active');
            currentTheme = btn.dataset.theme;

            if (cachedData) {
                renderHeatmap(cachedData.contributions);
                updateLegendColors();
            }
        });
    });

    /* =====================================================
       EXPORT
    ===================================================== */
    exportBtn?.addEventListener('click', handleExport);

    async function handleExport() {
        const element = document.getElementById('capture-area');
        if (!element) {
            alert('Nothing to export.');
            return;
        }

        try {
            const canvas = await html2canvas(element, {
                backgroundColor: '#0f172a',
                scale: 2
            });

            const link = document.createElement('a');
            link.download = `xaytheon-heatmap-${Date.now()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (err) {
            console.error('Export failed', err);
            alert('Export failed.');
        }
    }

    /* =====================================================
       DATA FETCH
    ===================================================== */
    async function fetchHeatmapData() {
        try {
            const res = await fetch('/api/heatmap');
            if (!res.ok) throw new Error('API error');

            const data = await res.json();
            cachedData = data;

            renderHeatmap(data.contributions || {});
            updateInsights(data.insights || {}, data.stats || {});
            updateLegendColors();
        } catch (err) {
            console.error(err);
            svgContainer.innerHTML =
                '<p style="color:#ef4444">Failed to load heatmap data.</p>';
        }
    }

    /* =====================================================
       HEATMAP RENDERING
    ===================================================== */
    function renderHeatmap(contributions) {
        const square = 12;
        const gap = 3;
        const weeks = 53;

        const width = weeks * (square + gap) + 40;
        const height = square * 7 + gap * 6 + 30;

        const svg = createSVG(width, height);

        const today = new Date();
        const start = getStartSunday(today);

        const values = Object.values(contributions);
        const maxCount = values.length ? Math.max(...values) : 0;
        const colors = themes[currentTheme];

        for (let w = 0; w < weeks; w++) {
            const col = createGroup(20 + w * (square + gap), 20);

            for (let d = 0; d < 7; d++) {
                const date = new Date(start);
                date.setDate(start.getDate() + w * 7 + d);
                if (date > today) continue;

                const key = date.toISOString().split('T')[0];
                const count = contributions[key] || 0;
                const level = maxCount
                    ? Math.min(4, Math.ceil((count / maxCount) * 4))
                    : 0;

                col.appendChild(createCell(d, square, gap, colors[level], key, count));
            }
            svg.appendChild(col);
        }

        renderMonthLabels(svg, start, weeks, square, gap);

        svgContainer.innerHTML = '';
        svgContainer.appendChild(svg);
    }

    /* =====================================================
       INSIGHTS
    ===================================================== */
    function updateInsights(insights, stats) {
        currentStreakEl.textContent = `${stats.currentStreak || 0} days`;
        longestStreakEl.textContent = `${stats.maxStreak || 0} days`;
        totalAttribEl.textContent = stats.total || 0;

        bestDayEl.textContent = insights.bestDay
            ? `${insights.bestDay.name} (${insights.bestDay.count})`
            : '-';

        bestHourEl.textContent =
            insights.mostProductiveHour?.hour != null
                ? formatHour(insights.mostProductiveHour.hour)
                : '-';
    }

    function formatHour(h) {
        if (h === 0) return '12 AM';
        if (h === 12) return '12 PM';
        return h > 12 ? `${h - 12} PM` : `${h} AM`;
    }

    /* =====================================================
       LEGEND
    ===================================================== */
    function updateLegendColors() {
        const items = document.querySelectorAll('.legend-colors li');
        if (!items.length) return;

        themes[currentTheme].forEach((c, i) => {
            if (items[i]) items[i].style.backgroundColor = c;
        });
    }

    /* =====================================================
       HELPERS
    ===================================================== */
    function createSVG(w, h) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        svg.style.fontSize = '10px';
        svg.style.fontFamily = 'sans-serif';
        return svg;
    }

    function createGroup(x, y) {
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('transform', `translate(${x}, ${y})`);
        return g;
    }

    function createCell(d, size, gap, color, date, count) {
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('y', d * (size + gap));
        rect.setAttribute('width', size);
        rect.setAttribute('height', size);
        rect.setAttribute('rx', 2);
        rect.setAttribute('fill', color);

        const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
        title.textContent = `${count} contributions on ${date}`;
        rect.appendChild(title);

        return rect;
    }

    function renderMonthLabels(svg, start, weeks, size, gap) {
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        let lastMonth = -1;

        for (let w = 0; w < weeks; w++) {
            const date = new Date(start);
            date.setDate(start.getDate() + w * 7);
            const m = date.getMonth();

            if (m !== lastMonth) {
                const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                text.setAttribute('x', 20 + w * (size + gap));
                text.setAttribute('y', 12);
                text.setAttribute('fill', '#94a3b8');
                text.textContent = months[m];
                svg.appendChild(text);
                lastMonth = m;
            }
        }
    }

    function getStartSunday(date) {
        const d = new Date(date);
        d.setDate(d.getDate() - 364);
        while (d.getDay() !== 0) d.setDate(d.getDate() - 1);
        return d;
    }

});
