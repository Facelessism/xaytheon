/**
 * Search Engine Service
 * Handles natural language search and semantic filtering.
 */

const llmService = require('./llm.service');

class SearchEngineService {

    /**
     * Main semantic search entry
     */
    async search(query, userFilters = {}, page = 1) {
        const startTime = Date.now();
        const limit = 5;

        const normalizedQuery = query.trim().slice(0, 200);

        // 1. NLP / Intent parsing
        const parsed = await this.parseNaturalLanguage(normalizedQuery);

        // 2. Merge filters (explicit user filters override NLP)
        const filters = this.mergeFilters(parsed.filters, userFilters);

        // 3. Search + ranking
        const rankedResults = this.rankResults(
            this.getMockResults(),
            parsed,
            filters
        );

        // 4. Pagination
        const startIndex = (page - 1) * limit;
        const results = rankedResults.slice(startIndex, startIndex + limit);

        return {
            query: normalizedQuery,
            intent: parsed.intent,
            filters,
            results,
            pagination: {
                page,
                limit,
                total: rankedResults.length,
                hasMore: startIndex + limit < rankedResults.length
            },
            suggestions: this.getSearchSuggestions(normalizedQuery),
            stats: {
                totalCount: rankedResults.length,
                responseTime: `${Date.now() - startTime}ms`
            }
        };
    }

    /**
     * Natural language parsing (LLM-ready)
     */
    async parseNaturalLanguage(query) {
        const q = query.toLowerCase();
        const filters = {};
        const signals = [];

        if (q.includes('react')) {
            filters.language = 'JavaScript';
            signals.push('react');
        }

        if (q.includes('python')) {
            filters.language = filters.language ? [filters.language, 'Python'] : 'Python';
            signals.push('python');
        }

        if (q.includes('typescript')) {
            filters.language = 'TypeScript';
            signals.push('typescript');
        }

        if (q.includes('mit')) {
            filters.license = 'MIT';
            signals.push('license');
        }

        const starMatch = q.match(/(\d+)\s*stars?/);
        if (starMatch) {
            filters.minStars = Number(starMatch[1]);
            signals.push('stars');
        }

        return {
            intent: 'repository_search',
            confidence: Math.min(1, signals.length / 4),
            filters,
            original: query
        };
    }

    /**
     * Merge NLP filters with user filters safely
     */
    mergeFilters(nlpFilters, userFilters) {
        const merged = { ...nlpFilters };

        for (const [key, value] of Object.entries(userFilters)) {
            if (value !== null && value !== undefined) {
                merged[key] = value;
            }
        }

        return merged;
    }

    /**
     * Ranking + filtering engine
     */
    rankResults(repos, parsed, filters) {
        return repos
            .map(repo => {
                let score = 0;

                // Language match
                if (filters.language) {
                    if (Array.isArray(filters.language)) {
                        if (filters.language.includes(repo.lang)) score += 20;
                    } else if (repo.lang === filters.language) {
                        score += 20;
                    }
                }

                // License match
                if (filters.license && repo.license === filters.license) {
                    score += 10;
                }

                // Star threshold
                if (filters.minStars && repo.stars >= filters.minStars) {
                    score += 15;
                }

                // Popularity boost
                score += Math.log10(repo.stars) * 5;

                // Intent confidence boost
                score *= parsed.confidence || 0.5;

                return { ...repo, _score: score };
            })
            .filter(repo => {
                if (filters.minStars && repo.stars < filters.minStars) return false;
                if (filters.license && repo.license !== filters.license) return false;
                return true;
            })
            .sort((a, b) => b._score - a._score);
    }

    /**
     * Mock repository dataset (replace with DB / search engine later)
     */
    getMockResults() {
        return [
            { name: 'facebook/react', lang: 'JavaScript', stars: 212500, forks: 44200, license: 'MIT', desc: 'A JavaScript library for building user interfaces.' },
            { name: 'vercel/next.js', lang: 'JavaScript', stars: 115000, forks: 25400, license: 'MIT', desc: 'The React framework for production.' },
            { name: 'microsoft/vscode', lang: 'TypeScript', stars: 155900, forks: 27500, license: 'MIT', desc: 'Code editor redefined.' },
            { name: 'pallets/flask', lang: 'Python', stars: 65200, forks: 15100, license: 'BSD-3', desc: 'The Python micro web framework.' },
            { name: 'openai/whisper', lang: 'Python', stars: 45100, forks: 3800, license: 'MIT', desc: 'Speech recognition via weak supervision.' },
            { name: 'golang/go', lang: 'Go', stars: 118000, forks: 17200, license: 'BSD-3', desc: 'The Go programming language.' },
            { name: 'rust-lang/rust', lang: 'Rust', stars: 92400, forks: 11500, license: 'MIT', desc: 'Reliable and efficient systems programming.' }
        ];
    }

    /**
     * Autocomplete / query suggestions
     */
    getSearchSuggestions(query) {
        if (!query || query.length < 2) return [];

        const suggestions = [
            'Popular React projects',
            'Python web frameworks',
            'TypeScript tools for production',
            'High star open source libraries',
            'MIT licensed JavaScript projects'
        ];

        return suggestions.filter(s =>
            s.toLowerCase().includes(query.toLowerCase())
        );
    }
}

module.exports = new SearchEngineService();
