const simulator = require('../services/refactor-simulator.service');
const calculator = require('../services/confidence-calculator.service');

exports.analyzeRefactor = async (req, res) => {
    try {
        const { filePath, codeSnippet } = req.body;

        // 1. Simulate Blast Radius
        const blastData = await simulator.simulateBlastRadius(filePath, codeSnippet);

        // 2. Calculate Confidence
        const confidence = await calculator.calculateConfidence(blastData);

        // 3. Generate Tests if needed
        let safetyTests = [];
        if (confidence.requiresSafetyTests) {
            safetyTests = await calculator.generateSafetyTests(blastData);
        }

        res.json({
            success: true,
            data: {
                blastRadius: blastData,
                confidence: confidence,
                safetyTests: safetyTests
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.createCheckpoint = async (req, res) => {
    // Mock checkpoint creation
    res.json({ success: true, message: "Checkpoint 'pre-refactor-01' created. DB and Configs backed up." });
};

exports.rollback = async (req, res) => {
    // Mock rollback
    res.json({ success: true, message: "System rolled back to 'pre-refactor-01'. State restored." });
};
