import { describe, expect, it } from 'vitest'
import { MatchersV3 } from '@pact-foundation/pact'
import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'
import { zodToPactMatchers } from './zod-to-pact'

extendZodWithOpenApi(z)

const { string, integer, decimal, boolean, nullValue, eachLike, like } =
  MatchersV3

describe('zodToPactMatchers', () => {
  describe('primitive types with provided examples', () => {
    it('maps z.string() to string() matcher', () => {
      expect(zodToPactMatchers(z.string(), 'Inception')).toEqual(
        string('Inception')
      )
    })

    it('maps z.number() to decimal() matcher', () => {
      expect(zodToPactMatchers(z.number(), 8.5)).toEqual(decimal(8.5))
    })

    it('maps z.number().int() to integer() matcher', () => {
      expect(zodToPactMatchers(z.number().int(), 2010)).toEqual(integer(2010))
    })

    it('maps z.boolean() to boolean() matcher', () => {
      expect(zodToPactMatchers(z.boolean(), true)).toEqual(boolean(true))
      expect(zodToPactMatchers(z.boolean(), false)).toEqual(boolean(false))
    })

    it('maps z.null() to nullValue() matcher', () => {
      expect(zodToPactMatchers(z.null())).toEqual(nullValue())
    })
  })

  describe('primitive types with default fallbacks (no example)', () => {
    it('falls back to "string" literal for z.string()', () => {
      expect(zodToPactMatchers(z.string())).toEqual(string('string'))
    })

    it('falls back to 1.0 for z.number()', () => {
      expect(zodToPactMatchers(z.number())).toEqual(decimal(1.0))
    })

    it('falls back to no-arg integer() for z.number().int()', () => {
      expect(zodToPactMatchers(z.number().int())).toEqual(integer())
    })

    it('falls back to true for z.boolean()', () => {
      expect(zodToPactMatchers(z.boolean())).toEqual(boolean(true))
    })
  })

  describe('openapi example extraction', () => {
    it('uses .openapi({ example }) when no example argument is provided', () => {
      const schema = z.string().openapi({ example: 'Christopher Nolan' })
      expect(zodToPactMatchers(schema)).toEqual(string('Christopher Nolan'))
    })

    it('uses .openapi({ example }) for integers', () => {
      const schema = z.number().int().openapi({ example: 2010 })
      expect(zodToPactMatchers(schema)).toEqual(integer(2010))
    })

    it('provided example takes precedence over openapi example', () => {
      const schema = z.string().openapi({ example: 'from-openapi' })
      expect(zodToPactMatchers(schema, 'from-arg')).toEqual(string('from-arg'))
    })
  })

  describe('wrapper types', () => {
    it('unwraps z.optional() and maps inner type', () => {
      expect(zodToPactMatchers(z.string().optional(), 'hello')).toEqual(
        string('hello')
      )
    })

    it('unwraps z.nullable() and maps inner type', () => {
      expect(zodToPactMatchers(z.number().int().nullable(), 42)).toEqual(
        integer(42)
      )
    })

    it('unwraps z.default() and maps inner type', () => {
      expect(zodToPactMatchers(z.string().default('fallback'), 'hi')).toEqual(
        string('hi')
      )
    })
  })

  describe('z.object()', () => {
    it('maps each field to the appropriate matcher', () => {
      const schema = z.object({
        id: z.number().int(),
        name: z.string(),
        rating: z.number(),
        active: z.boolean()
      })
      const example = { id: 1, name: 'Inception', rating: 8.5, active: true }

      expect(zodToPactMatchers(schema, example)).toEqual({
        id: integer(1),
        name: string('Inception'),
        rating: decimal(8.5),
        active: boolean(true)
      })
    })

    it('maps nested objects recursively', () => {
      const schema = z.object({
        status: z.number().int(),
        data: z.object({
          id: z.number().int(),
          name: z.string()
        })
      })
      const example = { status: 200, data: { id: 1, name: 'Inception' } }

      expect(zodToPactMatchers(schema, example)).toEqual({
        status: integer(200),
        data: {
          id: integer(1),
          name: string('Inception')
        }
      })
    })

    it('falls back to openapi examples when object example omits a field', () => {
      const schema = z.object({
        name: z.string().openapi({ example: 'from-openapi' }),
        year: z.number().int()
      })
      // Only pass year; name should fall back to openapi example
      expect(zodToPactMatchers(schema, { year: 2010 })).toEqual({
        name: string('from-openapi'),
        year: integer(2010)
      })
    })
  })

  describe('z.array()', () => {
    it('maps to eachLike() with item matchers', () => {
      const schema = z.array(z.number().int())
      expect(zodToPactMatchers(schema, [1, 2, 3])).toEqual(eachLike(integer(1)))
    })

    it('maps array of objects to eachLike() with object matchers', () => {
      const schema = z.array(
        z.object({ id: z.number().int(), name: z.string() })
      )
      const example = [{ id: 1, name: 'Inception' }]

      expect(zodToPactMatchers(schema, example)).toEqual(
        eachLike({ id: integer(1), name: string('Inception') })
      )
    })

    it('uses item openapi examples when array example is empty', () => {
      const schema = z.array(
        z.object({
          id: z.number().int().openapi({ example: 99 }),
          name: z.string().openapi({ example: 'fallback' })
        })
      )
      expect(zodToPactMatchers(schema, [])).toEqual(
        eachLike({ id: integer(99), name: string('fallback') })
      )
    })
  })

  describe('z.union()', () => {
    it('uses the first union option', () => {
      const schema = z.union([z.string(), z.number()])
      expect(zodToPactMatchers(schema, 'hello')).toEqual(string('hello'))
    })
  })

  describe('z.literal()', () => {
    it('maps string literal to string() matcher', () => {
      expect(zodToPactMatchers(z.literal('active'))).toEqual(string('active'))
    })

    it('maps integer literal to integer() matcher', () => {
      expect(zodToPactMatchers(z.literal(200))).toEqual(integer(200))
    })

    it('maps float literal to decimal() matcher', () => {
      expect(zodToPactMatchers(z.literal(8.5))).toEqual(decimal(8.5))
    })

    it('maps boolean literal to boolean() matcher', () => {
      expect(zodToPactMatchers(z.literal(true))).toEqual(boolean(true))
    })
  })

  describe('z.enum()', () => {
    it('maps enum to string() matcher using first value', () => {
      const schema = z.enum(['draft', 'published', 'archived'])
      expect(zodToPactMatchers(schema)).toEqual(string('draft'))
    })
  })

  describe('unknown / fallback types', () => {
    it('maps z.any() to like() with provided example', () => {
      expect(zodToPactMatchers(z.any(), { foo: 'bar' })).toEqual(
        like({ foo: 'bar' })
      )
    })
  })

  describe('real-world schema example (movie response)', () => {
    it('produces correct matchers for a movie response without id', () => {
      const MovieWithoutIdSchema = z.object({
        name: z.string().openapi({ example: 'Inception' }),
        year: z.number().int().openapi({ example: 2010 }),
        rating: z.number().openapi({ example: 8.5 }),
        director: z.string().openapi({ example: 'Christopher Nolan' })
      })

      // Using openapi examples only (no runtime example passed)
      expect(zodToPactMatchers(MovieWithoutIdSchema)).toEqual({
        name: string('Inception'),
        year: integer(2010),
        rating: decimal(8.5),
        director: string('Christopher Nolan')
      })
    })

    it('produces correct matchers for a full response schema with provided example', () => {
      const ResponseSchema = z.object({
        status: z.number().int(),
        data: z.object({
          id: z.number().int(),
          name: z.string(),
          year: z.number().int(),
          rating: z.number(),
          director: z.string()
        })
      })

      const example = {
        status: 200,
        data: {
          id: 1,
          name: 'My movie',
          year: 1999,
          rating: 8.5,
          director: 'John Doe'
        }
      }

      expect(zodToPactMatchers(ResponseSchema, example)).toEqual({
        status: integer(200),
        data: {
          id: integer(1),
          name: string('My movie'),
          year: integer(1999),
          rating: decimal(8.5),
          director: string('John Doe')
        }
      })
    })
  })
})
