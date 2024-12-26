export default class NoOpContext {
  constructor() {
    this.__name = "NoOpContext";
  }
  log() {}
  debug() {}
  error() {}
}
