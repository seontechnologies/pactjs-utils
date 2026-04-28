import { z } from 'zod'

// Consumer-curated schemas: only the fields this consumer actually reads.
// Keeping these separate from the shared full-response schemas prevents
// turning contract tests into schema tests — see zodToPactMatchers docs.

export const ConsumerMovieWithoutIdSchema = z.object({
  name: z.string(),
  year: z.number().int(),
  rating: z.number(),
  director: z.string()
})

export const ConsumerMovieSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  year: z.number().int(),
  rating: z.number(),
  director: z.string()
})
