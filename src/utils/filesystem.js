import { mkdirSync, statSync } from "fs";

export function mkdirIfNotExists(dirPath) {
  let create = false;
  try {
    const stat = statSync(dirPath);
    if (!stat.isDirectory()) {
      throw new Error(`Cannot create directory ${dirPath} since it's a file`);
    }
  } catch (err) {
    create = true;
  }
  if (create) {
    mkdirSync(dirPath, { recursive: true });
  }
}
