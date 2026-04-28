import type { V3MockServer } from '@pact-foundation/pact'
import { MatchersV3, PactV4 } from '@pact-foundation/pact'
import path from 'path'
import type { Movie, GetMovieResponse } from '@shared/types/movie-types'
import {
  getMovies,
  getMovieById,
  getMovieByName,
  setApiUrl
} from '../../../sample-app/frontend/src/consumer'
import {
  createProviderState,
  setJsonContent
} from '../../../src/consumer-helpers'
import { zodToPactMatchers } from '../../../src'
import { movieExists, hasMovieWithId } from '../helpers/provider-states'
import { ConsumerMovieSchema } from '../helpers/consumer-schemas'

// TOGGLE: when switching to hand-written matchers, remove the two imports above
// (zodToPactMatchers, ConsumerMovieSchema) and add to the destructure below:
//   const { like, eachLike, integer, decimal, string } = MatchersV3
const { like, eachLike } = MatchersV3

const pact = new PactV4({
  dir: path.resolve(process.cwd(), 'pacts'),
  consumer: 'SampleAppConsumer',
  provider: 'SampleMoviesAPI',
  logLevel: 'warn'
})

describe('Movies API - Read Operations', () => {
  // These are arbitrary placeholder values, not real provider data.
  // Response matchers check type/shape, not exact values.
  // During provider verification, these flow to state handlers via provider state params.
  const movieWithId: Movie = {
    id: 1,
    name: 'My movie',
    year: 1999,
    rating: 8.5,
    director: 'John Doe'
  }

  const testId = 100
  const movieWithTestId: Movie = {
    id: testId,
    name: 'My movie',
    year: 1999,
    rating: 8.5,
    director: 'John Doe'
  }

  // TOGGLE: hand-written matcher helper — uncomment to revert to manual approach
  // const propMatcherNoId = (movie: Movie | Omit<Movie, 'id'>) => ({
  //   name: string(movie.name),
  //   year: integer(movie.year),
  //   rating: decimal(movie.rating),
  //   director: string(movie.director)
  // })

  describe('GET /movies', () => {
    it('should return all movies', async () => {
      const [stateName, stateParams] = createProviderState(
        movieExists(movieWithId)
      )

      await pact
        .addInteraction()
        .given(stateName, stateParams)
        .uponReceiving('a request to get all movies')
        .withRequest('GET', '/movies')
        .willRespondWith(
          200,
          setJsonContent({
            body: {
              status: 200,
              // TOGGLE: zodToPactMatchers (active) ↔ hand-written (commented)
              data: eachLike(
                zodToPactMatchers(
                  ConsumerMovieSchema,
                  movieWithId
                ) as Parameters<typeof eachLike>[0]
              )
              // data: eachLike(movieWithId)
            }
          })
        )
        .executeTest(async (mockServer: V3MockServer) => {
          setApiUrl(mockServer.url)
          const res = (await getMovies()) as GetMovieResponse
          expect(res.data).toEqual([movieWithId])
        })
    })

    it('should return empty when no movies exist', async () => {
      const noMovies: Movie[] = []

      await pact
        .addInteraction()
        .given('No movies exist')
        .uponReceiving('a request to get all movies when none exist')
        .withRequest('GET', '/movies')
        .willRespondWith(
          200,
          setJsonContent({ body: { status: 200, data: like(noMovies) } })
        )
        .executeTest(async (mockServer: V3MockServer) => {
          setApiUrl(mockServer.url)
          const res = (await getMovies()) as GetMovieResponse
          expect(res.data).toEqual(noMovies)
        })
    })

    it('should return a movie by name', async () => {
      const [stateName, stateParams] = createProviderState(
        movieExists(movieWithId)
      )

      await pact
        .addInteraction()
        .given(stateName, stateParams)
        .uponReceiving('a request to get a movie by name')
        .withRequest(
          'GET',
          '/movies',
          setJsonContent({
            query: { name: movieWithId.name }
          })
        )
        .willRespondWith(
          200,
          setJsonContent({
            body: {
              status: 200,
              // TOGGLE: zodToPactMatchers (active) ↔ hand-written (commented)
              data: zodToPactMatchers(ConsumerMovieSchema, movieWithId)
              // data: { id: integer(movieWithId.id), ...propMatcherNoId(movieWithId) }
            }
          })
        )
        .executeTest(async (mockServer: V3MockServer) => {
          setApiUrl(mockServer.url)
          const res = (await getMovieByName(
            movieWithId.name
          )) as GetMovieResponse
          expect(res.data).toEqual(movieWithId)
        })
    })
  })

  describe('GET /movies/:id', () => {
    it('should return a specific movie', async () => {
      const [stateName, stateParams] = createProviderState(
        hasMovieWithId(testId)
      )

      await pact
        .addInteraction()
        .given(stateName, stateParams)
        .uponReceiving('a request to a specific movie')
        .withRequest('GET', `/movies/${testId}`)
        .willRespondWith(
          200,
          setJsonContent({
            body: {
              status: 200,
              // TOGGLE: zodToPactMatchers (active) ↔ hand-written (commented)
              data: zodToPactMatchers(ConsumerMovieSchema, movieWithTestId)
              // data: { id: integer(testId), ...propMatcherNoId(movieWithTestId) }
            }
          })
        )
        .executeTest(async (mockServer: V3MockServer) => {
          setApiUrl(mockServer.url)
          const res = (await getMovieById(testId)) as GetMovieResponse
          expect(res.data).toEqual(movieWithTestId)
        })
    })
  })
})
