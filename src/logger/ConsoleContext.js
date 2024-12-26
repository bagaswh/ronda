export default class ConsoleContext {
  constructor() {
    this.__name = "ConsoleContext";
  }
  log(...msg) {
    if (!msg.length) {
      return;
    }
    console.log(...msg);
  }
  debug(...msg) {
    if (!msg.length) {
      return;
    }
    console.log(...msg);
  }
  error(...msg) {
    if (!msg.length) {
      return;
    }
    console.error(...msg);
  }
}
