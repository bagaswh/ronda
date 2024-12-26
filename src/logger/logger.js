import ConsoleContext from "./ConsoleContext.js";
import { shouldLog, constructString } from "./utils.js";

export function createLogger(logLevel = "info", context) {
  let theContext = context;
  if (!theContext) {
    theContext = new ConsoleContext();
  }

  return Object.create({
    __context: theContext,

    debug(...msg) {
      if (shouldLog("debug", logLevel)) {
        theContext.debug(...constructString(...msg));
      }
    },
    info(...msg) {
      if (shouldLog("info", logLevel)) {
        theContext.log(...constructString(...msg));
      }
    },
    error(...msg) {
      if (shouldLog("error", logLevel)) {
        theContext.error(...constructString(...msg));
      }
    },
  });
}

let globalLogger;

export function setGlobalLogger(logger) {
  globalLogger = logger;
}

export function getGlobalLogger() {
  if (!globalLogger) {
    setGlobalLogger(
      createLogger(
        process.env.PERONDA_LOG_LEVEL || "info",
        new ConsoleContext()
      )
    );
  }
  return globalLogger;
}
