let debugEnabled = false;

export function setDebugMode(enabled) {
  debugEnabled = !!enabled;
}

export const logger = {
  log: (...args) => { if (debugEnabled) console.log(...args); },
  warn: (...args) => { if (debugEnabled) console.warn(...args); },
  error: (...args) => console.error(...args),
};
