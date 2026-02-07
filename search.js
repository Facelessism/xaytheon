/**
 * Smart Search Frontend Logic
 */
/**
 * Smart Search Frontend Logic with Infinite Scroll & History
 */

document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    const resultsArea = document.getElementById('search-results');
    const autocompletePanel = document.getElementById('autocomplete-results');
    const resultsCount = document.getElementById('results-count');
    const activeFiltersRow = document.getElementById('active-filters');
    const loadMoreTrigger = document.getElementById('load-more-trigger');
    const loadingState = document.getElementById('loading-state');

    // Filters
    const langFilter = document.getElementById('lang-filter');
    const starsFilter = document.getElementById('stars-filter');
    const updatedFilter = document.getElementById('updated-filter');
    const applyFiltersBtn = document.getElementById('apply-filters');

    let currentFilters = {};
    let currentPage = 1;
    let hasMore = true;
    let isLoading = false;

    // ----------------------------
    // --- Autocomplete Logic -----
    // ----------------------------
    let debounceTimer;
    let selectedIndex = -1;

    searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        const query = searchInput.value.trim();
        selectedIndex = -1;

        if (query.length < 2) {
            autocompletePanel.classList.add('hidden');
            return;
        }

        debounceTimer = setTimeout(async () => {
            try {
                const res = await fetch(`/api/search/autocomplete?q=${encodeURIComponent(query)}`);
                const data = await res.json();
                renderAutocomplete(data.suggestions || []);
            } catch (e) {
                console.error('Autocomplete error:', e);
                autocompletePanel.classList.add('hidden');
            }
        }, 250);
    });

    function renderAutocomplete(suggestions) {
        if (!suggestions.length) {
            autocompletePanel.classList.add('hidden');
            return;
        }

        autocompletePanel.innerHTML = suggestions
            .map((s, i) => `<div class="autocomplete-item" data-index="${i}"><i class="ri-history-line"></i> ${s}</div>`)
            .join('');
        autocompletePanel.classList.remove('hidden');
    }

    // Keyboard navigation for autocomplete
    searchInput.addEventListener('keydown', (e) => {
        const items = Array.from(autocompletePanel.querySelectorAll('.autocomplete-item'));
        if (!items.length) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedIndex = (selectedIndex + 1) % items.length;
            highlightAutocomplete(items);
        }
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedIndex = (selectedIndex - 1 + items.length) % items.length;
            highlightAutocomplete(items);
        }
        if (e.key === 'Enter') {
            if (selectedIndex >= 0) {
                e.preventDefault();
                selectAutocomplete(items[selectedIndex]);
            } else {
                performSearch(true);
            }
        }
    });

    autocompletePanel.addEventListener('click', (e) => {
        const item = e.target.closest('.autocomplete-item');
        if (item) selectAutocomplete(item);
    });

    function highlightAutocomplete(items) {
        items.forEach((item, i) => item.classList.toggle('highlighted', i === selectedIndex));
        items[selectedIndex]?.scrollIntoView({ block: 'nearest' });
    }

    function selectAutocomplete(item) {
        searchInput.value = item.textContent.trim();
        autocompletePanel.classList.add('hidden');
        performSearch(true);
    }

    // ----------------------------
    // --- Search Logic ----------
    // ----------------------------
    searchBtn.addEventListener('click', () => performSearch(true));
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && selectedIndex === -1) performSearch(true);
    });

    async function performSearch(isNewSearch = false) {
        const query = searchInput.value.trim();
        if (!query || isLoading) return;

        if (isNewSearch) {
            currentPage = 1;
            resultsArea.innerHTML = '';
            resultsCount.textContent = 'Searching...';
        }

        isLoading = true;
        loadingState.classList.remove('hidden');
        autocompletePanel.classList.add('hidden');

        try {
            const filterStr = JSON.stringify(currentFilters);
            const res = await fetch(`/api/search/smart?q=${encodeURIComponent(query)}&filters=${encodeURIComponent(filterStr)}&page=${currentPage}`);
            const data = await res.json();

            if (data.success) {
                renderResults(data.data, isNewSearch);
                renderActiveFilters(currentFilters);
                hasMore = data.data.pagination.hasMore;
                currentPage++;
            } else if (isNewSearch) {
                resultsArea.innerHTML = `<p class="error">No results found.</p>`;
            }
        } catch (e) {
            console.error(e);
            if (isNewSearch) resultsArea.innerHTML = `<p class="error">Something went wrong.</p>`;
        } finally {
            isLoading = false;
            loadingState.classList.add('hidden');
        }
    }

    function renderResults(data, isNewSearch) {
        if (isNewSearch) {
            resultsCount.textContent = `Found ${data.pagination.total.toLocaleString()} repositories in ${data.stats.responseTime}`;
        }

        if (!data.results.length && isNewSearch) {
            resultsArea.innerHTML = `
                <div class="empty-results">
                    <i class="ri-search-eye-line"></i>
                    <p>No results for "${data.query}". Try something like "React UI library".</p>
                </div>`;
            return;
        }

        const html = data.results.map(repo => `
            <div class="repo-card animate-in">
                <div class="repo-card-header">
                    <a href="https://github.com/${repo.name}" target="_blank" class="repo-name">${repo.name}</a>
                    <div class="repo-stats">
                        <span><i class="ri-star-fill"></i> ${repo.stars.toLocaleString()}</span>
                        <span><i class="ri-git-merge-line"></i> ${repo.forks.toLocaleString()}</span>
                    </div>
                </div>
                <p class="repo-description">${repo.desc}</p>
                <div class="repo-tags">
                    ${repo.lang ? `<span class="lang-tag">${repo.lang}</span>` : ''}
                    ${repo.license ? `<span class="lang-tag">${repo.license}</span>` : ''}
                </div>
            </div>
        `).join('');

        if (isNewSearch) resultsArea.innerHTML = html;
        else resultsArea.insertAdjacentHTML('beforeend', html);
    }

    // ----------------------------
    // --- Active Filters ---------
    // ----------------------------
    function renderActiveFilters(filters) {
        activeFiltersRow.innerHTML = '';
        Object.entries(filters).forEach(([key, value]) => {
            if (!value) return;
            const chip = document.createElement('div');
            chip.className = 'filter-chip';
            chip.innerHTML = `${key}: ${value} <i class="ri-close-line" data-key="${key}"></i>`;
            chip.querySelector('i').addEventListener('click', () => {
                delete currentFilters[key];
                performSearch(true);
            });
            activeFiltersRow.appendChild(chip);
        });
    }

    // ----------------------------
    // --- Infinite Scroll --------
    // ----------------------------
    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
            performSearch(false);
        }
    }, { threshold: 0.1 });

    observer.observe(loadMoreTrigger);

    // ----------------------------
    // --- Filters ---------------
    // ----------------------------
    applyFiltersBtn.addEventListener('click', () => {
        currentFilters = {};
        if (langFilter.value) currentFilters.language = langFilter.value;
        if (starsFilter.value) currentFilters.minStars = parseInt(starsFilter.value);
        if (updatedFilter.value) currentFilters.updated = updatedFilter.value;
        performSearch(true);
    });

    document.querySelectorAll('.hint-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            searchInput.value = btn.textContent;
            performSearch(true);
        });
    });

    document.addEventListener('click', (e) => {
        if (!autocompletePanel.contains(e.target) && e.target !== searchInput) {
            autocompletePanel.classList.add('hidden');
        }
    });

    // ----------------------------
    // --- Initial Load ----------
    // ----------------------------
    if (!searchInput.value) {
        searchInput.value = 'Popular projects';
        performSearch(true);
    }
});
