const forecasterService = require('../services/sprint-forecaster.service');

exports.analyzeSprint = async (req, res) => {
    try {
        const { backlogPoints, teamVelocity, historicalVolatility, daysRemaining } = req.body;

        const simulation = await forecasterService.runMonteCarlo({
            backlogPoints: backlogPoints || 50,
            teamVelocity: teamVelocity || 8,
            historicalVolatility: historicalVolatility || 0.15,
            daysRemaining: daysRemaining || 5
        });

        const volatility = await forecasterService.getVolatilityMetrics();
        const fatigue = await forecasterService.getFatigueIndex();

        res.json({
            success: true,
            data: {
                simulation,
                volatility,
                fatigue
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.simulateScenario = async (req, res) => {
    try {
        const { adjustments } = req.body;
        // adjustments: { velocityChange: -2, addedFeatures: 10 }

        const baseData = {
            backlogPoints: 50 + (adjustments.addedFeatures || 0),
            teamVelocity: 8 + (adjustments.velocityChange || 0),
            historicalVolatility: 0.15,
            daysRemaining: 5
        };

        const simulation = await forecasterService.runMonteCarlo(baseData);

        res.json({
            success: true,
            data: simulation
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
