import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { VerifierOptions } from '@pact-foundation/pact'

// Mock is-ci before importing the module under test
vi.mock('is-ci', () => ({ default: false }))

import {
  handlePactBrokerUrlAndSelectors,
  getProviderVersionTags
} from './handle-url-and-selectors'

describe('handlePactBrokerUrlAndSelectors', () => {
  it('uses pactPayloadUrl when it matches provider and consumer', () => {
    const options: VerifierOptions = {
      provider: 'SampleMoviesAPI',
      providerBaseUrl: 'http://localhost:3001'
    }

    handlePactBrokerUrlAndSelectors({
      pactPayloadUrl:
        'https://broker.example.com/pacts/provider/SampleMoviesAPI/consumer/WebConsumer/latest',
      pactBrokerUrl: 'https://broker.example.com',
      consumer: 'WebConsumer',
      includeMainAndDeployed: true,
      options
    })

    expect(options.pactUrls).toEqual([
      'https://broker.example.com/pacts/provider/SampleMoviesAPI/consumer/WebConsumer/latest'
    ])
    expect(options.pactBrokerUrl).toBeUndefined()
    expect(options.consumerVersionSelectors).toBeUndefined()
  })

  it('falls back to broker URL when pactPayloadUrl does not match', () => {
    const options: VerifierOptions = {
      provider: 'SampleMoviesAPI',
      providerBaseUrl: 'http://localhost:3001'
    }

    handlePactBrokerUrlAndSelectors({
      pactPayloadUrl:
        'https://broker.example.com/pacts/provider/OtherAPI/consumer/WebConsumer/latest',
      pactBrokerUrl: 'https://broker.example.com',
      consumer: undefined,
      includeMainAndDeployed: true,
      options
    })

    expect(options.pactBrokerUrl).toBe('https://broker.example.com')
    expect(options.consumerVersionSelectors).toBeDefined()
  })

  it('uses broker URL with selectors when no pactPayloadUrl', () => {
    const options: VerifierOptions = {
      provider: 'SampleMoviesAPI',
      providerBaseUrl: 'http://localhost:3001'
    }

    handlePactBrokerUrlAndSelectors({
      pactBrokerUrl: 'https://broker.example.com',
      consumer: undefined,
      includeMainAndDeployed: true,
      options
    })

    expect(options.pactBrokerUrl).toBe('https://broker.example.com')
    expect(options.consumerVersionSelectors).toEqual([
      { matchingBranch: true },
      { mainBranch: true },
      { deployedOrReleased: true }
    ])
  })

  it('builds selectors without main/deployed when includeMainAndDeployed is false', () => {
    const options: VerifierOptions = {
      provider: 'SampleMoviesAPI',
      providerBaseUrl: 'http://localhost:3001'
    }

    handlePactBrokerUrlAndSelectors({
      pactBrokerUrl: 'https://broker.example.com',
      consumer: undefined,
      includeMainAndDeployed: false,
      options
    })

    expect(options.consumerVersionSelectors).toEqual([{ matchingBranch: true }])
  })

  it('includes consumer in selectors when specified', () => {
    const options: VerifierOptions = {
      provider: 'SampleMoviesAPI',
      providerBaseUrl: 'http://localhost:3001'
    }

    handlePactBrokerUrlAndSelectors({
      pactBrokerUrl: 'https://broker.example.com',
      consumer: 'WebConsumer',
      includeMainAndDeployed: true,
      options
    })

    expect(options.consumerVersionSelectors).toEqual([
      { consumer: 'WebConsumer', matchingBranch: true },
      { consumer: 'WebConsumer', mainBranch: true },
      { consumer: 'WebConsumer', deployedOrReleased: true }
    ])
  })

  it('throws when pactBrokerUrl is missing and no pactPayloadUrl', () => {
    const options: VerifierOptions = {
      provider: 'SampleMoviesAPI',
      providerBaseUrl: 'http://localhost:3001'
    }

    expect(() =>
      handlePactBrokerUrlAndSelectors({
        consumer: undefined,
        includeMainAndDeployed: true,
        options
      })
    ).toThrow('PACT_BROKER_BASE_URL is required but not set.')
  })

  it('uses pactPayloadUrl when consumer is not specified (matches any consumer)', () => {
    const options: VerifierOptions = {
      provider: 'SampleMoviesAPI',
      providerBaseUrl: 'http://localhost:3001'
    }

    handlePactBrokerUrlAndSelectors({
      pactPayloadUrl:
        'https://broker.example.com/pacts/provider/SampleMoviesAPI/consumer/AnyConsumer/latest',
      pactBrokerUrl: 'https://broker.example.com',
      consumer: undefined,
      includeMainAndDeployed: true,
      options
    })

    expect(options.pactUrls).toEqual([
      'https://broker.example.com/pacts/provider/SampleMoviesAPI/consumer/AnyConsumer/latest'
    ])
  })
})

describe('getProviderVersionTags', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('returns ["local"] when not in CI', async () => {
    // is-ci is mocked to return false
    const tags = getProviderVersionTags()
    expect(tags).toEqual(['local'])
  })

  it('returns ["dev"] in CI when no breaking change and no branch', async () => {
    // Re-mock is-ci as true for this test
    const mod = await import('is-ci')
    vi.mocked(mod).default = true as never

    delete process.env.PACT_BREAKING_CHANGE
    delete process.env.GITHUB_BRANCH

    const tags = getProviderVersionTags()
    expect(tags).toContain('dev')
    expect(tags).not.toContain('local')

    // Restore
    vi.mocked(mod).default = false as never
  })

  it('includes GITHUB_BRANCH in CI', async () => {
    const mod = await import('is-ci')
    vi.mocked(mod).default = true as never
    process.env.GITHUB_BRANCH = 'feature/my-branch'

    const tags = getProviderVersionTags()
    expect(tags).toContain('feature/my-branch')
    expect(tags).toContain('dev')

    vi.mocked(mod).default = false as never
  })

  it('excludes "dev" when PACT_BREAKING_CHANGE is true', async () => {
    const mod = await import('is-ci')
    vi.mocked(mod).default = true as never
    process.env.PACT_BREAKING_CHANGE = 'true'

    const tags = getProviderVersionTags()
    expect(tags).not.toContain('dev')

    vi.mocked(mod).default = false as never
  })
})
