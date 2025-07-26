# Civic-Intel-Hub AI Agents 🤖

This directory contains specialized AI agents designed specifically for the civic-intel-hub project. Each agent follows the OODA loop methodology (Observe, Orient, Decide, Act) for systematic problem-solving.

## Available Agents

### Core OODA Agents

- **observe.md** - Information gathering and pattern recognition
- **orient.md** - Analysis and context understanding
- **decide.md** - Solution evaluation and recommendation
- **act.md** - Implementation and validation

### Specialized Civic-Intel-Hub Agents

- **api-debugger.md** - Debug API routes and external integrations
- **code-optimizer.md** - Analyze and optimize codebase performance
- **doc-generator.md** - Create comprehensive documentation
- **api-integrator.md** - Integrate and maintain government APIs

## How to Use These Agents

### 1. Using the Task Tool

In your conversation with Claude, use the Task tool to invoke specific agents:

```
I need to debug the representatives API endpoint that's returning 500 errors.
```

Then use: `/api-debugger` to invoke the API debugging agent.

### 2. Agent Workflows

#### For API Issues:

1. `/api-debugger` - Diagnose the specific API problem
2. `/act` - Implement the recommended fix
3. `/api-integrator` - Optimize the integration if needed

#### For Performance Issues:

1. `/observe` - Gather performance data
2. `/code-optimizer` - Analyze and recommend optimizations
3. `/act` - Implement the optimizations

#### for Documentation Needs:

1. `/observe` - Analyze what needs documenting
2. `/doc-generator` - Create comprehensive documentation
3. `/act` - Publish and maintain the documentation

### 3. Agent Combinations

**Complete Feature Development:**

```
/observe → /orient → /decide → /act
```

**API Troubleshooting:**

```
/api-debugger → /decide → /act
```

**Performance Optimization:**

```
/code-optimizer → /decide → /act
```

**Documentation Sprint:**

```
/doc-generator → /act
```

## Agent Specializations

### API Debugger

- **Focus**: Next.js API routes, government API integrations
- **Tools**: Error analysis, logging review, API testing
- **Output**: Root cause analysis and fix recommendations

### Code Optimizer

- **Focus**: React/Next.js performance, bundle optimization
- **Tools**: Performance profiling, code analysis, metrics
- **Output**: Optimization roadmap and implementation plan

### Doc Generator

- **Focus**: Technical documentation, API docs, user guides
- **Tools**: Code analysis, content creation, formatting
- **Output**: Comprehensive documentation suite

### API Integrator

- **Focus**: Government API connections, data pipelines
- **Tools**: API analysis, integration patterns, monitoring
- **Output**: Robust API integration architecture

## Best Practices

### 1. Start with Observation

Always begin complex tasks with the `/observe` agent to gather comprehensive information.

### 2. Use Specialized Agents for Domain Expertise

For civic-intel-hub specific issues, use the specialized agents rather than generic ones.

### 3. Follow OODA Sequence for Complex Problems

For multi-faceted issues, follow the complete OODA loop for systematic problem-solving.

### 4. Document Agent Decisions

Each agent provides reasoning for their recommendations - review this for learning and validation.

### 5. Validate Agent Work

Always test and validate agent outputs, especially for critical production changes.

## Agent Invocation Examples

### Debug a failing API endpoint:

```
The /api/representatives endpoint is timing out for ZIP code 48221.
Use /api-debugger to diagnose and fix this issue.
```

### Optimize page load performance:

```
The representatives page is loading slowly.
Use /code-optimizer to analyze and improve performance.
```

### Create API documentation:

```
We need comprehensive documentation for our government API integrations.
Use /doc-generator to create complete API docs.
```

### Integrate a new government API:

```
We need to integrate the OpenStates API for state legislature data.
Use /api-integrator to plan and implement this integration.
```

## Maintenance

These agents are living documents that should be updated as the civic-intel-hub project evolves. Consider updating them when:

- New APIs are integrated
- Architecture patterns change
- New performance requirements emerge
- Documentation standards evolve

## Support

For issues with these agents or suggestions for improvements, refer to the main civic-intel-hub project documentation or create an issue in the project repository.
