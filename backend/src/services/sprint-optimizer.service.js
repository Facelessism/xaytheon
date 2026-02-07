/**
 * Sprint Optimizer Service
 * Uses constraint-solving logic to generate optimal sprint plans.
 */
class SprintOptimizerService {
    /**
     * Generates multiple "Parallel Universe" sprint plans.
     * @param {Array} tasks - List of tasks in the backlog
     * @param {Array} team - List of developers
     */
    async generateSprintPlans(tasks, team) {
        const plans = [];

        // Strategy 1: Maximize Velocity (Speed)
        plans.push({
            id: 'universe_speed',
            name: 'Speed Run',
            description: 'Optimized for fastest completion time.',
            assignments: this.solve(tasks, team, 'speed'),
            probability: 0.85,
            burnoutRisk: 'High'
        });

        // Strategy 2: Maximize Quality/Learning (Balanced)
        plans.push({
            id: 'universe_quality',
            name: 'Quality Focused',
            description: 'Matches tasks to experts to reduce bugs.',
            assignments: this.solve(tasks, team, 'quality'),
            probability: 0.92,
            burnoutRisk: 'Low'
        });

        return plans;
    }

    /**
     * Mock Solver Algorithm (Greedy approach for demo)
     */
    solve(tasks, team, strategy) {
        let assignedTasks = [];
        const availableTeam = JSON.parse(JSON.stringify(team)); // Deep copy using JSON for simplicity

        // Initialize load
        availableTeam.forEach(dev => dev.currentLoad = 0);

        tasks.forEach(task => {
            let bestDev = null;
            let highestScore = -1;

            availableTeam.forEach(dev => {
                let score = 0;

                // Calculate match score based on skills
                const skillMatch = dev.skills[task.type] || 0.1;

                if (strategy === 'speed') {
                    // Favor velocity and skill
                    score = (skillMatch * 0.5) + (dev.velocity * 0.5);
                    // Penalize load slightly
                    score -= (dev.currentLoad * 0.1);
                } else {
                    // Favor exact skill match only
                    score = skillMatch * 2;
                    // Heavy penalty for load to prevent burnout
                    score -= (dev.currentLoad * 0.5);
                }

                if (score > highestScore) {
                    highestScore = score;
                    bestDev = dev;
                }
            });

            if (bestDev) {
                assignedTasks.push({
                    taskId: task.id,
                    taskName: task.name,
                    assignedTo: bestDev.id,
                    devName: bestDev.name,
                    estimatedDays: Math.ceil(task.points / bestDev.velocity)
                });
                bestDev.currentLoad += task.points;
            }
        });

        return assignedTasks;
    }

    /**
     * Recalculates probability and risk for a manual plan.
     */
    async evaluatePlan(assignments, team) {
        let totalRisk = 0;
        let burnoutCount = 0;

        // Simplify evaluation logic
        const devLoads = {};
        assignments.forEach(a => {
            if (!devLoads[a.assignedTo]) devLoads[a.assignedTo] = 0;
            devLoads[a.assignedTo] += a.points || 5; // Default points
        });

        // Check against velocity
        team.forEach(dev => {
            const load = devLoads[dev.id] || 0;
            const maxCapacity = dev.velocity * 10; // 10 day sprint
            if (load > maxCapacity) {
                burnoutCount++;
                totalRisk += 20;
            }
        });

        return {
            probability: Math.max(10, 100 - totalRisk),
            burnoutRisk: burnoutCount > 0 ? 'High' : 'Low',
            overloadedDevs: burnoutCount
        };
    }
}

module.exports = new SprintOptimizerService();
