#!/usr/bin/env node

/**
 * Comprehensive validation script for CIV.IQ
 * Run with: node scripts/validation/validate-all.js
 * Or use: npm run validate:all
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

// Validation tasks
const tasks = [
  {
    name: 'TypeScript Check',
    command: 'npm run type-check',
    critical: true,
  },
  {
    name: 'ESLint',
    command: 'npm run lint',
    critical: true,
  },
  {
    name: 'Jest Tests',
    command: 'npm test -- --passWithNoTests',
    critical: true,
  },
  {
    name: 'Build Check',
    command: 'npm run build',
    critical: true,
  },
  {
    name: 'Security Audit',
    command: 'npm audit --audit-level=high',
    critical: false,
  },
];

// Forbidden patterns to check
const forbiddenPatterns = [
  {
    pattern: /Math\.random\(\)/g,
    message: 'Math.random() found - potential mock data generation',
    files: ['src/**/*.ts', 'src/**/*.tsx'],
  },
  {
    pattern: /:\s*any[;,\s\)]/g,
    message: 'TypeScript "any" type found - use specific types',
    files: ['src/**/*.ts', 'src/**/*.tsx'],
  },
  {
    pattern: /console\.(log|debug|info)/g,
    message: 'Console statement found - remove before production',
    files: ['src/**/*.ts', 'src/**/*.tsx'],
  },
  {
    pattern: /TODO|FIXME|HACK/g,
    message: 'TODO/FIXME/HACK comment found - address before commit',
    files: ['src/**/*.ts', 'src/**/*.tsx'],
  },
];

// Utility functions
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(`  ${title}`, 'cyan');
  console.log('='.repeat(60));
}

function runCommand(command, silent = false) {
  try {
    const output = execSync(command, {
      encoding: 'utf8',
      stdio: silent ? 'pipe' : 'inherit',
    });
    return { success: true, output };
  } catch (error) {
    return {
      success: false,
      output: error.stdout || error.message,
    };
  }
}

function checkForbiddenPatterns() {
  // Simple glob implementation for Node.js built-in
  const glob = pattern => {
    const baseDir = path.join(process.cwd(), 'src');
    const files = [];

    function walkDir(dir) {
      try {
        const items = fs.readdirSync(dir);
        for (const item of items) {
          const fullPath = path.join(dir, item);
          const stat = fs.statSync(fullPath);

          if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
            walkDir(fullPath);
          } else if (stat.isFile() && (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx'))) {
            files.push(fullPath);
          }
        }
      } catch (e) {
        // Directory doesn't exist or no access
      }
    }

    if (fs.existsSync(baseDir)) {
      walkDir(baseDir);
    }
    return files;
  };

  const violations = [];

  forbiddenPatterns.forEach(({ pattern, message, files }) => {
    files.forEach(filePattern => {
      const matchedFiles = glob(filePattern);

      matchedFiles.forEach(file => {
        try {
          const content = fs.readFileSync(file, 'utf8');
          const matches = content.match(pattern);

          if (matches) {
            violations.push({
              file: path.relative(process.cwd(), file),
              message,
              count: matches.length,
            });
          }
        } catch (e) {
          // File read error, skip
        }
      });
    });
  });

  return violations;
}

function checkEnvironmentVariables() {
  const required = ['CONGRESS_API_KEY', 'FEC_API_KEY', 'CENSUS_API_KEY'];

  const envFile = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envFile)) {
    return { success: false, missing: required };
  }

  const envContent = fs.readFileSync(envFile, 'utf8');
  const missing = required.filter(key => !envContent.includes(key));

  return { success: missing.length === 0, missing };
}

async function main() {
  log('\n🚀 CIV.IQ Validation Suite\n', 'bold');

  const results = {
    passed: [],
    failed: [],
    warnings: [],
  };

  // Check environment variables
  logSection('Environment Check');
  const envCheck = checkEnvironmentVariables();
  if (envCheck.success) {
    log('✅ All required environment variables present', 'green');
    results.passed.push('Environment variables');
  } else {
    log(`❌ Missing environment variables: ${envCheck.missing.join(', ')}`, 'red');
    results.failed.push('Environment variables');
  }

  // Check for forbidden patterns
  logSection('Code Quality Check');
  const violations = checkForbiddenPatterns();
  if (violations.length === 0) {
    log('✅ No forbidden patterns found', 'green');
    results.passed.push('Code patterns');
  } else {
    log('⚠️  Forbidden patterns detected:', 'yellow');
    violations.forEach(v => {
      log(`   ${v.file}: ${v.message} (${v.count} occurrences)`, 'yellow');
    });
    results.warnings.push('Code patterns');
  }

  // Run validation tasks
  for (const task of tasks) {
    logSection(task.name);

    const result = runCommand(task.command);

    if (result.success) {
      log(`✅ ${task.name} passed`, 'green');
      results.passed.push(task.name);
    } else {
      if (task.critical) {
        log(`❌ ${task.name} failed`, 'red');
        results.failed.push(task.name);
      } else {
        log(`⚠️  ${task.name} has warnings`, 'yellow');
        results.warnings.push(task.name);
      }
    }
  }

  // Summary
  logSection('Validation Summary');

  const totalChecks = results.passed.length + results.failed.length + results.warnings.length;
  const passRate = Math.round((results.passed.length / totalChecks) * 100);

  log(`Total Checks: ${totalChecks}`, 'bold');
  log(`✅ Passed: ${results.passed.length}`, 'green');
  log(`⚠️  Warnings: ${results.warnings.length}`, 'yellow');
  log(`❌ Failed: ${results.failed.length}`, 'red');
  log(`📊 Pass Rate: ${passRate}%`, passRate === 100 ? 'green' : passRate >= 80 ? 'yellow' : 'red');

  // Exit code
  if (results.failed.length > 0) {
    log('\n❌ Validation failed. Fix issues before proceeding.', 'red');
    process.exit(1);
  } else if (results.warnings.length > 0) {
    log('\n⚠️  Validation passed with warnings. Consider addressing them.', 'yellow');
    process.exit(0);
  } else {
    log('\n✅ All validations passed! Ready to commit.', 'green');
    process.exit(0);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    log(`\n❌ Validation script error: ${error.message}`, 'red');
    process.exit(1);
  });
}

export { main };
