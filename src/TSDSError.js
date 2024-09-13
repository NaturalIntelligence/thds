class TSDSError extends Error{
  constructor(message = "", ...args) {
    super(message, ...args);
    // this.message = message;
  }
}

module.exports = TSDSError;