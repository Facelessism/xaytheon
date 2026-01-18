/**
 * PR Reviewer Service
 * Handles automated code review and analysis for pull requests
 */

class PRReviewerService {
    constructor() {
        this.reviewPatterns = {
            // Security vulnerabilities
            sqlInjection: /(\bselect\b|\binsert\b|\bupdate\b|\bdelete\b|\bdrop\b|\bexec\b|\bexecute\b).*\+.*['"]/gi,
            xssRisk: /(innerHTML|outerHTML|document\.write|eval|Function).*\(.*\)/gi,
            hardcodedSecrets: /(password|secret|key|token|auth|api_key|private_key|client_secret)\s*[=:]\s*['"][^'"]+/gi,
            
            // Code quality issues
            unusedVars: /\bvar\s+(\w+)\s*=\s*(?!function)[^;]*;(?!.*\b\1\b)/g,
            consoleLogs: /console\.(log|debug|warn|error)\(/g,
            evalUsage: /\beval\s*\(/g,
            
            // Performance issues
            syncOperations: /\b(fs\.readFileSync|fs\.writeFileSync|require\(|import\s+sync)/g,
            inefficientLoops: /for\s*\([^)]+\)\s*{\s*.*\.indexOf/g,
            
            // Best practices
            directDOMManipulation: /document\.getElementById|document\.querySelector/g,
            improperErrorHandling: /try\s*{[^}]+}\s*catch\s*\([^)]*\)\s*{\s*}/g
        };
        
        this.reviewGuidelines = {
            codeClarity: {
                maxFunctionLength: 50,
                maxParameterCount: 5,
                cognitiveComplexityThreshold: 15
            },
            namingConventions: {
                camelCaseRegex: /^[a-z][a-zA-Z0-9]*$/,
                constantCaseRegex: /^[A-Z][A-Z0-9_]*$/,
                pascalCaseRegex: /^[A-Z][a-zA-Z0-9]*$/
            },
            testingStandards: {
                minTestCoverage: 80,
                maxCyclomaticComplexity: 10
            }
        };
    }

    /**
     * Analyze PR diff and provide review comments
     * @param {string} prDiff - The diff content of the pull request
     * @param {string} repoName - Repository name
     * @param {number} prNumber - Pull request number
     * @returns {Object} Review results with issues and suggestions
     */
    async analyzePR(prDiff, repoName, prNumber) {
        const issues = [];
        const suggestions = [];
        const securityWarnings = [];
        const styleViolations = [];

        // Analyze the diff for various issues
        issues.push(...this.checkSecurityVulnerabilities(prDiff));
        issues.push(...this.checkCodeQualityIssues(prDiff));
        issues.push(...this.checkPerformanceIssues(prDiff));
        issues.push(...this.checkBestPractices(prDiff));

        // Calculate review confidence score
        const confidenceScore = this.calculateReviewConfidence(issues, prDiff);

        return {
            prNumber,
            repoName,
            issues,
            suggestions,
            securityWarnings,
            styleViolations,
            confidenceScore,
            totalIssues: issues.length,
            severityDistribution: this.getSeverityDistribution(issues),
            recommendations: this.generateRecommendations(issues)
        };
    }

    /**
     * Check for security vulnerabilities in the code
     */
    checkSecurityVulnerabilities(diff) {
        const issues = [];
        
        for (const [patternName, pattern] of Object.entries(this.reviewPatterns)) {
            if (patternName.includes('sqlInjection') || patternName.includes('xss') || patternName.includes('hardcodedSecrets')) {
                const matches = diff.match(pattern);
                if (matches) {
                    matches.forEach(match => {
                        issues.push({
                            type: 'security',
                            severity: patternName.includes('hardcodedSecrets') ? 'high' : 'medium',
                            title: this.getSecurityIssueTitle(patternName),
                            description: this.getSecurityIssueDescription(patternName, match),
                            codeSnippet: match.substring(0, 100) + '...',
                            suggestion: this.getSecuritySuggestion(patternName)
                        });
                    });
                }
            }
        }
        
        return issues;
    }

    /**
     * Check for code quality issues
     */
    checkCodeQualityIssues(diff) {
        const issues = [];
        
        // Check for console logs
        const consoleMatches = diff.match(this.reviewPatterns.consoleLogs);
        if (consoleMatches) {
            consoleMatches.forEach(match => {
                issues.push({
                    type: 'quality',
                    severity: 'low',
                    title: 'Console Log Found',
                    description: 'Console log statements should be removed before merging to production',
                    codeSnippet: match,
                    suggestion: 'Remove console log statements or wrap them in conditional checks'
                });
            });
        }

        // Check for eval usage
        const evalMatches = diff.match(this.reviewPatterns.evalUsage);
        if (evalMatches) {
            evalMatches.forEach(match => {
                issues.push({
                    type: 'quality',
                    severity: 'high',
                    title: 'Eval Usage Detected',
                    description: 'Using eval() is a security risk and should be avoided',
                    codeSnippet: match,
                    suggestion: 'Use alternative approaches like JSON.parse() or function constructors'
                });
            });
        }
        
        return issues;
    }

    /**
     * Check for performance issues
     */
    checkPerformanceIssues(diff) {
        const issues = [];
        
        const perfMatches = diff.match(this.reviewPatterns.syncOperations);
        if (perfMatches) {
            perfMatches.forEach(match => {
                issues.push({
                    type: 'performance',
                    severity: 'medium',
                    title: 'Synchronous Operation Detected',
                    description: 'Synchronous operations can block the event loop',
                    codeSnippet: match,
                    suggestion: 'Use asynchronous alternatives like fs.readFile() instead of fs.readFileSync()'
                });
            });
        }
        
        return issues;
    }

    /**
     * Check for best practice violations
     */
    checkBestPractices(diff) {
        const issues = [];
        
        const badPatternMatches = diff.match(this.reviewPatterns.improperErrorHandling);
        if (badPatternMatches) {
            badPatternMatches.forEach(match => {
                issues.push({
                    type: 'best-practice',
                    severity: 'medium',
                    title: 'Improper Error Handling',
                    description: 'Empty catch blocks can hide important errors',
                    codeSnippet: match,
                    suggestion: 'Log the error or handle it appropriately'
                });
            });
        }
        
        return issues;
    }

    /**
     * Calculate review confidence score based on various factors
     */
    calculateReviewConfidence(issues, diff) {
        const totalLines = diff.split('\n').length;
        const issueCount = issues.length;
        
        // Base score calculation
        let score = 100;
        
        // Deduct points based on issues found
        issues.forEach(issue => {
            if (issue.severity === 'high') score -= 15;
            else if (issue.severity === 'medium') score -= 8;
            else score -= 3;
        });
        
        // Consider code complexity (simplified)
        const complexityFactor = Math.min(totalLines / 100, 10); // Max 10 points deduction for length
        score -= complexityFactor;
        
        // Ensure score stays within bounds
        return Math.max(0, Math.min(100, Math.round(score)));
    }

    /**
     * Get severity distribution for reporting
     */
    getSeverityDistribution(issues) {
        const distribution = { high: 0, medium: 0, low: 0 };
        
        issues.forEach(issue => {
            if (distribution.hasOwnProperty(issue.severity)) {
                distribution[issue.severity]++;
            }
        });
        
        return distribution;
    }

    /**
     * Generate recommendations based on issues found
     */
    generateRecommendations(issues) {
        const recommendations = [];
        
        const hasSecurityIssues = issues.some(i => i.type === 'security');
        const hasPerformanceIssues = issues.some(i => i.type === 'performance');
        const hasQualityIssues = issues.some(i => i.type === 'quality');
        
        if (hasSecurityIssues) {
            recommendations.push({
                priority: 'high',
                title: 'Security Review Required',
                description: 'Critical security vulnerabilities detected. Manual security review is required before merging.'
            });
        }
        
        if (hasPerformanceIssues) {
            recommendations.push({
                priority: 'medium',
                title: 'Performance Impact',
                description: 'Performance issues detected. Consider optimization before merging.'
            });
        }
        
        if (hasQualityIssues) {
            recommendations.push({
                priority: 'low',
                title: 'Code Quality Improvements',
                description: 'Minor code quality issues detected. Address for better maintainability.'
            });
        }
        
        if (recommendations.length === 0) {
            recommendations.push({
                priority: 'none',
                title: 'Clean Code',
                description: 'No significant issues detected. Code appears ready for review.'
            });
        }
        
        return recommendations;
    }

    /**
     * Helper methods for issue descriptions
     */
    getSecurityIssueTitle(patternName) {
        switch(patternName) {
            case 'sqlInjection': return 'SQL Injection Vulnerability';
            case 'xssRisk': return 'Cross-Site Scripting (XSS) Risk';
            case 'hardcodedSecrets': return 'Hardcoded Secret Detected';
            default: return 'Security Vulnerability';
        }
    }

    getSecurityIssueDescription(patternName, match) {
        switch(patternName) {
            case 'sqlInjection':
                return `Potential SQL injection vulnerability detected: ${match.substring(0, 50)}...`;
            case 'xssRisk':
                return `Potential XSS risk detected: ${match.substring(0, 50)}...`;
            case 'hardcodedSecrets':
                return `Hardcoded secret detected: ${match.substring(0, 50)}...`;
            default:
                return `Security vulnerability detected: ${match.substring(0, 50)}...`;
        }
    }

    getSecuritySuggestion(patternName) {
        switch(patternName) {
            case 'sqlInjection':
                return 'Use parameterized queries or prepared statements to prevent SQL injection.';
            case 'xssRisk':
                return 'Sanitize user inputs and use proper output encoding to prevent XSS.';
            case 'hardcodedSecrets':
                return 'Move secrets to environment variables or secure configuration management.';
            default:
                return 'Review the code for potential security improvements.';
        }
    }
}

module.exports = new PRReviewerService();