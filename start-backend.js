#!/usr/bin/env node

/**
 * Quick Backend Startup Script
 * Checks if backend is running and provides startup instructions
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🚀 HealBridge Backend Startup Helper');
console.log('====================================\n');

// Test if backend is already running
async function testBackend() {
  try {
    const response = await fetch('http://localhost:3000/health');
    if (response.ok) {
      console.log('✅ Backend is already running on port 3000');
      return true;
    }
  } catch (error) {
    console.log('❌ Backend is not running');
    return false;
  }
}

// Start backend server
function startBackend() {
  console.log('🔄 Starting backend server...\n');
  
  const backendPath = join(__dirname, 'backend');
  
  // Change to backend directory and run npm run dev
  const child = spawn('npm', ['run', 'dev'], {
    cwd: backendPath,
    stdio: 'inherit',
    shell: true
  });

  child.on('error', (error) => {
    console.error('❌ Failed to start backend:', error.message);
    console.log('\n📋 Manual startup instructions:');
    console.log('1. cd backend');
    console.log('2. npm install');
    console.log('3. npm run dev');
  });

  child.on('exit', (code) => {
    if (code !== 0) {
      console.log(`\n❌ Backend exited with code ${code}`);
    }
  });
}

// Main function
async function main() {
  const isRunning = await testBackend();
  
  if (!isRunning) {
    console.log('📋 Backend startup options:');
    console.log('1. Automatic: This script will start it for you');
    console.log('2. Manual: Open terminal in backend/ and run "npm run dev"\n');
    
    // Auto-start backend
    startBackend();
  } else {
    console.log('✅ Backend is ready!');
    console.log('🌐 API available at: http://localhost:3000');
    console.log('🏥 Health check: http://localhost:3000/health');
  }
}

main().catch(console.error);