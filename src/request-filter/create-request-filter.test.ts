import { describe, it, expect, vi } from 'vitest'
import { createRequestFilter, noOpRequestFilter } from './create-request-filter'

// We use `as never` to bypass Express Request type requirements in tests.
// The underlying implementation only accesses req.headers, so this is safe.
const makeReq = (headers: Record<string, string> = {}) =>
  ({ headers: { ...headers }, body: undefined }) as never

describe('createRequestFilter', () => {
  it('adds a Bearer authorization header when absent (non-Express env)', () => {
    const filter = createRequestFilter()!
    const req = makeReq()

    const result = filter(req, {} as never, undefined as never)

    expect(result).toBeDefined()
    expect(
      (req as { headers: Record<string, string> }).headers['authorization']
    ).toMatch(/^Bearer .+/)
  })

  it('does not override an existing Authorization header (capitalized)', () => {
    const filter = createRequestFilter()!
    const req = makeReq({ Authorization: 'Bearer existing-token' })

    filter(req, {} as never, undefined as never)

    expect(
      (req as { headers: Record<string, string> }).headers['Authorization']
    ).toBe('Bearer existing-token')
  })

  it('does not override an existing authorization header (lowercase)', () => {
    const filter = createRequestFilter()!
    const req = makeReq({ authorization: 'Bearer lowercase-token' })

    filter(req, {} as never, undefined as never)

    expect(
      (req as { headers: Record<string, string> }).headers['authorization']
    ).toBe('Bearer lowercase-token')
  })

  it('uses a custom tokenGenerator', () => {
    const filter = createRequestFilter({
      tokenGenerator: () => 'my-custom-token'
    })!
    const req = makeReq()

    filter(req, {} as never, undefined as never)

    expect(
      (req as { headers: Record<string, string> }).headers['authorization']
    ).toBe('Bearer my-custom-token')
  })

  it('calls next() in an Express environment', () => {
    const filter = createRequestFilter()!
    const req = makeReq()
    const next = vi.fn()

    const result = filter(req, {} as never, next)

    expect(next).toHaveBeenCalledOnce()
    expect(result).toBeUndefined()
  })
})

describe('noOpRequestFilter', () => {
  it('passes the request through without modification (non-Express)', () => {
    const req = makeReq({ 'Content-Type': 'application/json' })

    const result = noOpRequestFilter!(req, {} as never, undefined as never)

    const headers = (req as { headers: Record<string, string> }).headers
    expect(result).toBeDefined()
    expect(headers['Authorization']).toBeUndefined()
    expect(headers['Content-Type']).toBe('application/json')
  })

  it('calls next() in an Express environment', () => {
    const req = makeReq()
    const next = vi.fn()

    noOpRequestFilter!(req, {} as never, next)

    expect(next).toHaveBeenCalledOnce()
  })
})
