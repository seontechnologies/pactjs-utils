import { providerWithMetadata } from '@pact-foundation/pact'
import { produceMovieEvent } from '../../../sample-app/backend/src/events/movie-events'
import { generateMovieWithId } from '../../../sample-app/shared/test-utils/movie-factories'

const movie = generateMovieWithId()

export const messageProviders = {
  'a movie-created event': providerWithMetadata(
    () => produceMovieEvent(movie, 'created'),
    { contentType: 'application/json' }
  ),
  'a movie-updated event': providerWithMetadata(
    () => produceMovieEvent(movie, 'updated'),
    { contentType: 'application/json' }
  ),
  'a movie-deleted event': providerWithMetadata(
    () => produceMovieEvent(movie, 'deleted'),
    { contentType: 'application/json' }
  )
}
