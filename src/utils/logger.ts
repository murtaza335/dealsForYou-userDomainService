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

const serializeData = (data: unknown): string => {
  if (data instanceof Error) {
    return JSON.stringify(
      {
        name: data.name,
        message: data.message,
        stack: data.stack,
      },
      null,
      2,
    );
  }

  if (typeof data === "string") {
    return data;
  }

  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
};

const formatMessage = (level: LogLevel, message: string, data?: unknown): string => {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] ${level} - ${message}`;

  if (data) {
    return `${prefix}\n${serializeData(data)}`;
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
      console.error(formatMessage(LogLevel.ERROR, message, error));
    }
  },
};
