import type { RequestFilter } from '../pact-types'

type HttpRequest = {
  headers: Record<string, string | string[] | undefined>
  body?: unknown
}

type NextFunction = () => void | undefined

type RequestFilterOptions = {
  tokenGenerator?: () => string
}

/**
 * Handles environments with and without Express-like `next()` middleware.
 * If `next()` is present, it calls it; otherwise, it returns the modified request.
 */
const handleExpressEnv = (
  req: HttpRequest,
  next: NextFunction
): HttpRequest | undefined => {
  if (next && typeof next === 'function') {
    next()
  } else {
    return req
  }
}

/**
 * Creates a request filter that adds an Authorization header if not present.
 * Designed as a higher-order function to allow customization of token generation
 * and to fulfill Pact's express-like type requirements (req, res, next).
 *
 * Bearer prefix contract: tokenGenerator returns raw value,
 * createRequestFilter adds "Bearer " once.
 */
export const createRequestFilter =
  (options?: RequestFilterOptions): RequestFilter =>
  (req, _, next) => {
    const defaultTokenGenerator = (): string => new Date().toISOString()
    const tokenGenerator = options?.tokenGenerator || defaultTokenGenerator

    const hasAuth = Object.keys(req.headers).some(
      (key) => key.toLowerCase() === 'authorization'
    )
    if (!hasAuth) {
      req.headers['authorization'] = `Bearer ${tokenGenerator()}`
    }

    return handleExpressEnv(req, next)
  }

/**
 * A no-op request filter that passes the request through without modification.
 */
export const noOpRequestFilter: RequestFilter = (req, _, next) =>
  handleExpressEnv(req, next)
