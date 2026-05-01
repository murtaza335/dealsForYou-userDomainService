import { env } from "../config/env.js";

export enum LogLevel {
  DEBUG = "DEBUG",
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  [LogLevel.DEBUG]: 0,
  [LogLevel.INFO]: 1,
  [LogLevel.WARN]: 2,
  [LogLevel.ERROR]: 3,
};

const shouldLog = (level: LogLevel): boolean => {
  const minLevel = env.NODE_ENV === "production" ? LogLevel.INFO : LogLevel.DEBUG;
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[minLevel];
};

const formatMessage = (level: LogLevel, message: string, data?: unknown): string => {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] ${level} - ${message}`;

  if (data) {
    try {
      const dataStr = typeof data === "string" ? data : JSON.stringify(data, null, 2);
      return `${prefix}\n${dataStr}`;
    } catch {
      return `${prefix}\n${String(data)}`;
    }
  }

  return prefix;
};

export const logger = {
  debug: (message: string, data?: unknown) => {
    if (shouldLog(LogLevel.DEBUG)) {
      console.debug(formatMessage(LogLevel.DEBUG, message, data));
    }
  },

  info: (message: string, data?: unknown) => {
    if (shouldLog(LogLevel.INFO)) {
      console.info(formatMessage(LogLevel.INFO, message, data));
    }
  },

  warn: (message: string, data?: unknown) => {
    if (shouldLog(LogLevel.WARN)) {
      console.warn(formatMessage(LogLevel.WARN, message, data));
    }
  },

  error: (message: string, error?: Error | unknown) => {
    if (shouldLog(LogLevel.ERROR)) {
      const errorData = error instanceof Error ? error.message : String(error);
      console.error(formatMessage(LogLevel.ERROR, message, errorData));
    }
  },
};
