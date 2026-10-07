import 'dotenv/config';
import { execSync } from 'child_process';

import http from 'http';
import { initSocket } from './socket.js';
import connectDB from './config/db.js';
import app, { allowedOrigins } from './app.js';

const PORT = process.env.PORT || 5002;

// Connect to MongoDB
connectDB();

// Create HTTP server and attach Socket.io
const httpServer = http.createServer(app);
initSocket(httpServer, allowedOrigins);

const startServer = (retried = false) => {
  // [TCP Backlog] macOS default somaxconn is 128 — too low for load testing
  // Increase to 2048 to prevent "connection reset by peer" under heavy load
  // Also requires: sudo sysctl -w kern.ipc.somaxconn=2048
  httpServer.listen(Number(PORT), '0.0.0.0', 2048, () => {
    console.log(`Server running on port ${PORT}`);
  });

  httpServer.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n⚠️  Port ${PORT} is already in use.`);
      if (!retried) {
        console.log(`   Attempting to kill the stale process on port ${PORT}...`);
        try {
          const pid = execSync(`lsof -i :${PORT} -t`).toString().trim().split('\n')[0];
          if (pid) {
            execSync(`kill -9 ${pid}`);
            console.log(`   Killed process ${pid}. Retrying in 1s...`);
            setTimeout(() => startServer(true), 1000);
          }
        } catch {
          console.error(`   Could not kill stale process. Kill it manually:\n   lsof -i :${PORT} -t | xargs kill -9`);
          process.exit(1);
        }
      } else {
        console.error(`   Port ${PORT} is still in use after retry. Kill it manually:\n   lsof -i :${PORT} -t | xargs kill -9`);
        process.exit(1);
      }
    } else {
      console.error('Server error:', err);
      process.exit(1);
    }
  });
};

startServer();
