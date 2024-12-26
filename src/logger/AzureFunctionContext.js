export default class AzureFunctionContext {
  constructor(context) {
    this.context = context;
    this.__name = "AzureFunctionContext";
  }
  log(...msg) {
    this.context.log(msg.join(" "));
  }
  debug(...msg) {
    this.log(...msg);
  }
  error(...msg) {
    this.log(...msg);
  }
}
