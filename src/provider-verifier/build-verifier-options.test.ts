import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('./handle-url-and-selectors', () => ({
  handlePactBrokerUrlAndSelectors: vi.fn(),
  getProviderVersionTags: vi.fn(() => ['local'])
}))

import {
  buildVerifierOptions,
  buildMessageVerifierOptions
} from './build-verifier-options'
import { handlePactBrokerUrlAndSelectors } from './handle-url-and-selectors'

describe('buildVerifierOptions', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
    vi.clearAllMocks()
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('builds options with required fields', () => {
    const options = buildVerifierOptions({
      provider: 'SampleMoviesAPI',
      port: '3001',
      includeMainAndDeployed: true
    })

    expect(options.provider).toBe('SampleMoviesAPI')
    expect(options.providerBaseUrl).toBe('http://localhost:3001')
    expect(options.logLevel).toBe('info')
    expect(options.publishVerificationResult).toBe(true)
    expect(options.enablePending).toBe(false)
    expect(options.providerVersion).toBe('unknown')
    expect(options.providerVersionBranch).toBe('main')
    expect(options.providerVersionTags).toEqual(['local'])
  })

  it('calls handlePactBrokerUrlAndSelectors with correct args', () => {
    buildVerifierOptions({
      provider: 'SampleMoviesAPI',
      port: '3001',
      includeMainAndDeployed: true,
      pactBrokerUrl: 'https://broker.example.com',
      consumer: 'WebConsumer'
    })

    expect(handlePactBrokerUrlAndSelectors).toHaveBeenCalledWith({
      pactPayloadUrl: undefined,
      pactBrokerUrl: 'https://broker.example.com',
      consumer: 'WebConsumer',
      includeMainAndDeployed: true,
      options: expect.objectContaining({ provider: 'SampleMoviesAPI' })
    })
  })

  it('uses env vars for defaults', () => {
    process.env.GITHUB_SHA = 'abc123'
    process.env.GITHUB_BRANCH = 'feature/test'
    process.env.PACT_BROKER_TOKEN = 'my-token'
    process.env.PACT_BROKER_BASE_URL = 'https://broker.env.com'
    process.env.PACT_PAYLOAD_URL = 'https://payload.url'

    const options = buildVerifierOptions({
      provider: 'SampleMoviesAPI',
      port: '3001',
      includeMainAndDeployed: true
    })

    expect(options.providerVersion).toBe('abc123')
    expect(options.providerVersionBranch).toBe('feature/test')
    expect(options.pactBrokerToken).toBe('my-token')
  })

  it('accepts custom requestFilter', () => {
    const customFilter = vi.fn()

    const options = buildVerifierOptions({
      provider: 'SampleMoviesAPI',
      port: '3001',
      includeMainAndDeployed: true,
      requestFilter: customFilter
    })

    expect(options.requestFilter).toBe(customFilter)
  })

  it('includes stateHandlers when provided', () => {
    const stateHandlers = {
      'An existing movie exists': () => Promise.resolve()
    }

    const options = buildVerifierOptions({
      provider: 'SampleMoviesAPI',
      port: '3001',
      includeMainAndDeployed: true,
      stateHandlers
    })

    expect(options.stateHandlers).toBe(stateHandlers)
  })

  it('uses local pactUrls without broker selector handling', () => {
    const options = buildVerifierOptions({
      provider: 'SampleMoviesAPI',
      port: '3001',
      includeMainAndDeployed: true,
      pactUrls: ['/tmp/pacts/SampleAppConsumer-SampleMoviesAPI.json']
    })

    expect(options.pactUrls).toEqual([
      '/tmp/pacts/SampleAppConsumer-SampleMoviesAPI.json'
    ])
    expect(handlePactBrokerUrlAndSelectors).not.toHaveBeenCalled()
  })
})

describe('buildMessageVerifierOptions', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
    vi.clearAllMocks()
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('builds message options with required fields', () => {
    const messageProviders = {
      'a movie event': () => Promise.resolve({ id: 1, name: 'Test' })
    }

    const options = buildMessageVerifierOptions({
      provider: 'SampleMoviesAPI',
      messageProviders,
      includeMainAndDeployed: true
    })

    expect(options.provider).toBe('SampleMoviesAPI')
    expect(options.messageProviders).toBe(messageProviders)
    expect(options.logLevel).toBe('info')
    expect(options.publishVerificationResult).toBe(true)
    expect(options.enablePending).toBe(false)
  })

  it('calls handlePactBrokerUrlAndSelectors for message verifier', () => {
    const messageProviders = {
      'a movie event': () => Promise.resolve({ id: 1, name: 'Test' })
    }

    buildMessageVerifierOptions({
      provider: 'SampleMoviesAPI',
      messageProviders,
      includeMainAndDeployed: true,
      pactBrokerUrl: 'https://broker.example.com'
    })

    expect(handlePactBrokerUrlAndSelectors).toHaveBeenCalledWith({
      pactPayloadUrl: undefined,
      pactBrokerUrl: 'https://broker.example.com',
      consumer: undefined,
      includeMainAndDeployed: true,
      options: expect.objectContaining({ provider: 'SampleMoviesAPI' })
    })
  })

  it('uses local pactUrls for message verifier without broker selector handling', () => {
    const messageProviders = {
      'a movie event': () => Promise.resolve({ id: 1, name: 'Test' })
    }

    const options = buildMessageVerifierOptions({
      provider: 'SampleMoviesAPI',
      messageProviders,
      includeMainAndDeployed: true,
      pactUrls: ['/tmp/pacts/message-pact.json']
    })

    expect(options.pactUrls).toEqual(['/tmp/pacts/message-pact.json'])
    expect(handlePactBrokerUrlAndSelectors).not.toHaveBeenCalled()
  })
})
