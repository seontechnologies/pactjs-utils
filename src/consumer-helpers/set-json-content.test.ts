import { describe, expect, it, vi } from 'vitest'
import { setJsonBody, setJsonContent } from './set-json-content'

describe('setJsonContent', () => {
  it('applies query and body for request builders', () => {
    const builder = {
      query: vi.fn(),
      headers: vi.fn(),
      jsonBody: vi.fn()
    }

    setJsonContent({
      query: { name: 'Inception' },
      body: { status: 200 }
    })(builder)

    expect(builder.query).toHaveBeenCalledWith({ name: 'Inception' })
    expect(builder.jsonBody).toHaveBeenCalledWith({ status: 200 })
    expect(builder.headers).not.toHaveBeenCalled()
  })

  it('applies headers and body for response builders', () => {
    const builder = {
      headers: vi.fn(),
      jsonBody: vi.fn()
    }

    setJsonContent({
      headers: { 'x-test': 'enabled' },
      body: { ok: true }
    })(builder)

    expect(builder.headers).toHaveBeenCalledWith({ 'x-test': 'enabled' })
    expect(builder.jsonBody).toHaveBeenCalledWith({ ok: true })
  })

  it('ignores query when builder does not support query', () => {
    const builder = {
      headers: vi.fn(),
      jsonBody: vi.fn()
    }

    setJsonContent({
      query: { limit: '10' },
      body: { count: 1 }
    })(builder)

    expect(builder.jsonBody).toHaveBeenCalledWith({ count: 1 })
  })

  it('does nothing when input is empty', () => {
    const builder = {
      query: vi.fn(),
      headers: vi.fn(),
      jsonBody: vi.fn()
    }

    setJsonContent({})(builder)

    expect(builder.query).not.toHaveBeenCalled()
    expect(builder.headers).not.toHaveBeenCalled()
    expect(builder.jsonBody).not.toHaveBeenCalled()
  })

  it('applies null body when explicitly provided', () => {
    const builder = {
      headers: vi.fn(),
      jsonBody: vi.fn()
    }

    setJsonContent({ body: null })(builder)

    expect(builder.jsonBody).toHaveBeenCalledWith(null)
  })
})

describe('setJsonBody', () => {
  it('sets only json body', () => {
    const builder = {
      headers: vi.fn(),
      jsonBody: vi.fn()
    }

    setJsonBody({ message: 'ok' })(builder)

    expect(builder.jsonBody).toHaveBeenCalledWith({ message: 'ok' })
    expect(builder.headers).not.toHaveBeenCalled()
  })
})
