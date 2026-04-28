import { PrismaClient } from '@prisma/client'
import type { Movie } from '@prisma/client'
import type { AnyJson } from '../../../src/pact-types'
import { MovieService } from '../../../sample-app/backend/src/movie-service'
import { MovieAdapter } from '../../../sample-app/backend/src/movie-adapter'
import { truncateTables } from '../../../sample-app/backend/scripts/truncate-tables'

// State params arrive as JsonMap from createProviderState/toJsonMap.
// Numbers and strings are preserved as-is; we cast to the expected shape.
type HasMovieWithSpecificIDParams = { id: number }
type ExistingMovieParams = {
  name: string
  year: number
  rating: number
  director: string
  id?: number
}

const prisma = new PrismaClient()
const movieAdapter = new MovieAdapter(prisma)
const movieService = new MovieService(movieAdapter)

export const stateHandlers = {
  'Has a movie with a specific ID': async (parameters?: AnyJson) => {
    const params = (parameters ?? {}) as HasMovieWithSpecificIDParams
    const { id } = params

    const res = await movieService.getMovieById(id!)

    if (res.status !== 200) {
      const movieData: Omit<Movie, 'id'> = {
        name: `Movie Title ${Math.random().toString(36).substring(7)}`,
        year: 2022,
        rating: 7.5,
        director: `Movie Director ${Math.random().toString(36).substring(7)}`
      }
      await movieService.addMovie(movieData, id)
    }

    return { description: `Movie with ID ${id} is set up.` }
  },

  'An existing movie exists': async (parameters?: AnyJson) => {
    const params = (parameters ?? {}) as ExistingMovieParams
    const { name, year, rating, director } = params

    const res = await movieService.getMovieByName(name!)

    if (res.status !== 200) {
      await movieService.addMovie({
        name: name!,
        year: year!,
        rating: rating!,
        director: director!
      })
    }

    return { description: `Movie with name "${name}" is set up.` }
  },

  'No movies exist': async () => {
    await truncateTables()
    return { description: 'State with no movies achieved.' }
  }

  // Setup + teardown form (StateFuncWithSetup):
  // The verifier calls state handlers per interaction, not per test.
  // For an interaction declaring .given('No movies exist'):
  //   1. setup() runs before that interaction replays
  //   2. the interaction replays against the provider
  //   3. teardown() runs after that interaction completes
  //
  // If 9 interactions exist but only 3 declare 'No movies exist',
  // setup/teardown runs 3 times -- only for those 3.
  // Compare: beforeEach/afterEach in verifier options run for all 9.
  //
  // Note: TypeScript support has a known issue (pact-js#1164),
  // may require @ts-expect-error until resolved.
  //
  // 'No movies exist': {
  //   setup: async () => {
  //     await truncateTables()
  //   },
  //   teardown: async () => {
  //     // Restore default data, re-seed fixtures, etc.
  //   }
  // }
}

/*
Jest beforeEach            → once, before the whole verifyProvider() call
  Pact beforeEach          → once per interaction (all it blocks from consumer side)
    state handler setup    → once per interaction that declares that state
      interaction execution
    state handler teardown → once per interaction that declares that state
  Pact afterEach           → once per interaction (all it blocks from consumer side)
Jest afterEach             → once, after the whole verifyProvider() call
*/
