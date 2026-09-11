/**
 * Wraps an async route handler so a rejected promise reaches Express's error
 * middleware instead of hanging the request. Lets handlers drop their
 * boilerplate try/catch and just throw.
 */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next)

export default asyncHandler
