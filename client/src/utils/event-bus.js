class EventBus {
  constructor() {
    this.handlers = {};
  }

  on(event, fn) {
    if (!this.handlers[event]) {
      this.handlers[event] = new Set();
    }
    this.handlers[event].add(fn);
  }

  off(event, fn) {
    if (this.handlers[event]) {
      this.handlers[event].delete(fn);
    }
  }

  emit(event, ...args) {
    if (this.handlers[event]) {
      this.handlers[event].forEach((fn) => fn(...args));
    }
  }
}

export default new EventBus();
