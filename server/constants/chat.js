/**
 * Bounds on a single chat request.
 *
 * These cap the cost of one call the way the rate limiter caps the number of
 * calls. Both are needed: the limiter alone still allows an enormous single
 * request, and a size cap alone still allows an unlimited number of them.
 */
export const CHAT_LIMITS = {
  /** Longest single message, and the cap applied to each history entry. */
  maxMessageChars: 2000,

  /**
   * Turns of prior conversation forwarded to the model.
   *
   * The client already trims to this, but it is the client — the number that
   * governs spend has to be enforced here.
   */
  maxHistoryTurns: 8,
}

export default CHAT_LIMITS
