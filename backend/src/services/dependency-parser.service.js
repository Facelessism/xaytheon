/**
 * Dependency Parser Service
 * Parses dependency files and generates a graph structure.
 */

class DependencyParserService {
    /**
     * Parses a package.json content and returns a graph structure.
     * @param {string} repoName 
     * @param {Object} packageJson 
     * @returns {Object} { nodes: [], links: [] }
     */
    parseNpmDependencies(repoName, packageJson) {
        const nodes = [];
        const links = [];

        // Root Node
        nodes.push({
            id: repoName,
            name: repoName,
            type: 'root',
            val: 20,
            color: '#10b981'
        });

        const dependencies = packageJson.dependencies || {};
        const devDependencies = packageJson.devDependencies || {};

        // Process Production Dependencies
        Object.entries(dependencies).forEach(([name, version]) => {
            nodes.push({
                id: name,
                name: name,
                version: version,
                type: 'dependency',
                val: 10,
                color: '#3b82f6'
            });
            links.push({
                source: repoName,
                target: name,
                type: 'production'
            });
        });

        // Process Dev Dependencies
        Object.entries(devDependencies).forEach(([name, version]) => {
            nodes.push({
                id: name,
                name: name,
                version: version,
                type: 'devDependency',
                val: 8,
                color: '#f59e0b'
            });
            links.push({
                source: repoName,
                target: name,
                type: 'dev'
            });
        });

        return { nodes, links };
    }

    /**
     * Mock fetching dependency data for a repository.
     * In a real app, this would fetch package.json from GitHub API.
     */
    async getMockDependencies(repoName) {
        // Return some realistic dummy data for demonstration
        const mockPackageJson = {
            dependencies: {
                "express": "^4.18.2",
                "socket.io": "^4.7.2",
                "axios": "^1.6.0",
                "dotenv": "^16.3.1",
                "jsonwebtoken": "^9.0.2",
                "cors": "^2.8.5",
                "sentiment": "^5.0.2"
            },
            devDependencies: {
                "nodemon": "^3.0.1",
                "jest": "^29.7.0",
                "supertest": "^6.3.3"
            }
        };

        return this.parseNpmDependencies(repoName, mockPackageJson);
    }
}

module.exports = new DependencyParserService();
