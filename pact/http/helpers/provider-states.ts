import type { Movie } from '@shared/types/movie-types'
import type { ProviderStateInput } from '../../../src/consumer-helpers'

export const movieExists = (
  movie: Movie | Omit<Movie, 'id'>
): ProviderStateInput => ({
  name: 'An existing movie exists',
  params: movie
})

export const hasMovieWithId = (id: number): ProviderStateInput => ({
  name: 'Has a movie with a specific ID',
  params: { id }
})
