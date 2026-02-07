const aggregatorService = require('../services/contribution-aggregator.service');

exports.getHeatmapData = async (req, res) => {
    try {
        // Prefer authenticated user, fallback to query param
        const username =
            req.user?.username ||
            req.query.username ||
            'user';

        const rawData = await aggregatorService.getContributionData(username);

        if (!rawData || typeof rawData !== 'object') {
            throw new Error('Invalid contribution data');
        }

        const contributions = rawData.contributions || {};
        const stats = rawData.stats || {
            total: 0,
            currentStreak: 0,
            maxStreak: 0
        };

        const insights = aggregatorService.calculateInsights({
            contributions,
            stats
        });

        return res.status(200).json({
            contributions,
            stats,
            insights
        });

    } catch (error) {
        console.error('[Heatmap Controller]', error);

        return res.status(500).json({
            message: 'Failed to fetch contribution data',
            contributions: {},
            stats: {
                total: 0,
                currentStreak: 0,
                maxStreak: 0
            },
            insights: {}
        });
    }
};

