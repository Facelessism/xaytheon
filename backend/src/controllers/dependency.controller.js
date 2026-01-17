const dependencyService = require('../services/dependency-parser.service');

exports.getGraphData = async (req, res) => {
    try {
        const { repo } = req.query; // owner/repo format

        if (!repo) {
            return res.status(400).json({ message: "Repository name is required." });
        }

        // Fetch graph data
        const graphData = await dependencyService.getMockDependencies(repo);

        res.json(graphData);
    } catch (error) {
        console.error("Error fetching dependency graph:", error);
        res.status(500).json({ message: "Failed to generate dependency graph." });
    }
};
