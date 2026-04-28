import { describe, it, expect } from 'vitest'
import { toJsonMap } from './to-json-map'

describe('toJsonMap', () => {
  it('converts null values to the string "null"', () => {
    const result = toJsonMap({ a: null })
    expect(result).toEqual({ a: 'null' })
  })

  it('converts undefined values to the string "null"', () => {
    const result = toJsonMap({ a: undefined })
    expect(result).toEqual({ a: 'null' })
  })

  it('serializes plain objects with JSON.stringify', () => {
    const result = toJsonMap({
      director: { firstName: 'Christopher', lastName: 'Nolan' }
    })
    expect(result).toEqual({
      director: '{"firstName":"Christopher","lastName":"Nolan"}'
    })
  })

  it('preserves numbers as is', () => {
    const result = toJsonMap({ year: 2010, rating: 8.8 })
    expect(result).toEqual({ year: 2010, rating: 8.8 })
  })

  it('preserves booleans as is', () => {
    const result = toJsonMap({ released: true, deleted: false })
    expect(result).toEqual({ released: true, deleted: false })
  })

  it('converts dates to ISO strings', () => {
    const date = new Date('2024-09-01T12:00:00.000Z')
    const result = toJsonMap({ releaseDate: date })
    expect(result).toEqual({ releaseDate: '2024-09-01T12:00:00.000Z' })
  })

  it('converts arrays to comma-separated strings via String()', () => {
    const result = toJsonMap({ tags: ['Sci-Fi', 'Thriller'] })
    expect(result).toEqual({ tags: 'Sci-Fi,Thriller' })
  })

  it('converts string values using String()', () => {
    const result = toJsonMap({ name: 'Inception' })
    expect(result).toEqual({ name: 'Inception' })
  })

  it('handles a mix of all types', () => {
    const date = new Date('2024-01-01T00:00:00.000Z')
    const result = toJsonMap({
      name: 'Inception',
      year: 2010,
      released: true,
      director: { firstName: 'Christopher' },
      releaseDate: date,
      tags: ['Sci-Fi'],
      deleted: null,
      extra: undefined
    })
    expect(result).toEqual({
      name: 'Inception',
      year: 2010,
      released: true,
      director: '{"firstName":"Christopher"}',
      releaseDate: '2024-01-01T00:00:00.000Z',
      tags: 'Sci-Fi',
      deleted: 'null',
      extra: 'null'
    })
  })
})
