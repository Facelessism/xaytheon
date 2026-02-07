/**
 * Sprint Forecaster Service
 * Handles Monte Carlo simulations, volatility tracking, and team fatigue analysis.
 */
class SprintForecasterService {
    /**
     * Runs a Monte Carlo simulation for the current sprint.
     * @param {Object} sprintData - { backlogPoints, teamVelocity, historicalVolatility, daysRemaining }
     * @returns {Object} Simulation results with confidence intervals.
     */
    async runMonteCarlo(sprintData) {
        const { backlogPoints, teamVelocity, historicalVolatility, daysRemaining } = sprintData;
        const iterations = 10000;
        let successCount = 0;
        const outcomes = [];

        for (let i = 0; i < iterations; i++) {
            // Add randomness based on historical volatility
            const randomVolatility = 1 + (Math.random() * historicalVolatility * 2 - historicalVolatility);
            const simulatedVelocity = teamVelocity * randomVolatility;
            const completedPoints = simulatedVelocity * daysRemaining;

            if (completedPoints >= backlogPoints) {
                successCount++;
            }
            outcomes.push(completedPoints);
        }

        const confidenceLevel = (successCount / iterations) * 100;

        return {
            confidenceLevel: parseFloat(confidenceLevel.toFixed(2)),
            iterations,
            averageOutcome: outcomes.reduce((a, b) => a + b, 0) / iterations,
            p50: this.getPercentile(outcomes, 50),
            p90: this.getPercentile(outcomes, 90)
        };
    }

    /**
     * Analyzes historical volatility (Estimated vs. Actual points).
     */
    async getVolatilityMetrics() {
        // Mock historical data
        return [
            { sprint: 'Sprint 12', estimated: 40, actual: 38, volatility: 0.05 },
            { sprint: 'Sprint 13', estimated: 45, actual: 42, volatility: 0.07 },
            { sprint: 'Sprint 14', estimated: 50, actual: 35, volatility: 0.30 }, // High volatility
            { sprint: 'Sprint 15', estimated: 42, actual: 44, volatility: 0.04 }
        ];
    }

    /**
     * Calculates the "Project Fatigue Index" (0-100).
     * Based on sprint velocity trends and hours worked.
     */
    async getFatigueIndex() {
        // Mock logic: If velocity is decreasing over 3 sprints while commitment is high
        const historicalSprints = await this.getVolatilityMetrics();
        const velocityTrend = historicalSprints.map(s => s.actual);

        let fatigue = 25; // Base level
        // Simplistic trend detection
        if (velocityTrend[2] < velocityTrend[1]) fatigue += 20;
        if (velocityTrend[3] < velocityTrend[2]) fatigue += 30;

        return {
            index: Math.min(100, fatigue),
            status: fatigue > 70 ? 'CRITICAL' : fatigue > 40 ? 'WARNING' : 'HEALTHY',
            recommendation: fatigue > 70 ? 'Immediate cooldown suggested.' : 'Keep monitoring.'
        };
    }

    getPercentile(arr, p) {
        const sorted = [...arr].sort((a, b) => a - b);
        const index = Math.floor((p / 100) * (sorted.length - 1));
        return sorted[index];
    }
}

module.exports = new SprintForecasterService();
