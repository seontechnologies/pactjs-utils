import { MessageProviderPact } from '@pact-foundation/pact'
import type { PactMessageProviderOptions } from '@pact-foundation/pact'
import path from 'path'
import { vi, describe, it, beforeAll, afterAll } from 'vitest'
import { messageProviders } from '../helpers/message-providers'
import { stateHandlers } from '../helpers/state-handlers'
import { buildMessageVerifierOptions } from '../../../src/provider-verifier'

// Message provider verification validates that the provider can produce
// messages matching the consumer's expectations.
//
// Without PACT_BROKER_BASE_URL: verifies against local pact files in pacts/.
// With PACT_BROKER_BASE_URL and PACT_BROKER_TOKEN: verifies against the broker.
// Both modes work from anywhere (laptop, CI, etc.).

const pactFile = path.resolve(
  process.cwd(),
  'pacts/SampleAppConsumer-event-consumer-SampleMoviesAPI-event-producer.json'
)

const PACT_BROKER_BASE_URL = process.env.PACT_BROKER_BASE_URL
const PACT_BREAKING_CHANGE = process.env.PACT_BREAKING_CHANGE || 'false'
const PACT_ENABLE_PENDING = process.env.PACT_ENABLE_PENDING || 'false'
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'local'

describe('Pact Verification for Message queue', () => {
  beforeAll(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterAll(() => {
    vi.restoreAllMocks()
  })

  it('should validate the expectations of SampleAppConsumer-event-consumer', async () => {
    const options: PactMessageProviderOptions = PACT_BROKER_BASE_URL
      ? buildMessageVerifierOptions({
          provider: 'SampleMoviesAPI-event-producer',
          consumer: 'SampleAppConsumer-event-consumer',
          messageProviders,
          stateHandlers,
          includeMainAndDeployed: PACT_BREAKING_CHANGE !== 'true',
          enablePending: PACT_ENABLE_PENDING === 'true'
        })
      : buildMessageVerifierOptions({
          provider: 'SampleMoviesAPI-event-producer',
          consumer: 'SampleAppConsumer-event-consumer',
          messageProviders,
          stateHandlers,
          pactUrls: [pactFile],
          includeMainAndDeployed: true,
          publishVerificationResult: false
        })

    const verifier = new MessageProviderPact(options)

    try {
      const output = await verifier.verify()
      console.log('Pact Message Verification Complete!')
      console.log('Result:', output)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const lowerMessage = message.toLowerCase()

      if (
        lowerMessage.includes('no pacts found') ||
        lowerMessage.includes('no pacts were found')
      ) {
        console.log(
          'No message pacts found in broker — skipping. Publish a message consumer pact to enable this test.'
        )
        return
      }

      console.error('Pact Message Verification Failed:', error)

      if (PACT_BREAKING_CHANGE === 'true' && GITHUB_BRANCH === 'main') {
        console.log(
          'Ignoring Pact Message verification failures due to breaking change on main branch.'
        )
      } else {
        throw error
      }
    }
  })
})
