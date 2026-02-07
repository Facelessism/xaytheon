exports.smartSearch = async (req, res) => {
    try {
        const { q, filters, page } = req.query;
        if (!q) {
            return res.status(400).json({ message: "Search query is required." });
        }

        let decodedFilters = {};
        if (filters) {
            try {
                decodedFilters = JSON.parse(filters);
            } catch {
                return res.status(400).json({ message: "Invalid filters format" });
            }
        }

        let pageNum = parseInt(page, 10);
        if (isNaN(pageNum) || pageNum < 1) pageNum = 1;

        const results = await searchService.search(q.trim(), decodedFilters, pageNum);

        res.json({ success: true, data: results });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Search failed" });
    }
};
