const aggregatorService = require('../services/contribution-aggregator.service');

exports.getHeatmapData = async (req, res) => {
    try {
        const { username } = req.query; // Could use this to fetch real data in future
        // For now, using the authenticated user or default logic inside the service

        const rawData = await aggregatorService.getContributionData(username || 'user');
        const insights = aggregatorService.calculateInsights(rawData);

        res.json({
            ...rawData,
            insights
        });
    } catch (error) {
        console.error('Heatmap Error:', error);
        res.status(500).json({ message: 'Failed to fetch contribution data' });
    }
};
