/**
 * Skill Matrix Service
 * Analyzes Git history to build developer expertise profiles.
 */
class SkillMatrixService {
    /**
     * Generates a 3D Skill Matrix for the team based on code contributions.
     * @returns {Array} List of developers with their skill vectors.
     */
    async getTeamSkills() {
        // Mock data derived from "Git History" analysis
        return [
            {
                id: 'dev1',
                name: 'Alice',
                role: 'Senior Backend',
                skills: {
                    node: 0.95,
                    python: 0.4,
                    react: 0.2,
                    devops: 0.8
                },
                velocity: 8, // Story points per day
                timezone: 'UTC-5',
                compatibility: ['dev2', 'dev4']
            },
            {
                id: 'dev2',
                name: 'Bob',
                role: 'Frontend Lead',
                skills: {
                    node: 0.3,
                    python: 0.1,
                    react: 0.98,
                    devops: 0.2
                },
                velocity: 6,
                timezone: 'UTC+1',
                compatibility: ['dev1', 'dev3']
            },
            {
                id: 'dev3',
                name: 'Charlie',
                role: 'Full Stack',
                skills: {
                    node: 0.7,
                    python: 0.3,
                    react: 0.8,
                    devops: 0.4
                },
                velocity: 5,
                timezone: 'UTC+5:30',
                compatibility: ['dev2']
            },
            {
                id: 'dev4',
                name: 'Diana',
                role: 'Data Scientist',
                skills: {
                    node: 0.2,
                    python: 0.95,
                    react: 0.1,
                    devops: 0.5
                },
                velocity: 4,
                timezone: 'UTC-8',
                compatibility: ['dev1']
            }
        ];
    }
}

module.exports = new SkillMatrixService();
