import config from "config";

export function getConfig(key, defaultValue) {
  try {
    const confValue = config.get(key);
    return confValue;
  } catch (err) {
    if (defaultValue) {
      return defaultValue;
    }
    throw err;
  }
}
