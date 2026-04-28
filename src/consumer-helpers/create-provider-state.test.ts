import { describe, it, expect } from 'vitest'
import { createProviderState } from './create-provider-state'

describe('createProviderState', () => {
  it('returns a tuple of [name, JsonMap]', () => {
    const result = createProviderState({
      name: 'An existing movie exists',
      params: { name: 'Inception', year: 2010 }
    })

    expect(result).toEqual([
      'An existing movie exists',
      { name: 'Inception', year: 2010 }
    ])
  })

  it('converts params via toJsonMap', () => {
    const result = createProviderState({
      name: 'A movie with details',
      params: {
        title: 'Inception',
        year: 2010,
        released: true,
        meta: null,
        director: { name: 'Nolan' }
      }
    })

    const [name, jsonMap] = result
    expect(name).toBe('A movie with details')
    expect(jsonMap).toEqual({
      title: 'Inception',
      year: 2010,
      released: true,
      meta: 'null',
      director: '{"name":"Nolan"}'
    })
  })

  it('can be spread into provider.given()', () => {
    const [stateName, stateParams] = createProviderState({
      name: 'No movies exist',
      params: { count: 0 }
    })

    expect(stateName).toBe('No movies exist')
    expect(stateParams).toEqual({ count: 0 })
  })
})
