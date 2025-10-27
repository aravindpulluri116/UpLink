import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// Ensure logs directory exists
const logsDir = join(process.cwd(), 'logs');
if (!existsSync(logsDir)) {
  mkdirSync(logsDir, { recursive: true });
}

// Create write stream for file logging
const logStream = createWriteStream(join(logsDir, 'app.log'), { flags: 'a' });

export const logger = {
  info: (message: string, meta?: any) => {
    const logMessage = `[${new Date().toISOString()}] INFO: ${message}`;
    console.log(logMessage, meta ? JSON.stringify(meta, null, 2) : '');
    logStream.write(logMessage + '\n');
  },
  
  error: (message: string, error?: any) => {
    const logMessage = `[${new Date().toISOString()}] ERROR: ${message}`;
    console.error(logMessage, error);
    logStream.write(logMessage + '\n');
    if (error) {
      logStream.write(JSON.stringify(error, null, 2) + '\n');
    }
  },
  
  warn: (message: string, meta?: any) => {
    const logMessage = `[${new Date().toISOString()}] WARN: ${message}`;
    console.warn(logMessage, meta ? JSON.stringify(meta, null, 2) : '');
    logStream.write(logMessage + '\n');
  },
  
  debug: (message: string, meta?: any) => {
    if (process.env.NODE_ENV === 'development') {
      const logMessage = `[${new Date().toISOString()}] DEBUG: ${message}`;
      console.debug(logMessage, meta ? JSON.stringify(meta, null, 2) : '');
      logStream.write(logMessage + '\n');
    }
  }
};
