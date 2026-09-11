/** 404 for any unmatched route, so clients get JSON rather than Express's HTML page. */
export function notFound(req, res) {
  res.status(404).json({ message: `Not found: ${req.method} ${req.originalUrl}` })
}

/**
 * Final error handler. Maps the failure modes we actually produce onto sensible
 * status codes and — importantly — never leaks a stack trace to the client in
 * production.
 */
// eslint-disable-next-line no-unused-vars -- Express identifies this by arity (4 args).
export function errorHandler(err, req, res, next) {
  const isProd = process.env.NODE_ENV === 'production'

  let status = err.status || err.statusCode || 500
  let message = err.message || 'Internal server error'

  if (err.name === 'ValidationError') {
    status = 400
    message = Object.values(err.errors || {}).map((e) => e.message).join(', ') || 'Validation failed'
  } else if (err.name === 'CastError') {
    status = 400
    message = `Invalid ${err.path}: ${err.value}`
  } else if (err.code === 11000) {
    status = 409
    message = `Duplicate value for ${Object.keys(err.keyValue || {}).join(', ')}`
  } else if (err.message === 'CORS not allowed by security policy') {
    status = 403
  }

  if (status >= 500) {
    console.error(`[${req.method} ${req.originalUrl}]`, err)
    if (isProd) message = 'Internal server error'
  }

  res.status(status).json({ message })
}

export default { notFound, errorHandler }
