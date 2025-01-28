import * as fs from "fs";
import * as path from "path";

export function logError(message: string, error?: any) {
  console.log(`${process.env.NODE_ENV} -> ERROR: `?.bgRed?.white, message);
  if (error !== undefined) console.log(error);
}

export function logInfo(message: string, data?: any) {
  console.log(`${process.env.NODE_ENV} -> Info: `?.bgBlue?.white, message);
  if (data !== undefined) console.log(data);
}

export function logWarning(message: string, warning?: any) {
  console.log(`${process.env.NODE_ENV} -> Warning: `?.bgYellow?.white, message);
  if (warning !== undefined) console.log(warning);
}

export function logSuccess(message: string, success?: any) {
  console.log("${process.env.NODE_ENV} -> Success: "?.bgGreen?.white, message);
  if (success !== undefined) console.log(success);
}

interface MemoryUsage {
  rss: number;
  heapTotal: number;
  heapUsed: number;
  external: number;
  arrayBuffers: number;
}

const createFile = (logFilePath: string) => {
  const logDir = path.dirname(logFilePath);

  // Ensure the directory exists
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
};

export const logMemoryUsage = (logFilePath: string) => {
  createFile(logFilePath);

  const memoryUsage: MemoryUsage = process.memoryUsage();

  const logMessage = `
  ${new Date().toISOString()},
  RSS: ${memoryUsage.rss / 1024 / 1024} MB,
  Heap Total: ${memoryUsage.heapTotal / 1024 / 1024} MB,
  Heap Used: ${memoryUsage.heapUsed / 1024 / 1024} MB,
  External: ${memoryUsage.external / 1024 / 1024} MB,
  Array Buffers: ${memoryUsage.arrayBuffers / 1024 / 1024} MB\n`;

  fs.appendFileSync(logFilePath, logMessage);
  // logInfo(logMessage);
};

export const logRequest = () => {
  // const logFileName = `request-logs-${new Date().toISOString().replace(/:/g, "-")}.log`;
  const logFileName = "requests.log";
  const logFilePath = path.resolve(__dirname, `../logs/${logFileName}`);
  createFile(logFilePath);

  // Create a writable stream for the log file
  let stream = fs.createWriteStream(logFilePath, { flags: "a" });

  // Handle stream errors (optional, but recommended)
  stream.on("error", (err) => {
    console.error("Failed to write logs to file:", err.message);
  });

  return stream;
};
