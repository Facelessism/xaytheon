/**
 * Confidence Calculator Service
 * Uses ML-based scoring (mocked) to predict refactor safety.
 */
class ConfidenceCalculatorService {
    /**
     * Calculates a safety confidence score (0-100).
     * @param {Object} blastData - Output from RefactorSimulator
     */
    async calculateConfidence(blastData) {
        let score = 100;

        // Penalty for number of affected files
        score -= blastData.totalImpacted * 5;

        // Heavy penalty for critical/high risk paths
        score -= blastData.criticalPaths * 15;

        // Constraint to 0-100 range
        score = Math.max(0, Math.min(100, score));

        return {
            score: score,
            level: this.getConfidenceLevel(score),
            requiresSafetyTests: score < 70,
            summary: this.generateSummary(score, blastData)
        };
    }

    getConfidenceLevel(score) {
        if (score >= 90) return 'SAFE';
        if (score >= 70) return 'CAUTION';
        if (score >= 50) return 'RISKY';
        return 'DANGEROUS';
    }

    generateSummary(score, data) {
        if (score >= 90) return "Safe refactor. Minimal dependencies impacted.";
        if (score < 50) return `Critical Risk! ${data.criticalPaths} core modules will break. Abort or add tests.`;
        return `Moderate risk. ${data.totalImpacted} files affected. Review carefully.`;
    }

    /**
     * Generates mock safety tests if confidence is low.
     */
    async generateSafetyTests(blastData) {
        return blastData.affectedFiles.map(file => ({
            target: file.path,
            testCode: `test('Integration: ${file.path} should not break', () => { expect(imports('${file.path}')).toBeDefined(); });`
        }));
    }
}

module.exports = new ConfidenceCalculatorService();
