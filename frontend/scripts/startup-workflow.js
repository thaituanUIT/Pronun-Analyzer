#!/usr/bin/env node

/**
 * Startup Development Workflow Script
 * 
 * This script helps set up and manage the development workflow
 * for the Speech-to-Text React application.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function execCommand(command, options = {}) {
  try {
    log(`Executing: ${command}`, colors.cyan);
    execSync(command, { stdio: 'inherit', ...options });
    return true;
  } catch (error) {
    log(`Error executing: ${command}`, colors.red);
    log(error.message, colors.red);
    return false;
  }
}

function checkFile(filePath) {
  return fs.existsSync(path.join(__dirname, '..', filePath));
}

function setupWorkflow() {
  log('\nSetting up React Startup Workflow', colors.bright + colors.green);
  
  // Check if we're in the right directory
  if (!checkFile('package.json')) {
    log('package.json not found. Make sure you\'re in the frontend directory.', colors.red);
    process.exit(1);
  }

  log('\nInstalling dependencies...', colors.yellow);
  if (!execCommand('npm install')) {
    log('Failed to install dependencies', colors.red);
    process.exit(1);
  }

  log('\nSetting up Git hooks...', colors.yellow);
  if (!execCommand('npx husky install')) {
    log('Failed to setup Git hooks (this is okay if not in a Git repo)', colors.yellow);
  }

  log('\nRunning initial tests...', colors.yellow);
  if (!execCommand('npm test -- --watchAll=false --coverage')) {
    log('Some tests failed, please review and fix', colors.yellow);
  }

  log('\nRunning code quality checks...', colors.yellow);
  if (!execCommand('npm run lint')) {
    log('Linting issues found, running auto-fix...', colors.yellow);
    execCommand('npm run lint:fix');
  }

  if (!execCommand('npm run format:check')) {
    log('Formatting issues found, running auto-format...', colors.yellow);
    execCommand('npm run format');
  }

  log('\nBuilding application...', colors.yellow);
  if (!execCommand('npm run build')) {
    log('Build failed, please fix errors', colors.red);
    process.exit(1);
  }

  log('\nWorkflow setup complete!', colors.bright + colors.green);
  showNextSteps();
}

function runDevelopment() {
  log('\nStarting development mode', colors.bright + colors.blue);
  
  log('\nRunning pre-development checks...', colors.yellow);
  
  // Quick lint check
  if (!execCommand('npm run lint', { stdio: 'pipe' })) {
    log('Linting issues found, auto-fixing...', colors.yellow);
    execCommand('npm run lint:fix');
  }

  // Start development server
  log('\nStarting development server...', colors.green);
  execCommand('npm start');
}

function runTests() {
  log('\nRunning comprehensive test suite', colors.bright + colors.magenta);
  
  log('\nRunning unit tests with coverage...', colors.yellow);
  execCommand('npm run test:coverage');
  
  log('\nRunning E2E tests...', colors.yellow);
  execCommand('npm run test:e2e');
  
  log('\nTest suite completed!', colors.green);
}

function buildProduction() {
  log('\nBuilding for production', colors.bright + colors.cyan);
  
  log('\nRunning pre-build checks...', colors.yellow);
  
  // Code quality checks
  if (!execCommand('npm run lint')) {
    log('Linting failed, please fix errors', colors.red);
    process.exit(1);
  }

  if (!execCommand('npm run format:check')) {
    log('Code formatting issues found', colors.red);
    process.exit(1);
  }

  // Tests
  if (!execCommand('npm run test:coverage')) {
    log('Tests failed, please fix errors', colors.red);
    process.exit(1);
  }

  // Security audit
  log('\nRunning security audit...', colors.yellow);
  execCommand('npm audit --audit-level=moderate');

  // Build
  log('\nBuilding optimized production bundle...', colors.yellow);
  if (!execCommand('npm run build')) {
    log('Production build failed', colors.red);
    process.exit(1);
  }

  // Bundle analysis
  log('\nAnalyzing bundle size...', colors.yellow);
  execCommand('npm run build:analyze');

  log('\nProduction build completed!', colors.green);
}

function showNextSteps() {
  log('\nNext Steps:', colors.bright + colors.blue);
  log('1. Start development: npm run dev:start', colors.blue);
  log('2. Run tests: npm run dev:test', colors.blue);
  log('3. Build for production: npm run dev:build', colors.blue);
  log('4. Component refactoring: Follow REACT_STARTUP_WORKFLOW.md', colors.blue);
  log('5. Set up CI/CD: Configure GitHub Actions', colors.blue);
  log('\nDocumentation:', colors.bright + colors.blue);
  log('- Workflow guide: ../REACT_STARTUP_WORKFLOW.md', colors.blue);
  log('- Component testing: src/components/__tests__/', colors.blue);
  log('- E2E testing: cypress/e2e/', colors.blue);
}

function showHelp() {
  log('\nReact Startup Workflow Manager', colors.bright + colors.green);
  log('\nUsage: node scripts/startup-workflow.js [command]', colors.cyan);
  log('\nCommands:', colors.bright);
  log('  setup     - Set up the complete development workflow', colors.blue);
  log('  dev       - Start development server with checks', colors.blue);
  log('  test      - Run comprehensive test suite', colors.blue);
  log('  build     - Build optimized production bundle', colors.blue);
  log('  help      - Show this help message', colors.blue);
  log('\nExamples:', colors.bright);
  log('  node scripts/startup-workflow.js setup', colors.cyan);
  log('  npm run dev:setup', colors.cyan);
  log('  npm run dev:start', colors.cyan);
}

// Main execution
const command = process.argv[2];

switch (command) {
  case 'setup':
    setupWorkflow();
    break;
  case 'dev':
    runDevelopment();
    break;
  case 'test':
    runTests();
    break;
  case 'build':
    buildProduction();
    break;
  case 'help':
  case '--help':
  case '-h':
    showHelp();
    break;
  default:
    if (command) {
      log(`Unknown command: ${command}`, colors.red);
    }
    showHelp();
    process.exit(1);
}
