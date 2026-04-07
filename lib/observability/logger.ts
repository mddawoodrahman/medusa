type LogLevel = "info" | "warn" | "error";

type LogContext = {
  requestId?: string;
  userId?: string;
  route?: string;
  [key: string]: unknown;
};

const serializeError = (error: unknown) => {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return { message: String(error) };
};

const writeLog = (
  level: LogLevel,
  message: string,
  context: LogContext = {},
  data?: Record<string, unknown>,
) => {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    message,
    requestId: context.requestId ?? "n/a",
    userId: context.userId ?? "anonymous",
    route: context.route,
    ...data,
  };

  const serialized = JSON.stringify(payload);

  if (level === "error") {
    console.error(serialized);
    return;
  }

  if (level === "warn") {
    console.warn(serialized);
    return;
  }

  console.info(serialized);
};

export const createRequestId = () => crypto.randomUUID();

export const logger = {
  info: (
    message: string,
    context: LogContext = {},
    data?: Record<string, unknown>,
  ) => writeLog("info", message, context, data),
  warn: (
    message: string,
    context: LogContext = {},
    data?: Record<string, unknown>,
  ) => writeLog("warn", message, context, data),
  error: (
    message: string,
    context: LogContext = {},
    error?: unknown,
    data?: Record<string, unknown>,
  ) =>
    writeLog("error", message, context, {
      ...data,
      error: serializeError(error),
    }),
};
