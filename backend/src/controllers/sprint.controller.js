const skillService = require('../services/skill-matrix.service');
const optimizerService = require('../services/sprint-optimizer.service');

exports.getSprintPlans = async (req, res) => {
    try {
        const { tasks } = req.body; // Expecting a backlog of tasks
        const team = await skillService.getTeamSkills();

        // Mock tasks if none provided for demo
        const backlog = tasks || [
            { id: 101, name: 'Setup DB Schema', type: 'node', points: 5 },
            { id: 102, name: 'Create React Components', type: 'react', points: 8 },
            { id: 103, name: 'AI Model Training', type: 'python', points: 13 },
            { id: 104, name: 'CI/CD Pipeline', type: 'devops', points: 5 },
            { id: 105, name: 'API Authentication', type: 'node', points: 3 },
            { id: 106, name: 'Data Visualization', type: 'react', points: 8 }
        ];

        const plans = await optimizerService.generateSprintPlans(backlog, team);

        res.json({
            success: true,
            data: {
                team,
                plans
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.recalculatePlan = async (req, res) => {
    try {
        const { assignments } = req.body;
        const team = await skillService.getTeamSkills();
        const evaluation = await optimizerService.evaluatePlan(assignments, team);

        res.json({
            success: true,
            data: evaluation
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
