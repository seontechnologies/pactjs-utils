import type { Request, Response, NextFunction } from 'express'

/** middleware for validating movie id in the request url */
export function validateId(req: Request, res: Response, next: NextFunction) {
  // Express 5 types params as string | string[]; reject repeated params
  const rawId = req.params.id
  const movieId = typeof rawId === 'string' ? parseInt(rawId) : NaN

  if (isNaN(movieId))
    return res.status(400).json({ error: 'Invalid movie ID provided' })

  req.params.id = movieId.toString() // pass validated MovieId forward

  next() // pass to the next middleware or route handler
}
