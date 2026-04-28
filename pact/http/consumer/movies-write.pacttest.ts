import type { V3MockServer } from '@pact-foundation/pact'
import { MatchersV3, PactV4 } from '@pact-foundation/pact'
import path from 'path'
import type {
  Movie,
  DeleteMovieResponse,
  MovieNotFoundResponse
} from '@shared/types/movie-types'
import {
  addMovie,
  deleteMovieById,
  updateMovie,
  setApiUrl
} from '../../../sample-app/frontend/src/consumer'
import type { ErrorResponse } from '../../../sample-app/frontend/src/consumer'
import {
  createProviderState,
  setJsonBody,
  setJsonContent
} from '../../../src/consumer-helpers'
import { zodToPactMatchers } from '../../../src'
import { movieExists, hasMovieWithId } from '../helpers/provider-states'
import { ConsumerMovieSchema } from '../helpers/consumer-schemas'

// TOGGLE: when switching to hand-written matchers, remove the two imports above
// (zodToPactMatchers, ConsumerMovieSchema) and add to the destructure below:
//   const { string, integer, decimal } = MatchersV3
const { string } = MatchersV3

const pact = new PactV4({
  dir: path.resolve(process.cwd(), 'pacts'),
  consumer: 'SampleAppConsumer',
  provider: 'SampleMoviesAPI',
  logLevel: 'warn'
})

describe('Movies API - Write Operations', () => {
  // Arbitrary placeholder values. Response matchers check type/shape, not exact values.
  // Provider state handlers receive these via params and create data on the fly.
  const movieWithoutId: Omit<Movie, 'id'> = {
    name: 'New movie',
    year: 1999,
    rating: 8.5,
    director: 'John Doe'
  }

  // TOGGLE: hand-written matcher helper — uncomment to revert to manual approach
  // const propMatcherNoId = (movie: Omit<Movie, 'id'>) => ({
  //   name: string(movie.name),
  //   year: integer(movie.year),
  //   rating: decimal(movie.rating),
  //   director: string(movie.director)
  // })

  describe('POST /movies', () => {
    it('should add a new movie', async () => {
      await pact
        .addInteraction()
        .given('No movies exist')
        .uponReceiving('a request to add a new movie')
        .withRequest(
          'POST',
          '/movies',
          setJsonContent({ body: movieWithoutId })
        )
        .willRespondWith(
          200,
          setJsonContent({
            body: {
              status: 200,
              // TOGGLE: zodToPactMatchers (active) ↔ hand-written (commented)
              data: zodToPactMatchers(ConsumerMovieSchema, {
                id: 1,
                ...movieWithoutId
              })
              // data: { id: integer(), ...propMatcherNoId(movieWithoutId) }
            }
          })
        )
        .executeTest(async (mockServer: V3MockServer) => {
          setApiUrl(mockServer.url)
          const res = await addMovie(movieWithoutId)
          expect(res).toEqual({
            status: 200,
            data: {
              id: expect.any(Number),
              name: movieWithoutId.name,
              year: movieWithoutId.year,
              rating: movieWithoutId.rating,
              director: movieWithoutId.director
            }
          })
        })
    })

    it('should not add a movie that already exists', async () => {
      const errorRes: ErrorResponse = {
        error: `Movie ${movieWithoutId.name} already exists`
      }

      const [stateName, stateParams] = createProviderState(
        movieExists(movieWithoutId)
      )

      await pact
        .addInteraction()
        .given(stateName, stateParams)
        .uponReceiving('a request to add an existing movie')
        .withRequest(
          'POST',
          '/movies',
          setJsonContent({ body: { ...movieWithoutId } })
        )
        .willRespondWith(409, setJsonBody({ error: string(errorRes.error) }))
        .executeTest(async (mockServer: V3MockServer) => {
          setApiUrl(mockServer.url)
          const res = await addMovie(movieWithoutId)
          expect(res).toEqual({ ...errorRes, status: 409 })
        })
    })
  })

  describe('PUT /movies/:id', () => {
    it('should update an existing movie', async () => {
      const testId = 99
      const updatedMovieData = {
        name: 'Updated movie',
        year: 2000,
        rating: 8.5,
        director: 'Steven Spielberg'
      }

      const [stateName, stateParams] = createProviderState(
        hasMovieWithId(testId)
      )

      await pact
        .addInteraction()
        .given(stateName, stateParams)
        .uponReceiving('a request to update a specific movie')
        .withRequest(
          'PUT',
          `/movies/${testId}`,
          setJsonContent({ body: updatedMovieData })
        )
        .willRespondWith(
          200,
          setJsonContent({
            body: {
              status: 200,
              // TOGGLE: zodToPactMatchers (active) ↔ hand-written (commented)
              data: zodToPactMatchers(ConsumerMovieSchema, {
                id: testId,
                ...updatedMovieData
              })
              // data: { id: integer(testId), ...propMatcherNoId(updatedMovieData) }
            }
          })
        )
        .executeTest(async (mockServer: V3MockServer) => {
          setApiUrl(mockServer.url)
          const res = await updateMovie(testId, updatedMovieData)
          expect(res).toEqual({
            status: 200,
            data: {
              id: testId,
              name: updatedMovieData.name,
              year: updatedMovieData.year,
              rating: updatedMovieData.rating,
              director: updatedMovieData.director
            }
          })
        })
    })
  })

  describe('DELETE /movies/:id', () => {
    it('should delete an existing movie', async () => {
      const testId = 200
      const message = `Movie ${testId} has been deleted`

      const state = createProviderState(hasMovieWithId(testId))

      await pact
        .addInteraction()
        .given(...state)
        .uponReceiving('a request to delete a movie that exists')
        .withRequest('DELETE', `/movies/${testId}`)
        .willRespondWith(
          200,
          setJsonBody({ status: 200, message: string(message) })
        )
        .executeTest(async (mockServer: V3MockServer) => {
          setApiUrl(mockServer.url)
          const res = (await deleteMovieById(testId)) as DeleteMovieResponse
          expect(res.message).toEqual(message)
        })
    })

    it('should return 404 for non-existing movie', async () => {
      const testId = 123456789
      const error = `Movie with ID ${testId} not found`

      await pact
        .addInteraction()
        .given('No movies exist')
        .uponReceiving('a request to delete a non-existing movie')
        .withRequest('DELETE', `/movies/${testId}`)
        .willRespondWith(
          404,
          setJsonBody({ error: string(error), status: 404 })
        )
        .executeTest(async (mockServer: V3MockServer) => {
          setApiUrl(mockServer.url)
          const res = (await deleteMovieById(testId)) as MovieNotFoundResponse
          expect(res.error).toEqual(error)
        })
    })
  })
})
