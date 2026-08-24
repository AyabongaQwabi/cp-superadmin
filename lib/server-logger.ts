function timestamp() {
  return new Date().toISOString();
}

function fmt(level: string, scope: string, message: string, data?: Record<string, unknown>) {
  const base = `[${timestamp()}] ${level} [${scope}] ${message}`;
  return data && Object.keys(data).length ? `${base} ${JSON.stringify(data)}` : base;
}

export function createLogger(scope: string) {
  return {
    info(message: string, data?: Record<string, unknown>) {
      console.log(fmt("INFO", scope, message, data));
    },
    warn(message: string, data?: Record<string, unknown>) {
      console.warn(fmt("WARN", scope, message, data));
    },
    error(message: string, data?: Record<string, unknown>) {
      console.error(fmt("ERROR", scope, message, data));
    },
  };
}

// Never log: message/response text, session tokens, secrets, or full request
// bodies. Log shape/metadata only -- lengths, counts, ids, durations.
export function textPreview(text: string, maxLen = 40): string {
  const oneLine = text.replace(/\s+/g, " ").trim();
  return oneLine.length > maxLen ? `${oneLine.slice(0, maxLen)}…(${text.length} chars)` : `${oneLine}(${text.length} chars)`;
}
