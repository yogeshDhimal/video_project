/**
 * Simple Windows-compatible utility to kill a process on a specific port.
 */
const { execSync } = require('child_process');

function killPort(port) {
  try {
    const stdout = execSync(`netstat -ano | findstr :${port}`).toString();
    const lines = stdout.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      console.log(`No process found listening on port ${port}`);
      return;
    }

    const pids = new Set();
    lines.forEach(line => {
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && !isNaN(pid)) {
        pids.add(pid);
      }
    });

    pids.forEach(pid => {
      console.log(`Killing process ${pid} on port ${port}...`);
      try {
        execSync(`taskkill /F /PID ${pid}`);
        console.log(`✓ Process ${pid} terminated.`);
      } catch (err) {
        console.error(`❌ Failed to kill process ${pid}:`, err.message);
      }
    });
  } catch (err) {
    // If findstr returns nothing, it throws an error in execSync
    if (err.status === 1) {
      console.log(`No process found listening on port ${port}`);
    } else {
      console.error('Error killing port:', err.message);
    }
  }
}

const port = process.env.PORT || 5000;
killPort(port);
