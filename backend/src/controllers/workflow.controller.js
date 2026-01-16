const yamlService = require('../services/yaml-generator.service');

/**
 * Controller for Workflow Builder
 */
exports.generateYaml = async (req, res) => {
    try {
        const { workflowData } = req.body;

        if (!workflowData || !workflowData.jobs) {
            return res.status(400).json({ message: "Invalid workflow data." });
        }

        const yaml = yamlService.generateWorkflowYaml(workflowData);
        const validation = yamlService.validateWorkflow(workflowData.jobs);

        res.json({
            yaml,
            validation: validation.isValid ? "Workflow is valid." : validation.error
        });
    } catch (error) {
        console.error("Error generating YAML:", error);
        res.status(500).json({ message: "Server error during YAML generation." });
    }
};

exports.getTemplates = (req, res) => {
    const templates = [
        {
            id: 'node-ci',
            name: 'Node.js CI',
            description: 'Build and test a Node.js project.',
            data: {
                name: 'Node.js CI',
                on: ['push', 'pull_request'],
                jobs: {
                    build: {
                        runsOn: 'ubuntu-latest',
                        steps: [
                            { name: 'Checkout', uses: 'actions/checkout@v4' },
                            { name: 'Use Node.js', uses: 'actions/setup-node@v4', with: { 'node-version': '20' } },
                            { name: 'Install dependencies', run: 'npm ci' },
                            { name: 'Build', run: 'npm run build --if-present' },
                            { name: 'Test', run: 'npm test' }
                        ]
                    }
                }
            }
        },
        {
            id: 'static-site',
            name: 'Deploy Static Site',
            description: 'Deploy to GitHub Pages.',
            data: {
                name: 'Deploy Static Site',
                on: { push: { branches: ['main'] } },
                jobs: {
                    deploy: {
                        runsOn: 'ubuntu-latest',
                        steps: [
                            { name: 'Checkout', uses: 'actions/checkout@v4' },
                            { name: 'Deploy to Pages', uses: 'JamesIves/github-pages-deploy-action@v4', with: { folder: 'dist' } }
                        ]
                    }
                }
            }
        }
    ];

    res.json(templates);
};
