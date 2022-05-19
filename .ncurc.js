module.exports = {
  // Add a TODO comment indicating the reason for each rejected dependency upgrade added to this list, and what should be done to resolve it (i.e. handle it through a story, etc).
  reject: [
    // TODO: v6+ (ref: https://github.com/sindresorhus/get-port/releases/tag/v6.0.0) is an ESM library and thus not compatible with CommonJS. Future story needed to resolve.
    "get-port"
  ]
}
