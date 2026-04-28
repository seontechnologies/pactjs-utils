import type {
  MessageProviders,
  MessageStateHandlers,
  PactMessageProviderOptions,
  VerifierOptions
} from '@pact-foundation/pact'
import type { StateHandlers, RequestFilter } from '../pact-types'
import {
  handlePactBrokerUrlAndSelectors,
  getProviderVersionTags
} from './handle-url-and-selectors'
import { noOpRequestFilter } from '../request-filter'

/**
 * Builds a `VerifierOptions` object for Pact HTTP provider verification.
 * Encapsulates common provider test setup including state handlers,
 * consumer version selectors, and pact broker options.
 */
export function buildVerifierOptions({
  provider,
  port,
  logLevel = 'info',
  stateHandlers,
  beforeEach,
  afterEach,
  includeMainAndDeployed,
  consumer,
  enablePending = false,
  requestFilter = noOpRequestFilter,
  publishVerificationResult = true,
  pactBrokerToken = process.env.PACT_BROKER_TOKEN,
  providerVersion = process.env.GITHUB_SHA || 'unknown',
  providerVersionBranch = process.env.GITHUB_BRANCH || 'main',
  providerVersionTags = getProviderVersionTags(),
  pactUrls,
  pactBrokerUrl = process.env.PACT_BROKER_BASE_URL,
  pactPayloadUrl = process.env.PACT_PAYLOAD_URL
}: {
  provider: string
  port: string
  logLevel?: 'trace' | 'debug' | 'info' | 'warn' | 'error'
  stateHandlers?: StateHandlers & MessageStateHandlers
  beforeEach?: () => Promise<unknown>
  afterEach?: () => Promise<unknown>
  includeMainAndDeployed: boolean
  consumer?: string
  enablePending?: boolean
  requestFilter?: RequestFilter
  publishVerificationResult?: boolean
  pactBrokerToken?: string
  providerVersion?: string
  providerVersionBranch?: string
  providerVersionTags?: string[]
  pactUrls?: string[]
  pactBrokerUrl?: string
  pactPayloadUrl?: string
}): VerifierOptions {
  console.table({
    Provider: provider,
    Port: port,
    'Log Level': logLevel,
    'State Handlers': stateHandlers ? 'Provided' : 'Not Provided',
    'Include Main and Deployed': includeMainAndDeployed,
    Consumer: consumer || 'All Consumers',
    PACT_BREAKING_CHANGE: process.env.PACT_BREAKING_CHANGE,
    PACT_BROKER_TOKEN: pactBrokerToken ? 'Provided' : 'Not Provided',
    'Provider Version': providerVersion,
    'Provider Version Branch': providerVersionBranch,
    'Provider Version Tags': providerVersionTags.join(', ') || 'None',
    'Pact URLs': pactUrls ? pactUrls.join(', ') : 'Not Provided',
    'Pact Broker URL': pactBrokerUrl,
    'Pact Payload URL': pactPayloadUrl || 'Not Provided',
    'Enable Pending': enablePending,
    'Request Filter':
      requestFilter === noOpRequestFilter
        ? 'Default (No-Op)'
        : 'Custom Provided'
  })

  const options: VerifierOptions = {
    provider,
    logLevel,
    stateHandlers,
    beforeEach,
    afterEach,
    requestFilter,
    providerBaseUrl: `http://localhost:${port}`,
    publishVerificationResult,
    providerVersion,
    providerVersionBranch,
    providerVersionTags,
    enablePending
  }

  if (pactBrokerToken) {
    options.pactBrokerToken = pactBrokerToken
  }

  // Local mode: verify directly against explicit pact files and skip broker selection.
  if (pactUrls && pactUrls.length > 0) {
    options.pactUrls = pactUrls
    return options
  }

  handlePactBrokerUrlAndSelectors({
    pactPayloadUrl,
    pactBrokerUrl,
    consumer,
    includeMainAndDeployed,
    options
  })

  return options
}

/**
 * Builds a `PactMessageProviderOptions` object for message-based Pact verification.
 * Encapsulates common provider test setup for message handlers and Pact Broker options.
 */
export function buildMessageVerifierOptions({
  provider,
  messageProviders,
  includeMainAndDeployed,
  stateHandlers,
  consumer,
  enablePending = false,
  logLevel = 'info',
  publishVerificationResult = true,
  pactBrokerToken = process.env.PACT_BROKER_TOKEN,
  providerVersion = process.env.GITHUB_SHA || 'unknown',
  providerVersionBranch = process.env.GITHUB_BRANCH || 'main',
  providerVersionTags = getProviderVersionTags(),
  pactUrls,
  pactBrokerUrl = process.env.PACT_BROKER_BASE_URL,
  pactPayloadUrl = process.env.PACT_PAYLOAD_URL
}: {
  provider: string
  messageProviders: MessageProviders
  includeMainAndDeployed: boolean
  stateHandlers?: StateHandlers & MessageStateHandlers
  consumer?: string
  enablePending?: boolean
  logLevel?: 'trace' | 'debug' | 'info' | 'warn' | 'error'
  publishVerificationResult?: boolean
  pactBrokerToken?: string
  providerVersion?: string
  providerVersionBranch?: string
  providerVersionTags?: string[]
  pactUrls?: string[]
  pactBrokerUrl?: string
  pactPayloadUrl?: string
}): PactMessageProviderOptions {
  console.table({
    Provider: provider,
    'Message Handlers': messageProviders ? 'Provided' : 'Not Provided',
    'State Handlers': stateHandlers ? 'Provided' : 'Not Provided',
    'Include Main and Deployed': includeMainAndDeployed,
    Consumer: consumer || 'All Consumers',
    PACT_BROKER_TOKEN: pactBrokerToken ? 'Provided' : 'Not Provided',
    'Provider Version': providerVersion,
    'Provider Version Branch': providerVersionBranch,
    'Provider Version Tags': providerVersionTags.join(', ') || 'None',
    'Pact URLs': pactUrls ? pactUrls.join(', ') : 'Not Provided',
    'Pact Broker URL': pactBrokerUrl || 'Not Provided',
    'Pact Payload URL': pactPayloadUrl || 'Not Provided',
    'Enable Pending': enablePending,
    'Log Level': logLevel
  })

  const options: PactMessageProviderOptions = {
    provider,
    messageProviders,
    stateHandlers,
    logLevel,
    publishVerificationResult,
    providerVersion,
    providerVersionBranch,
    providerVersionTags,
    enablePending
  }

  if (pactBrokerToken) {
    options.pactBrokerToken = pactBrokerToken
  }

  // Local mode: verify directly against explicit pact files and skip broker selection.
  if (pactUrls && pactUrls.length > 0) {
    options.pactUrls = pactUrls
    return options
  }

  handlePactBrokerUrlAndSelectors({
    pactPayloadUrl,
    pactBrokerUrl,
    consumer,
    includeMainAndDeployed,
    options
  })

  return options
}
