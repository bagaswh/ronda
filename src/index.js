import { ActionRunner } from "./action-runner.js";
import { getConfig } from "./config.js";
import ConsoleContext from "./logger/ConsoleContext.js";
import { createLogger } from "./logger/logger.js";

const actionRunner = new ActionRunner(
  createLogger(process.env.PERONDA_LOG_LEVEL || "info", new ConsoleContext())
);
actionRunner.run(getConfig("resources", []));
