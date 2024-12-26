import { getSelfRoleAssignments, parseResourceId } from "../src/azure.js";
import { getConfig } from "../src/config.js";
import dotenv from "dotenv";
import { log } from "../src/logger.js";

dotenv.config();

const resources = getConfig("resources", []);

async function main() {
  for (const { resourceId } of resources) {
    const parsedResourceId = parseResourceId(resourceId);
    const roleAssignments = await getSelfRoleAssignments(resourceId);
    log(`Permission list for resource`, parsedResourceId, `:`, roleAssignments);
    log();
  }
}

main();
