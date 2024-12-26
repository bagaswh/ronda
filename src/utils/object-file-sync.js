import { writeFileSync } from "fs";

/**
 * @param {object} obj
 * @param {string} filePath
 * @returns {any}
 */
export function createObjectFileSyncProxy(obj, filePath) {
  return new Proxy(obj, {
    set(target, p, newValue) {
      target[p] = newValue;
      writeFileSync(filePath, JSON.stringify(target), "utf-8");
      return true;
    },
  });
}
