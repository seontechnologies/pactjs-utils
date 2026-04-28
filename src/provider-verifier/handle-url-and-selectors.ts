import type {
  PactMessageProviderOptions,
  VerifierOptions
} from '@pact-foundation/pact'
import type { ConsumerVersionSelector } from '../pact-types'
import isCI from 'is-ci'

/**
 * Handles the conditional logic for selecting the Pact Broker URL and consumer version selectors.
 * Updates the verifier options based on the availability of the Pact payload URL or Pact Broker base URL.
 */
export function handlePactBrokerUrlAndSelectors({
  pactPayloadUrl,
  pactBrokerUrl,
  consumer,
  includeMainAndDeployed,
  options
}: {
  pactPayloadUrl?: string
  pactBrokerUrl?: string
  consumer?: string
  includeMainAndDeployed: boolean
  options: PactMessageProviderOptions | VerifierOptions
}): void {
  if (pactPayloadUrl) {
    const usedPayloadUrl = processPactPayloadUrl(
      pactPayloadUrl,
      consumer,
      options
    )
    if (usedPayloadUrl) {
      return
    }
  }

  usePactBrokerUrlAndSelectors({
    pactBrokerUrl,
    consumer,
    includeMainAndDeployed,
    options
  })
}

/**
 * Generates an array of tags to associate with the provider version.
 * Tags are only used in Webhooks, therefore we use is-ci.
 */
export function getProviderVersionTags(): string[] {
  const tags: string[] = []

  if (isCI) {
    const isBreakingChange = process.env.PACT_BREAKING_CHANGE === 'true'
    console.log({ isBreakingChange })
    if (!isBreakingChange) {
      tags.push('dev')
    }

    if (process.env.GITHUB_BRANCH) {
      tags.push(process.env.GITHUB_BRANCH)
    }
  } else {
    tags.push('local')
  }

  console.log('providerVersionTags:', tags)
  return tags
}

/**
 * Builds an array of ConsumerVersionSelector objects for Pact verification.
 * Determines which consumer pacts should be verified against the provider.
 */
function buildConsumerVersionSelectors(
  consumer: string | undefined,
  includeMainAndDeployed = true
): ConsumerVersionSelector[] {
  const baseSelector: Partial<ConsumerVersionSelector> = consumer
    ? { consumer }
    : {}

  const selectors: ConsumerVersionSelector[] = [
    { ...baseSelector, matchingBranch: true }
  ]

  if (includeMainAndDeployed) {
    selectors.push({ ...baseSelector, mainBranch: true })
    selectors.push({ ...baseSelector, deployedOrReleased: true })
  }

  return selectors
}

/**
 * Processes the Pact payload URL to determine if it should be used for verification.
 */
function processPactPayloadUrl(
  pactPayloadUrl: string,
  consumer: string | undefined,
  options: PactMessageProviderOptions | VerifierOptions
): boolean {
  console.log(`Pact payload URL provided: ${pactPayloadUrl}`)

  const parsed = parseProviderAndConsumerFromUrl(pactPayloadUrl)

  if (parsed) {
    const { provider: pactUrlProvider, consumer: pactUrlConsumer } = parsed
    console.log(`Pact URL Provider: ${pactUrlProvider}`)
    console.log(`Pact URL Consumer: ${pactUrlConsumer}`)

    const providerMatches = options.provider === pactUrlProvider
    const consumerMatches = !consumer || consumer === pactUrlConsumer

    if (providerMatches && consumerMatches) {
      usePactPayloadUrl(pactPayloadUrl, options)
      return true
    } else {
      console.log(
        `PACT_PAYLOAD_URL does not match the provider (${options.provider}) and consumer (${consumer || 'all'}), ignoring it`
      )
    }
  } else {
    console.log(
      'Could not parse provider and consumer from PACT_PAYLOAD_URL, ignoring it'
    )
  }

  return false
}

/**
 * Parses the provider and consumer names from the given Pact payload URL.
 */
function parseProviderAndConsumerFromUrl(
  pactPayloadUrl: string
): { provider: string; consumer: string } | null {
  const regex = /\/pacts\/provider\/([^/]+)\/consumer\/([^/]+)\//
  const match = regex.exec(pactPayloadUrl)

  if (match) {
    const provider = decodeURIComponent(match[1] as string)
    const consumer = decodeURIComponent(match[2] as string)
    return { provider, consumer }
  }

  return null
}

/**
 * Configures the verifier options to use the Pact payload URL for verification.
 */
function usePactPayloadUrl(
  pactPayloadUrl: string,
  options: PactMessageProviderOptions | VerifierOptions
): void {
  console.log(
    'PACT_PAYLOAD_URL matches the provider and consumer, using it for verification'
  )
  options.pactUrls = [pactPayloadUrl]

  delete options.pactBrokerUrl
  delete options.consumerVersionSelectors
}

/**
 * Configures the verifier options to use the Pact Broker URL and consumer version selectors.
 */
function usePactBrokerUrlAndSelectors({
  pactBrokerUrl,
  consumer,
  includeMainAndDeployed,
  options
}: {
  pactBrokerUrl: string | undefined
  consumer: string | undefined
  includeMainAndDeployed: boolean
  options: PactMessageProviderOptions | VerifierOptions
}): void {
  if (!pactBrokerUrl) {
    throw new Error('PACT_BROKER_BASE_URL is required but not set.')
  }

  console.log(`Using Pact Broker Base URL: ${pactBrokerUrl}`)

  options.pactBrokerUrl = pactBrokerUrl
  options.consumerVersionSelectors = buildConsumerVersionSelectors(
    consumer,
    includeMainAndDeployed
  )

  if (consumer) {
    console.log(`Running verification for consumer: ${consumer}`)
  } else {
    console.log('Running verification for all consumers')
  }

  if (includeMainAndDeployed) {
    console.log(
      'Including main branch and deployedOrReleased in the verification'
    )
  } else {
    console.log(
      'Only running the matching branch, this is useful when introducing breaking changes'
    )
  }

  console.log(
    'Consumer Version Selectors:',
    JSON.stringify(options.consumerVersionSelectors, null, 2)
  )
}
