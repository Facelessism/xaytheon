const searchService = require('../services/search-engine.service');

exports.smartSearch = async (req, res) => {
    try {
        const { q, filters, page } = req.query;
        if (!q) {
            return res.status(400).json({ message: "Search query is required." });
        }

        const decodedFilters = filters ? JSON.parse(filters) : {};
        const pageNum = parseInt(page) || 1;

        const results = await searchService.search(q, decodedFilters, pageNum);

        res.json({
            success: true,
            data: results
        });
    } catch (error) {
        res.status(500).json({ message: "Search failed", error: error.message });
    }
};

exports.getAutocomplete = (req, res) => {
    const { q } = req.query;
    const suggestions = searchService.getSearchSuggestions(q || "");
    res.json({ suggestions });
};
