import { Verifier } from '@pact-foundation/pact'
import type { VerifierOptions } from '@pact-foundation/pact'
import path from 'path'
import { stateHandlers } from '../helpers/state-handlers'
import { generateAuthToken, pactAdminIdentity } from '../helpers/pact-helpers'
import { createRequestFilter } from '../../../src/request-filter'
import { buildVerifierOptions } from '../../../src/provider-verifier'
import { truncateTables } from '../../../sample-app/backend/scripts/truncate-tables'

// The server is started externally via start-server-and-test (see package.json).
// This keeps provider tests portable: every repo starts its server differently,
// so the test should not import or manage the server lifecycle.

const pactFile = path.resolve(
  process.cwd(),
  'pacts/SampleAppConsumer-SampleMoviesAPI.json'
)

const port = process.env.PORT || '3001'
const PACT_BROKER_BASE_URL = process.env.PACT_BROKER_BASE_URL
const PACT_BREAKING_CHANGE = process.env.PACT_BREAKING_CHANGE || 'false'
const PACT_ENABLE_PENDING = process.env.PACT_ENABLE_PENDING || 'false'
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'local'

describe('Provider contract verification', () => {
  it('should validate the expectations of SampleAppConsumer', async () => {
    // Auth tokens are dynamic and must never appear in the contract JSON.
    // createRequestFilter injects the Authorization header at verification time.
    const tokenGenerator = () => generateAuthToken(pactAdminIdentity)
    const requestFilter = createRequestFilter({ tokenGenerator })

    // The verifier replays every interaction from the consumer's contract
    // against this running provider. For each interaction:
    //   1. The state handler matching .given() runs (creates data in local DB)
    //   2. The request from the contract is sent to the provider
    //   3. The real response is compared against the contract's matchers
    //   4. beforeEach/truncateTables ensures clean state between interactions
    const options: VerifierOptions = PACT_BROKER_BASE_URL
      ? buildVerifierOptions({
          provider: 'SampleMoviesAPI',
          consumer: 'SampleAppConsumer',
          port,
          // stateHandlers: map consumer .given() names to provider-side data setup.
          // E.g. 'An existing movie exists' -> insert movie into local DB.
          stateHandlers,
          requestFilter,
          // beforeEach runs before *every* interaction (all of them).
          // Compare: state handler setup/teardown runs only for matching interactions.
          beforeEach: async () => {
            await truncateTables()
          },
          includeMainAndDeployed: PACT_BREAKING_CHANGE !== 'true',
          enablePending: PACT_ENABLE_PENDING === 'true'
        })
      : buildVerifierOptions({
          provider: 'SampleMoviesAPI',
          port,
          stateHandlers,
          requestFilter,
          beforeEach: async () => {
            await truncateTables()
          },
          pactUrls: [pactFile],
          includeMainAndDeployed: true,
          publishVerificationResult: false
        })

    const verifier = new Verifier(options)

    try {
      const output = await verifier.verifyProvider()
      console.log('Pact Verification Complete!', output)
    } catch (error) {
      console.error('Pact Verification Failed:', error)

      if (PACT_BREAKING_CHANGE === 'true' && GITHUB_BRANCH === 'main') {
        console.log(
          'Ignoring verification failures due to breaking change on main branch.'
        )
      } else {
        throw error
      }
    }
  })
})
