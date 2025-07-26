/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Bundle optimization utilities and third-party library optimizations
 * for the civic-intel-hub application
 */

// D3 Optimization - Only import specific modules needed
export const optimizedD3Imports = {
  // Core selection and manipulation
  select: () => import('d3-selection').then(d => d.select),
  selectAll: () => import('d3-selection').then(d => d.selectAll),

  // Scales - import only what's needed
  scaleLinear: () => import('d3-scale').then(d => d.scaleLinear),
  scaleBand: () => import('d3-scale').then(d => d.scaleBand),
  scaleOrdinal: () => import('d3-scale').then(d => d.scaleOrdinal),

  // Shapes and paths
  line: () => import('d3-shape').then(d => d.line),
  arc: () => import('d3-shape').then(d => d.arc),

  // Forces for network diagrams
  forceSimulation: () => import('d3-force').then(d => d.forceSimulation),
  forceLink: () => import('d3-force').then(d => d.forceLink),
  forceManyBody: () => import('d3-force').then(d => d.forceManyBody),
  forceCenter: () => import('d3-force').then(d => d.forceCenter),

  // Interpolation and transitions
  interpolate: () => import('d3-interpolate').then(d => d.interpolate),
  easeLinear: () => import('d3-ease').then(d => d.easeLinear),

  // Event handling
  pointer: () => import('d3-selection').then(d => d.pointer),
  drag: () => import('d3-drag').then(d => d.drag),
  zoom: () => import('d3-zoom').then(d => d.zoom),
};

// Bundle size analysis utilities
export const bundleAnalysis = {
  // Estimate component bundle sizes
  estimateComponentSize: (componentName: string): number => {
    const sizeEstimates: Record<string, number> = {
      InteractiveVisualizations: 85000, // D3 heavy
      CampaignFinanceVisualizer: 75000, // Complex charts
      DistrictMap: 60000, // Leaflet
      EnhancedNewsFeed: 35000, // Data processing
      BillsTracker: 40000, // Tables and filtering
      PartyAlignmentAnalysis: 45000, // Charts
      AdvancedSearch: 25000, // Form components
      StateDataVisualizations: 55000, // Multiple charts
    };

    return sizeEstimates[componentName] || 20000; // Default estimate
  },

  // Calculate total bundle size
  calculateTotalSize: (components: string[]): number => {
    return components.reduce((total, component) => {
      return total + bundleAnalysis.estimateComponentSize(component);
    }, 0);
  },

  // Recommend splitting strategy
  recommendSplitStrategy: (
    components: string[]
  ): {
    critical: string[];
    lazy: string[];
    preload: string[];
  } => {
    const critical: string[] = [];
    const lazy: string[] = [];
    const preload: string[] = [];

    components.forEach(component => {
      const size = bundleAnalysis.estimateComponentSize(component);

      if (size > 50000) {
        lazy.push(component);
      } else if (size > 30000) {
        preload.push(component);
      } else {
        critical.push(component);
      }
    });

    return { critical, lazy, preload };
  },
};

// Performance budgets
export const performanceBudgets = {
  // Bundle size limits
  bundleSizes: {
    initial: 200 * 1024, // 200KB initial bundle
    async: 100 * 1024, // 100KB per async chunk
    total: 1000 * 1024, // 1MB total for all chunks
  },

  // Loading time budgets
  loadingTimes: {
    firstContentfulPaint: 1500, // 1.5 seconds
    largestContentfulPaint: 2500, // 2.5 seconds
    timeToInteractive: 3000, // 3 seconds
  },
};

// Optimization recommendations
export const optimizationRecommendations = {
  // Analyze current bundle and suggest optimizations
  analyzeAndRecommend: (currentComponents: string[]) => {
    const strategy = bundleAnalysis.recommendSplitStrategy(currentComponents);
    const totalSize = bundleAnalysis.calculateTotalSize(currentComponents);

    const recommendations = {
      bundleSize: {
        current: totalSize,
        target: performanceBudgets.bundleSizes.total,
        status: totalSize <= performanceBudgets.bundleSizes.total ? 'good' : 'needs-optimization',
      },
      splitting: strategy,
      optimizations: [] as string[],
    };

    // Add specific recommendations
    if (totalSize > performanceBudgets.bundleSizes.total) {
      recommendations.optimizations.push('Consider lazy loading heavy components');
    }

    if (strategy.lazy.length === 0) {
      recommendations.optimizations.push(
        'No lazy loading detected - consider splitting large components'
      );
    }

    if (currentComponents.includes('InteractiveVisualizations')) {
      recommendations.optimizations.push('Use optimized D3 imports for visualization components');
    }

    if (currentComponents.includes('DistrictMap')) {
      recommendations.optimizations.push('Consider lazy loading map components');
    }

    return recommendations;
  },
};

// Export utility functions for easy use
const bundleOptimization = {
  optimizedD3Imports,
  bundleAnalysis,
  performanceBudgets,
  optimizationRecommendations,
};

export default bundleOptimization;
