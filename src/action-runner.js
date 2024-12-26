import { getConfig } from "./config.js";
import { compile } from "expression-eval";
import { isDateHoliday } from "./utils/date.js";
import {
  deallocateVm,
  getVmssAutoscaleConfig,
  humanReadableResourceId,
  parseResourceId,
  resizeVm,
  setVmssAutoscaleConfig,
  startMysqlFlexibleServer,
  startVm,
  stopMysqlFlexibleServer,
} from "./azure.js";
import { readFileSync } from "fs";
import path from "path";
import chalk from "chalk";

import dotenv from "dotenv";
import { createObjectFileSyncProxy } from "./utils/object-file-sync.js";
import { mkdirIfNotExists } from "./utils/filesystem.js";
import crypto from "crypto";

dotenv.config();

export class ConfigValidationError extends Error {}

export class ActionRunner {
  constructor(logger) {
    this.logger = logger;
    this.resources = [];

    // for testing purpose
    this.__testActionCalled__ = 0;

    this.validateConfig();
    this.loadAutoscaleOriginalSettings();
    this.loadActionHistory();
  }

  parseTimeStr(str) {
    const split = str.split(":").map(Number);
    return split;
  }

  evaluateConditions(conditions, conditionCompileContext) {
    for (const cond of conditions) {
      if (
        cond.customExpr &&
        !compile(cond.customExpr)(conditionCompileContext)
      ) {
        this.logger.debug(`Condition ${cond.customExpr} is not true`);
        return false;
      }
    }
    return true;
  }

  sortActionsByTimestamp(actions, date, resourceId) {
    return actions
      .map((item) => {
        const parsedTime = this.parseTimeStr(item.time);
        if (parsedTime.length !== 2) {
          throw new Error(
            `Invalid time value ${item.time} in resource ${chalk.green(
              humanReadableResourceId(resourceId)
            )}`
          );
        }
        return {
          ...item,
          time: new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate(),
            parsedTime[0],
            parsedTime[1]
          ).getTime(),
        };
      })
      .sort((a, b) => {
        return b.time - a.time;
      });
  }

  validateConfig() {
    const loopInterval = getConfig("loopInterval", 1800000);
    if (loopInterval < 1800000) {
      throw new ConfigValidationError(
        "`loopInterval` cannot be less than 30 minutes"
      );
    }
  }

  loadAutoscaleOriginalSettings() {
    const originalAutoscaleSettingsFilePath = path.join(
      process.env.VAR_DIR,
      "/autoscale_settings/original_autoscaling_config.json"
    );
    mkdirIfNotExists(path.dirname(originalAutoscaleSettingsFilePath));
    let obj = {};
    try {
      obj = JSON.parse(readFileSync(originalAutoscaleSettingsFilePath));
      // eslint-disable-next-line no-empty
    } catch (err) {}
    this.originalAutoscaleSettings = createObjectFileSyncProxy(
      obj,
      originalAutoscaleSettingsFilePath
    );
  }

  loadActionHistory() {
    const actionHistoryFilePath = path.join(
      process.env.VAR_DIR,
      "/action_history.json"
    );
    mkdirIfNotExists(path.dirname(actionHistoryFilePath));
    let obj = {};
    try {
      obj = JSON.parse(readFileSync(actionHistoryFilePath));
      // eslint-disable-next-line no-empty
    } catch (err) {}
    this.actionHistory = createObjectFileSyncProxy(obj, actionHistoryFilePath);
  }

  createActionHash(resourceId, action) {
    return crypto
      .createHash("sha1")
      .update(
        JSON.stringify({
          type: action.type,
          actionParams: action.actionParams,
        }) + resourceId
      )
      .digest("hex");
  }

  updateActionLastCompletedAt(resourceId, action, date) {
    const hash = this.createActionHash(resourceId, action);
    if (!this.actionHistory[hash]) {
      this.actionHistory[hash] = {};
    }
    this.actionHistory[hash] = {
      lastCompletedAt: date.getTime(),
      action: {
        type: action.type,
        time: action.time,
      },
      resourceId,
    };
  }

  hasActionBeenDone(resourceId, action) {
    const hash = this.createActionHash(resourceId, action);
    const actionLastCompletedAt = this.actionHistory[hash]?.lastCompletedAt;
    return actionLastCompletedAt && actionLastCompletedAt >= action.time;
  }

  setLogger(logger) {
    this.logger = logger;
  }

  // --- BEGIN action handlers
  async doVmResize(action, parsedResourceId) {
    const sizeTarget = action.actionParams?.sizeTarget;
    this.logger.info(
      `Resizing vm`,
      chalk.green(humanReadableResourceId(parsedResourceId.resourceId)),
      `to size ${chalk.yellow(sizeTarget)}`
    );
    await resizeVm(parsedResourceId.resourceId, sizeTarget);
    this.logger.info(`Resized`);
  }

  async doAutoscaleSettingSetZero(action, parsedResourceId) {
    const autoscaleSettingSubscriptionId =
      action.actionParams?.autoscaleSettingSubscriptionId;
    const autoscaleSettingName = action.actionParams?.autoscaleSettingName;
    const autoscaleSettingResourceGroup =
      action.actionParams?.autoscaleSettingResourceGroup;

    const vmssAutoscalingConfig = await getVmssAutoscaleConfig(
      autoscaleSettingSubscriptionId,
      autoscaleSettingResourceGroup,
      autoscaleSettingName
    );
    if (vmssAutoscalingConfig) {
      if (!this.originalAutoscaleSettings[parsedResourceId.resourceId]) {
        this.originalAutoscaleSettings[parsedResourceId.resourceId] = {
          min: vmssAutoscalingConfig.min,
          max: vmssAutoscalingConfig.max,
          default: vmssAutoscalingConfig.default,
        };
      }
    } else {
      this.info(
        `Autoscale setting of resource`,
        chalk.green(humanReadableResourceId(parsedResourceId.resourceId)),
        `is not available, skipping`
      );
    }

    return setVmssAutoscaleConfig(
      autoscaleSettingSubscriptionId,
      autoscaleSettingResourceGroup,
      autoscaleSettingName,
      {
        min: 0,
        max: 0,
        default: 0,
      }
    );
  }

  async doAutoscaleSettingRestore(action, parsedResourceId) {
    const originalAutoscalingConfig =
      this.originalAutoscaleSettings[parsedResourceId.resourceId];
    const autoscaleSettingSubscriptionId =
      action.actionParams?.autoscaleSettingSubscriptionId;
    const autoscaleSettingName = action.actionParams?.autoscaleSettingName;
    const autoscaleSettingResourceGroup =
      action.actionParams?.autoscaleSettingResourceGroup;
    if (originalAutoscalingConfig) {
      await setVmssAutoscaleConfig(
        autoscaleSettingSubscriptionId,
        autoscaleSettingResourceGroup,
        autoscaleSettingName,
        {
          min: originalAutoscalingConfig.min,
          max: originalAutoscalingConfig.max,
          default: originalAutoscalingConfig.default,
        }
      );
    } else {
      this.logger.info(
        `No original autoscaling config found for resource`,
        chalk.green(humanReadableResourceId(parsedResourceId.resourceId)),
        `, skipping`
      );
    }
  }

  // purpose of this function is to test the runner, not the action performed itself
  async __testAction__() {
    this.__testActionCalled__++;
  }
  // --- END action handlers

  async run(resources) {
    const _currDate = new Date();
    const date = new Date(
      _currDate.getFullYear(),
      _currDate.getMonth(),
      _currDate.getDate(),
      _currDate.getHours(),
      _currDate.getMinutes(),
      _currDate.getSeconds()
    );
    const isHolidayToday = isDateHoliday(date);

    for (const resource of resources) {
      this.runIterateResource(resource, date, isHolidayToday);
    }
  }

  async runIterateResource(resource, date, isHolidayToday) {
    const { resourceId, actions, actionGroups } = resource;
    const parsedResourceId = parseResourceId(resourceId);

    let generatedActionGroups = [];
    if (Array.isArray(actions[0])) {
      generatedActionGroups = actions;
    } else if (!actionGroups) {
      generatedActionGroups = [actions];
    } else {
      generatedActionGroups = actionGroups;
    }

    for (const actionsOfGroup of generatedActionGroups) {
      this.runIterateActionsOfGroup(
        actionsOfGroup,
        date,
        resourceId,
        parsedResourceId,
        isHolidayToday
      );
    }
  }

  async runIterateActionsOfGroup(
    actionsOfGroup,
    date,
    resourceId,
    parsedResourceId,
    isHolidayToday
  ) {
    const actionsTimestampsSorted = this.sortActionsByTimestamp(
      actionsOfGroup,
      date,
      resourceId
    );
    for (const action of actionsTimestampsSorted) {
      let preventNext = action.preventNext || true;

      const runActionOnlyOncePerSchedule = action.runActionOnlyOnce || true;

      if (!(date.getTime() >= action.time)) {
        this.logger.debug(
          `Time does not match action ${chalk.yellow(action.type)} of resource`,
          chalk.green(humanReadableResourceId(parsedResourceId.resourceId)),
          `time=${date.toISOString()} action_time=${new Date(
            action.time
          ).toISOString()}`
        );
        continue;
      }

      if (
        this.hasActionBeenDone(resourceId, action, date) &&
        runActionOnlyOncePerSchedule
      ) {
        this.logger.info(
          `The action ${chalk.yellow(action.type)} on resource ID ${chalk.green(
            humanReadableResourceId(resourceId)
          )} has been done, skipping`
        );
        if (preventNext) {
          return;
        }
        continue;
      }

      this.logger.debug(
        `Matching time for action ${chalk.yellow(action.type)} of resource`,
        chalk.green(humanReadableResourceId(parsedResourceId.resourceId))
      );
      if (action.conditions) {
        let proceed = this.evaluateConditions(action.conditions, {
          $isHoliday: isHolidayToday.holiday,
        });
        if (!proceed) {
          continue;
        }
      }

      try {
        switch (action.type) {
          case "__test_action__":
            await this.__testAction__();
            break;

          case "vm_resize":
            await this.doVmResize(action, parsedResourceId);
            break;

          case "vm_start":
            this.logger.info(
              `Starting virtual machine ${chalk.green(
                humanReadableResourceId(resourceId)
              )}`
            );
            await startVm(resourceId);
            this.logger.info("Started");
            break;

          case "vm_deallocate":
            this.logger.info(
              `Deallocating virtual machine ${chalk.green(
                humanReadableResourceId(resourceId)
              )}`
            );
            await deallocateVm(resourceId);
            this.logger.info("Deallocated");
            break;

          case "autoscaling_setting_set_zero":
            this.logger.info(
              `Set instances to 0 to VMSS ${chalk.green(
                humanReadableResourceId(parsedResourceId.resourceId)
              )}`
            );
            await this.doAutoscaleSettingSetZero(action, parsedResourceId);
            this.logger.info(`Instances set to 0`);
            break;

          case "autoscaling_setting_restore":
            this.logger.info(
              `Restore instances count to VMSS ${chalk.green(
                humanReadableResourceId(parsedResourceId.resourceId)
              )}`
            );
            await this.doAutoscaleSettingRestore(action, parsedResourceId);
            this.logger.info("Instances count restored");
            break;

          case "mysql_flexible_start":
            this.logger.info(
              `Starting MySQL server ${chalk.green(
                humanReadableResourceId(resourceId)
              )}`
            );
            await startMysqlFlexibleServer(resourceId);
            this.logger.info("Started");
            break;

          case "mysql_flexible_stop":
            this.logger.info(
              `Stopping MySQL server ${chalk.green(
                humanReadableResourceId(resourceId)
              )}`
            );
            await stopMysqlFlexibleServer(resourceId);
            this.logger.info("Stopped");
            break;
        }

        this.logger.info("Updating action last completed time");
        this.updateActionLastCompletedAt(resourceId, action, date);
      } catch (err) {
        this.logger.error(
          `Failed performing action ${chalk.yellow(action.type)} on resource`,
          chalk.green(humanReadableResourceId(parsedResourceId.resourceId)),
          `due to ${chalk.bold.redBright(err.message)}`
        );
      }

      if (preventNext) {
        return;
      }
    }
  }
}
