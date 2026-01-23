/**
 * Search Engine Service
 * Handles natural language search and semantic filtering.
 */
const llmService = require('./llm.service');

class SearchEngineService {
    constructor() {
        this.searchHistory = [];
    }

    /**
     * Performs a semantic search based on natural language query.
     */
    async search(query, filters = {}, page = 1) {
        const limit = 5;
        // 1. Extract intent and entities using NLP/LLM
        const extraction = await this.parseNaturalLanguage(query);

        // 2. Combine extracted filters with manual filters
        const combinedFilters = {
            ...extraction.filters,
            ...filters
        };

        // 3. Perform mock search based on extracted criteria
        const allResults = this.getMockResults(extraction.intent, combinedFilters);

        // 4. Pagination
        const startIndex = (page - 1) * limit;
        const pagedResults = allResults.slice(startIndex, startIndex + limit);

        this.trackSearch(query, allResults.length);

        return {
            query,
            parsedQuery: extraction,
            filters: combinedFilters,
            results: pagedResults,
            pagination: {
                page,
                hasMore: startIndex + limit < allResults.length,
                total: allResults.length
            },
            suggestions: this.getSearchSuggestions(query),
            history: this.searchHistory.slice(-5).reverse(),
            stats: {
                totalCount: allResults.length,
                responseTime: `${Math.floor(Math.random() * 200) + 100}ms`
            }
        };
    }

    async parseNaturalLanguage(query) {
        const q = query.toLowerCase();
        const filters = {};

        if (q.includes('react') || q.includes('ui')) filters.language = 'JavaScript';
        if (q.includes('python') || q.includes('data')) filters.language = 'Python';
        if (q.includes('updated this month')) filters.updated = 'month';
        if (q.includes('documentation') || q.includes('docs')) filters.hasDocs = true;
        if (q.includes('mit license') || q.includes('mit')) filters.license = 'MIT';

        const starMatch = q.match(/(\d+)\s*stars/);
        if (starMatch) filters.minStars = parseInt(starMatch[1]);

        return {
            intent: "repository_search",
            filters,
            entities: {
                language: filters.language || null,
                stars: filters.minStars || null
            },
            original: query
        };
    }

    getMockResults(intent, filters) {
        const allRepos = [
            { name: 'facebook/react', lang: 'JavaScript', stars: 212500, forks: 44200, license: 'MIT', desc: 'A declarative, efficient, and flexible JavaScript library for building user interfaces.' },
            { name: 'pallets/flask', lang: 'Python', stars: 65200, forks: 15100, license: 'BSD-3', desc: 'The Python micro framework for building web applications.' },
            { name: 'microsoft/vscode', lang: 'TypeScript', stars: 155900, forks: 27500, license: 'MIT', desc: 'Visual Studio Code' },
            { name: 'electron/electron', lang: 'JavaScript', stars: 110200, forks: 14800, license: 'MIT', desc: 'Build cross-platform desktop apps with JavaScript, HTML, and CSS' },
            { name: 'tailwindlabs/tailwindcss', lang: 'CSS', stars: 78500, forks: 4500, license: 'MIT', desc: 'A utility-first CSS framework for rapid UI development.' },
            { name: 'openai/whisper', lang: 'Python', stars: 45100, forks: 3800, license: 'MIT', desc: 'Robust Speech Recognition via Large-Scale Weak Supervision' },
            { name: 'golang/go', lang: 'Go', stars: 118000, forks: 17200, license: 'BSD-3', desc: 'The Go programming language' },
            { name: 'rust-lang/rust', lang: 'Rust', stars: 92400, forks: 11500, license: 'MIT', desc: 'Empowering everyone to build reliable and efficient software.' },
            { name: 'vercel/next.js', lang: 'JavaScript', stars: 115000, forks: 25400, license: 'MIT', desc: 'The React Framework' }
        ];

        return allRepos.filter(repo => {
            if (filters.language && repo.lang !== filters.language) return false;
            if (filters.minStars && repo.stars < filters.minStars) return false;
            if (filters.license && repo.license !== filters.license) return false;
            return true;
        });
    }

    getSearchSuggestions(query) {
        if (query.length < 2) return [];
        const possible = [
            'Popular React projects',
            'Python web frameworks',
            'TypeScript tools for production',
            'Modern CSS frameworks',
            'High quality documentation examples'
        ];
        return possible.filter(p => p.toLowerCase().includes(query.toLowerCase()));
    }

    trackSearch(query, resultsCount) {
        if (!this.searchHistory.includes(query)) {
            this.searchHistory.push(query);
            if (this.searchHistory.length > 20) this.searchHistory.shift();
        }
        console.log(`[Analytics] Search: "${query}" - ${resultsCount} results.`);
    }
}

module.exports = new SearchEngineService();
