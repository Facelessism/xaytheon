/**
 * YAML Generator Service
 * Converts structured workflow steps into valid GitHub Actions YAML syntax.
 */

class YamlGeneratorService {
    /**
     * Converts a workflow object into a YAML string.
     * @param {Object} workflowData 
     * @returns {string}
     */
    generateWorkflowYaml(workflowData) {
        const { name, on, jobs } = workflowData;
        let yaml = `name: ${name || 'CI Workflow'}\n\n`;

        // Handle 'on' triggers
        yaml += `on:\n`;
        if (typeof on === 'string') {
            yaml += `  ${on}:\n`;
        } else if (Array.isArray(on)) {
            on.forEach(trigger => {
                yaml += `  ${trigger}:\n`;
            });
        } else if (typeof on === 'object') {
            Object.entries(on).forEach(([event, config]) => {
                yaml += `  ${event}:\n`;
                if (config.branches) {
                    yaml += `    branches: [ ${config.branches.join(', ')} ]\n`;
                }
            });
        }

        yaml += `\njobs:\n`;

        // Handle Jobs
        Object.entries(jobs).forEach(([jobId, jobConfig]) => {
            yaml += `  ${jobId}:\n`;
            yaml += `    runs-on: ${jobConfig.runsOn || 'ubuntu-latest'}\n`;
            yaml += `    steps:\n`;

            jobConfig.steps.forEach(step => {
                if (step.uses) {
                    yaml += `      - name: ${step.name}\n`;
                    yaml += `        uses: ${step.uses}\n`;
                    if (step.with) {
                        yaml += `        with:\n`;
                        Object.entries(step.with).forEach(([key, value]) => {
                            yaml += `          ${key}: ${value}\n`;
                        });
                    }
                } else if (step.run) {
                    yaml += `      - name: ${step.name}\n`;
                    yaml += `        run: ${step.run}\n`;
                }
            });
        });

        return yaml;
    }

    /**
     * Basic validation for workflow logic.
     * @param {Object} jobs 
     * @returns {Object} { isValid: boolean, error: string }
     */
    validateWorkflow(jobs) {
        const jobEntries = Object.values(jobs);

        // Check for common dependencies
        let hasBuild = false;
        let hasDeploy = false;

        jobEntries.forEach(job => {
            const stepNames = job.steps.map(s => s.name.toLowerCase());
            if (stepNames.some(n => n.includes('build'))) hasBuild = true;
            if (stepNames.some(n => n.includes('deploy'))) hasDeploy = true;
        });

        if (hasDeploy && !hasBuild) {
            return { isValid: false, error: "Validation Warning: You are deploying without a build step. Ensure your project doesn't require compilation." };
        }

        return { isValid: true };
    }
}

module.exports = new YamlGeneratorService();
