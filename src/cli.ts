#!/usr/bin/env node

import { spawn } from 'child_process';
import { join, dirname } from 'path';
import * as fs from 'fs';

const args = process.argv.slice(2);
const PORT = process.env.PORT || 3001;

// Get the directory where the package is installed
const packageDir = dirname(dirname(__filename));
const serverPath = join(packageDir, 'dist', 'server', 'index.js');
const clientPath = join(packageDir, 'dist');

function showHelp() {
  console.log(`
@nerdo/code-reviewer - Visual Git Diff Tool

Usage:
  npx @nerdo/code-reviewer [options]

Options:
  -p, --port <port>    Port to run on (default: 3001)
  -h, --help          Show this help message
  --version           Show version

Examples:
  npx @nerdo/code-reviewer
  npx @nerdo/code-reviewer --port 8080

The tool will start a local web server and open your browser to view git diffs.
Make sure you run this command from within a git repository.
`);
}

function showVersion() {
  const packageJsonPath = join(packageDir, 'package.json');
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    console.log(packageJson.version);
  } catch (error) {
    console.log('Unknown version');
  }
}

// Parse command line arguments
let port = PORT;
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  
  if (arg === '-h' || arg === '--help') {
    showHelp();
    process.exit(0);
  }
  
  if (arg === '--version') {
    showVersion();
    process.exit(0);
  }
  
  if (arg === '-p' || arg === '--port') {
    const nextArg = args[i + 1];
    if (nextArg && !isNaN(parseInt(nextArg))) {
      port = nextArg;
      i++; // Skip the next argument since we consumed it
    } else {
      console.error('Error: --port requires a valid port number');
      process.exit(1);
    }
  }
}

// Check if we're in a git repository
function checkGitRepo() {
  try {
    const { execSync } = require('child_process'); // eslint-disable-line @typescript-eslint/no-var-requires
    execSync('git rev-parse --git-dir', { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

if (!checkGitRepo()) {
  console.error('Error: Not in a git repository. Please run this command from within a git repository.');
  process.exit(1);
}

// Check if server file exists
if (!fs.existsSync(serverPath)) {
  console.error(`Error: Server file not found at ${serverPath}`);
  console.error('The package may not be properly installed. Try reinstalling with:');
  console.error('npm install -g @nerdo/code-reviewer');
  process.exit(1);
}

console.log('Starting Code Reviewer...');
console.log(`Server will run on http://localhost:${port}`);

// Function to open browser
function openBrowser(url: string) {
  const start = process.platform === 'darwin' ? 'open' : 
                process.platform === 'win32' ? 'start' : 'xdg-open';
  
  setTimeout(() => {
    const { exec } = require('child_process'); // eslint-disable-line @typescript-eslint/no-var-requires
    exec(`${start} ${url}`, (error: unknown) => {
      if (error) {
        console.log(`Open your browser and navigate to: ${url}`);
      }
    });
  }, 2000); // Wait 2 seconds for server to start
}

// Start the server
const server = spawn('node', [serverPath], {
  env: { 
    ...process.env, 
    PORT: port.toString(),
    DIST_PATH: clientPath
  },
  stdio: 'inherit'
});

// Open browser after server starts
openBrowser(`http://localhost:${port}`);

// Handle server termination
server.on('close', (code) => {
  if (code !== 0) {
    console.error(`Server exited with code ${code}`);
    process.exit(code || 1);
  }
});

// Handle CLI termination
process.on('SIGINT', () => {
  console.log('\nShutting down Code Reviewer...');
  server.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  server.kill('SIGTERM');
  process.exit(0);
});