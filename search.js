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

    // --- Autocomplete & Suggestions ---
    let debounceTimer;
    searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        const q = searchInput.value.trim();

        if (q.length < 2) {
            autocompletePanel.classList.add('hidden');
            return;
        }

        debounceTimer = setTimeout(async () => {
            try {
                const res = await fetch(`/api/search/autocomplete?q=${encodeURIComponent(q)}`);
                const data = await res.json();
                renderAutocomplete(data.suggestions);
            } catch (e) { console.error(e); }
        }, 300);
    });

    function renderAutocomplete(suggestions) {
        if (!suggestions || suggestions.length === 0) {
            autocompletePanel.classList.add('hidden');
            return;
        }

        autocompletePanel.innerHTML = suggestions
            .map(s => `<div class="autocomplete-item"><i class="ri-history-line"></i> ${s}</div>`)
            .join('');
        autocompletePanel.classList.remove('hidden');

        document.querySelectorAll('.autocomplete-item').forEach(item => {
            item.addEventListener('click', () => {
                searchInput.value = item.textContent.trim();
                autocompletePanel.classList.add('hidden');
                performSearch(true);
            });
        });
    }

    // --- Search Logic ---
    searchBtn.addEventListener('click', () => performSearch(true));
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch(true);
    });

    async function performSearch(isNewSearch = false) {
        const q = searchInput.value.trim();
        if (!q || isLoading) return;

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
            const res = await fetch(`/api/search/smart?q=${encodeURIComponent(q)}&filters=${encodeURIComponent(filterStr)}&page=${currentPage}`);
            const data = await res.json();

            if (data.success) {
                renderResults(data.data, isNewSearch);
                renderActiveFilters(data.data.filters);
                hasMore = data.data.pagination.hasMore;
                currentPage++;
            }
        } catch (e) {
            console.error(e);
            if (isNewSearch) resultsArea.innerHTML = '<p class="error">Something went wrong.</p>';
        } finally {
            isLoading = false;
            loadingState.classList.add('hidden');
        }
    }

    function renderResults(data, isNewSearch) {
        if (isNewSearch) {
            resultsCount.textContent = `Found ${data.pagination.total} repositories in ${data.stats.responseTime}`;
        }

        if (data.results.length === 0 && isNewSearch) {
            resultsArea.innerHTML = `
                <div class="empty-results">
                    <i class="ri-search-eye-line"></i>
                    <p>No results for "${data.query}". Did you mean "React UI library"?</p>
                </div>`;
            return;
        }

        const itemsHtml = data.results.map(repo => `
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
                    <span class="lang-tag">${repo.lang}</span>
                    <span class="lang-tag">${repo.license}</span>
                </div>
            </div>
        `).join('');

        if (isNewSearch) resultsArea.innerHTML = itemsHtml;
        else resultsArea.insertAdjacentHTML('beforeend', itemsHtml);
    }

    function renderActiveFilters(filters) {
        activeFiltersRow.innerHTML = '';
        Object.entries(filters).forEach(([key, value]) => {
            if (value === null || value === undefined) return;
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

    // --- Infinite Scroll ---
    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
            performSearch(false);
        }
    }, { threshold: 0.1 });

    observer.observe(loadMoreTrigger);

    // --- Filters ---
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

    // Start with a generic search if empty
    if (!searchInput.value) {
        searchInput.value = 'Popular projects';
        performSearch(true);
    }
});
