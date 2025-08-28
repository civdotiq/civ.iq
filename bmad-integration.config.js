/**
 * BMad Method Integration Configuration for civic-intel-hub
 * Created: 2025-08-17T21:49:13.757Z
 *
 * This file tracks which BMad features are actively used in this project
 */

module.exports = {
  // Features currently in use
  activeFeatures: {
    codebaseFlattener: true, // Useful for AI context sharing
    storyTemplates: false, // Enable when needed for complex features
    agentPrompts: {
      architect: false, // Enable for major refactoring
      scrumMaster: false, // Enable for story management
      developer: false, // Your CLAUDE.md is currently better
      qa: true, // Useful QA prompts to complement your testing
      orchestrator: false, // Not needed with your current workflow
    },
  },

  // Integration with existing workflow
  compatibility: {
    preserveClaudeMd: true, // Keep your CLAUDE.md as primary
    useIncrementalApproach: true, // Maintain your 30-line validation rule
    realDataOnly: true, // Aligns with your government API approach
  },

  // Custom paths (if different from defaults)
  paths: {
    stories: 'bmad-core/stories',
    agents: 'bmad-core/agents',
    data: 'bmad-core/data',
  },
};
