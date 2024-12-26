import { getIndexFromArray } from "../utils/array.js";

export function shouldLog(type, logLevel = "info") {
  const logLevels = ["critical", "error", "warning", "info", "debug"];
  const logLevelIdx = getIndexFromArray(logLevels, logLevel.toLowerCase());
  return logLevelIdx > -1 && logLevels.slice(0, logLevelIdx + 1).includes(type);
}

export function constructString(...msg) {
  const args = [];
  if (process.env.PERONDA_LOG_WITH_TIMESTAMP) {
    args.push(`[${new Date().toISOString()}]`);
  }
  args.push(...msg);
  return args;
}
