# Agent Usage Guide for Civic-Intel-Hub 🚀

This guide shows you how to effectively use the specialized AI agents in your civic-intel-hub project.

## Quick Start

### 1. Basic Agent Invocation

Use the Task tool in your Claude conversation to invoke agents:

```
I need help debugging the representatives API endpoint.
```

Then say: **"Use the /api-debugger agent to analyze this issue"**

### 2. Direct Agent Commands

You can invoke agents directly:

- `/api-debugger` - Debug API issues
- `/code-optimizer` - Optimize performance
- `/doc-generator` - Create documentation
- `/api-integrator` - Handle API integrations
- `/observe` - Gather information
- `/orient` - Analyze patterns
- `/decide` - Evaluate solutions
- `/act` - Implement fixes

## Real-World Examples

### 🐛 Debug API Failures

**Problem**: "The representatives endpoint is returning 500 errors"

**Solution**:

```
Use /api-debugger to analyze the representatives API endpoint failures.
Focus on error patterns, rate limiting, and external API dependencies.
```

**Expected Output**: Root cause analysis, error categorization, and fix recommendations

### ⚡ Optimize Performance

**Problem**: "The app is loading slowly"

**Solution**:

```
Use /code-optimizer to analyze civic-intel-hub performance issues.
Focus on bundle size, component rendering, and API response times.
```

**Expected Output**: Performance audit, optimization roadmap, and implementation priorities

### 📚 Create Documentation

**Problem**: "We need API documentation for developers"

**Solution**:

```
Use /doc-generator to create comprehensive API documentation.
Include all endpoints, parameters, examples, and error codes.
```

**Expected Output**: Complete API documentation with examples and troubleshooting guides

### 🔗 Integrate New APIs

**Problem**: "We need to add OpenStates API for state legislature data"

**Solution**:

```
Use /api-integrator to plan OpenStates API integration.
Design the integration architecture, error handling, and caching strategy.
```

**Expected Output**: Integration plan, implementation steps, and monitoring strategy

## Advanced Workflows

### Complete Problem-Solving (OODA Loop)

For complex issues, use the full OODA sequence:

```
1. /observe - Gather comprehensive information about the issue
2. /orient - Analyze patterns and understand the context
3. /decide - Evaluate solutions and recommend approach
4. /act - Implement the chosen solution
```

### Specialized Workflows

#### API Troubleshooting Workflow

```
1. /api-debugger - Diagnose the specific issue
2. /decide - Choose the best fix approach
3. /act - Implement and test the fix
4. /api-integrator - Optimize the integration (if needed)
```

#### Performance Optimization Workflow

```
1. /code-optimizer - Analyze performance bottlenecks
2. /decide - Prioritize optimizations by impact
3. /act - Implement optimizations incrementally
4. /code-optimizer - Verify improvements
```

#### Documentation Creation Workflow

```
1. /observe - Analyze what needs documenting
2. /doc-generator - Create comprehensive documentation
3. /act - Publish and format documentation
4. /doc-generator - Review and improve based on feedback
```

## Agent Specializations

### 🔧 API Debugger Strengths

- Next.js API route analysis
- Government API integration issues
- Rate limiting and authentication problems
- Error pattern recognition
- Circuit breaker and retry logic

### ⚡ Code Optimizer Strengths

- React/Next.js performance analysis
- Bundle size optimization
- Component rendering efficiency
- Caching strategy optimization
- Progressive Web App enhancement

### 📖 Doc Generator Strengths

- Technical API documentation
- User guides and tutorials
- Code commenting and inline docs
- Architecture documentation
- Troubleshooting guides

### 🌐 API Integrator Strengths

- Government API connectivity
- Data transformation pipelines
- Rate limiting strategies
- Error handling and retry logic
- Performance monitoring

## Best Practices

### 1. **Be Specific in Your Requests**

❌ Bad: "Fix the API"
✅ Good: "Use /api-debugger to analyze why the representatives endpoint returns 429 errors for ZIP code 48221"

### 2. **Provide Context**

Include relevant details:

- Error messages or symptoms
- Steps to reproduce the issue
- Expected vs actual behavior
- Browser/environment information

### 3. **Use Appropriate Agents**

- **Complex problems**: Start with `/observe` then `/orient`
- **Known API issues**: Use `/api-debugger` directly
- **Performance concerns**: Use `/code-optimizer`
- **Documentation needs**: Use `/doc-generator`

### 4. **Follow Agent Recommendations**

Each agent provides structured output with:

- Problem analysis
- Recommended solutions
- Implementation steps
- Validation criteria

### 5. **Iterate and Refine**

After implementing agent recommendations:

- Test the results
- Use agents again to verify improvements
- Ask for additional optimization if needed

## Common Use Cases

### Daily Development

```bash
# Debug API issues
/api-debugger "Analyze the 500 error in representatives endpoint"

# Optimize performance
/code-optimizer "The voting records page is loading slowly"

# Document new features
/doc-generator "Create docs for the new batch API endpoint"
```

### Feature Development

```bash
# Plan new integrations
/api-integrator "Design integration with Senate voting API"

# Optimize new code
/code-optimizer "Review the new component for performance issues"

# Document implementation
/doc-generator "Create user guide for the new search feature"
```

### Maintenance Tasks

```bash
# Analyze system health
/observe "Review API error rates and performance metrics"

# Plan improvements
/orient "Analyze the impact of recent API changes"

# Implement fixes
/act "Apply the recommended circuit breaker improvements"
```

## Troubleshooting Agent Usage

### Agent Not Responding as Expected

1. Check your prompt is specific enough
2. Include relevant context and error details
3. Try breaking complex requests into smaller parts
4. Use the appropriate specialized agent for your domain

### Getting Generic Responses

1. Use domain-specific agents (/api-debugger, /code-optimizer, etc.)
2. Reference specific files or components
3. Include error messages and logs
4. Specify the civic-intel-hub context

### Need Multiple Perspectives

1. Use different agents for the same issue
2. Compare recommendations
3. Follow the OODA loop for complex problems
4. Ask agents to validate each other's recommendations

## Next Steps

1. **Try the agents** with real issues in your civic-intel-hub project
2. **Customize prompts** based on your specific needs
3. **Share feedback** on agent effectiveness
4. **Extend agents** with new civic-intel-hub specific patterns

Remember: These agents are specialized for civic-intel-hub and understand the unique challenges of working with government APIs, Next.js architecture, and civic technology requirements.
