import { ActionRunner } from "../src/action-runner.js";
import { getConfig } from "../src/config.js";
import { createLogger } from "../src/logger/logger.js";
import AzureFunctionContext from "../src/logger/AzureFunctionContext.js";

export default async (context, timer) => {
  const logger = createLogger(
    process.env.PERONDA_LOG_LEVEL || "info",
    new AzureFunctionContext(context)
  );
  const actionRunner = new ActionRunner(logger);
  logger.info(actionRunner.logger.__context.__name);

  logger.info("Trigger timer started");

  if (timer.isPastDue) {
    logger.debug("Node running late");
  }

  const resources = getConfig("resources", []);
  if (!resources.length) {
    logger.info("No resources are provided, skipping");
  }

  logger.info("Begin operations");
  await actionRunner.run(resources);
  logger.info("Done operations");
  return;
};
