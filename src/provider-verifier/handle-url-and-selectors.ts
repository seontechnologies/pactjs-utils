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
 *
 * The `'dev'` tag is reserved for builds on the deployable branch
 * (`master` or `main`). PactFlow promotes the legacy `'dev'` tag into the
 * `dev` environment, so tagging PR/feature-branch verifications with `'dev'`
 * makes them masquerade as the version "currently in dev". That poisons every
 * consumer's `can-i-deploy --to-environment dev` — the answer ends up
 * depending on whichever provider PR happened to verify last, instead of
 * what is actually deployed. Recording an actual deployment is the job of
 * `record-deployment` (run only on master), not of the verifier.
 *
 * Behavior:
 * - Local (non-CI):                          `['local']`
 * - CI, branch is `master` / `main`:         `['dev', <branch>]` (unless PACT_BREAKING_CHANGE)
 * - CI, any other branch:                    `[<branch>]`
 * - CI, branch unset:                        `[]`
 * - CI + PACT_BREAKING_CHANGE=true:          `'dev'` is always omitted
 */
export function getProviderVersionTags(): string[] {
  if (!isCI) {
    const tags = ['local']
    console.log('providerVersionTags:', tags)
    return tags
  }

  const branch = process.env.GITHUB_BRANCH
  const isBreakingChange = process.env.PACT_BREAKING_CHANGE === 'true'
  const isDeployableBranch = branch === 'master' || branch === 'main'

  console.log({ isBreakingChange, isDeployableBranch, branch })

  const tags: string[] = []

  if (isDeployableBranch && !isBreakingChange) {
    tags.push('dev')
  }

  if (branch) {
    tags.push(branch)
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
