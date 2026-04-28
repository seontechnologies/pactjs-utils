import type { AsynchronousMessage } from '@pact-foundation/pact/src/v4/message/types'
import { PactV4, MatchersV3 } from '@pact-foundation/pact'
import path from 'path'
import { zodToPactMatchers } from '../../../src'
import { ConsumerMovieSchema } from '../../http/helpers/consumer-schemas'

// TOGGLE: when switching to hand-written matchers, remove the two imports above
// (zodToPactMatchers, ConsumerMovieSchema) and add to the destructure below:
//   const { like, string, integer, decimal } = MatchersV3
const { string } = MatchersV3

const messagePact = new PactV4({
  dir: path.resolve(process.cwd(), 'pacts'),
  consumer: 'SampleAppConsumer-event-consumer',
  provider: 'SampleMoviesAPI-event-producer',
  logLevel: 'warn'
})

// Consumer-side message pact test.
// Unlike HTTP pact tests (request/response pairs), message pact tests define
// the shape of async messages (Kafka, RabbitMQ, SQS) the consumer expects.
// There is no HTTP request -- just a message payload and metadata.
// The generated pact file is verified by the message provider test,
// which calls the real message producer function and checks the output matches.

describe('Movie Events - Message Consumer', () => {
  // TOGGLE: zodToPactMatchers (active) ↔ hand-written (commented)
  // zodToPactMatchers already wraps each field in the right matcher, so no outer like() needed.
  const movieValue = zodToPactMatchers(ConsumerMovieSchema, {
    id: 1,
    name: 'Inception',
    year: 2010,
    rating: 8.8,
    director: 'Christopher Nolan'
  })
  // const movieValue = {           // TOGGLE: hand-written — swap with the block above
  //   id: integer(1),
  //   name: string('Inception'),
  //   year: integer(2010),
  //   rating: decimal(8.8),
  //   director: string('Christopher Nolan')
  // }

  const actions = ['created', 'updated', 'deleted'] as const

  for (const action of actions) {
    it(`should expect a movie-${action} event`, async () => {
      await messagePact
        .addAsynchronousInteraction()
        .given('An existing movie exists')
        .expectsToReceive(`a movie-${action} event`, (builder) => {
          builder
            .withJSONContent({
              topic: string(`movie-${action}`),
              messages: [
                {
                  key: string('1'),
                  // TOGGLE: zodToPactMatchers (active) ↔ hand-written (commented)
                  // With zodToPactMatchers, each field already carries its own matcher — no outer like() needed.
                  value: movieValue
                  // value: like(movieValue)   // TOGGLE: hand-written version needs like() wrapper
                }
              ]
            })
            .withMetadata({ contentType: 'application/json' })
        })
        .executeTest(async (message: AsynchronousMessage) => {
          const contents = message.contents as unknown as {
            content: {
              topic: string
              messages: Array<{
                key: string
                value: Record<string, unknown>
              }>
            }
          }
          expect(contents.content.topic).toContain('movie-')
          expect(contents.content.messages).toHaveLength(1)
          expect(contents.content.messages[0]!.key).toBeDefined()
          expect(contents.content.messages[0]!.value).toBeDefined()
        })
    })
  }
})
