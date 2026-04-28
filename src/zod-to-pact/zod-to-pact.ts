import { MatchersV3 } from '@pact-foundation/pact'
import type { z } from 'zod'

type ZodDef = Record<string, unknown>
type Matcher = (schema: z.ZodTypeAny, example?: unknown) => unknown

// Lazily resolve getOpenApiMetadata from @asteasolutions/zod-to-openapi if present.
// The library treats it as optional — openapi example extraction silently skips when unavailable.
let _getOpenApiMetadata: ((s: z.ZodTypeAny) => Record<string, unknown>) | null =
  null
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('@asteasolutions/zod-to-openapi') as {
    getOpenApiMetadata: (s: z.ZodTypeAny) => Record<string, unknown>
  }
  _getOpenApiMetadata = mod.getOpenApiMetadata
} catch {
  // optional peer — openapi example extraction disabled
}

const getOpenApiExample = (schema: z.ZodTypeAny): unknown => {
  try {
    return _getOpenApiMetadata?.(schema)?.example
  } catch {
    return undefined
  }
}

const resolveExample = (schema: z.ZodTypeAny, provided?: unknown): unknown =>
  provided !== undefined ? provided : getOpenApiExample(schema)

const def = (schema: z.ZodTypeAny): ZodDef => schema.def as unknown as ZodDef

const isIntegerCheck = (d: ZodDef): boolean => {
  const checks = (d.checks as Array<Record<string, unknown>> | undefined) ?? []
  return checks.some((c) => c.isInt === true || c.format === 'safeint')
}

const matchString: Matcher = (schema, example) => {
  const ex = resolveExample(schema, example)
  return MatchersV3.string(typeof ex === 'string' ? ex : 'string')
}

const matchNumber: Matcher = (schema, example) => {
  const d = def(schema)
  const ex = resolveExample(schema, example)
  const numEx = typeof ex === 'number' ? ex : undefined
  return d.type === 'int' || isIntegerCheck(d)
    ? MatchersV3.integer(numEx)
    : MatchersV3.decimal(numEx ?? 1.0)
}

const matchBoolean: Matcher = (schema, example) => {
  const ex = resolveExample(schema, example)
  return MatchersV3.boolean(typeof ex === 'boolean' ? ex : true)
}

const matchWrapper: Matcher = (schema, example) => {
  const inner = (def(schema) as { innerType: z.ZodTypeAny }).innerType
  return zodToPactMatchers(inner, example)
}

const matchObject: Matcher = (schema, example) => {
  const shape = (schema as z.ZodObject<z.ZodRawShape>).shape
  const exObj =
    typeof example === 'object' && example !== null
      ? (example as Record<string, unknown>)
      : {}
  return Object.fromEntries(
    Object.entries(shape).map(([key, fieldSchema]) => [
      key,
      zodToPactMatchers(fieldSchema as z.ZodTypeAny, exObj[key])
    ])
  )
}

const matchArray: Matcher = (schema, example) => {
  const d = def(schema)
  const itemSchema = (d.element ?? d.type) as z.ZodTypeAny | undefined
  if (!itemSchema) return MatchersV3.like(example ?? null)
  const firstItem =
    Array.isArray(example) && example.length > 0 ? example[0] : undefined
  return MatchersV3.eachLike(zodToPactMatchers(itemSchema, firstItem))
}

const matchUnion: Matcher = (schema, example) => {
  const options = (def(schema) as { options: z.ZodTypeAny[] }).options
  return zodToPactMatchers(options[0]!, example)
}

const matchLiteral: Matcher = (schema) => {
  const d = def(schema)
  const val = Array.isArray(d.values)
    ? (d as { values: unknown[] }).values[0]
    : (d as { value: unknown }).value
  if (typeof val === 'string') return MatchersV3.string(val)
  if (typeof val === 'number')
    return Number.isInteger(val)
      ? MatchersV3.integer(val as number)
      : MatchersV3.decimal(val as number)
  if (typeof val === 'boolean') return MatchersV3.boolean(val as boolean)
  return MatchersV3.like(val)
}

const matchEnum: Matcher = (schema) => {
  const d = def(schema)
  const firstValue = Array.isArray(d.values)
    ? (d as { values: string[] }).values[0]
    : Object.keys((d as { entries: Record<string, string> }).entries)[0]
  return MatchersV3.string(firstValue)
}

const matchers: Record<string, Matcher> = {
  string: matchString,
  number: matchNumber,
  int: matchNumber,
  boolean: matchBoolean,
  null: () => MatchersV3.nullValue(),
  optional: matchWrapper,
  nullable: matchWrapper,
  default: matchWrapper,
  object: matchObject,
  array: matchArray,
  union: matchUnion,
  literal: matchLiteral,
  enum: matchEnum
}

/**
 * Converts a Zod schema into Pact V3 matchers.
 *
 * Each Zod type maps to the appropriate Pact matcher: `z.string()` → `string()`,
 * `z.number().int()` → `integer()`, `z.number()` → `decimal()`, etc.
 * Nested objects and arrays are handled recursively.
 *
 * Example values are resolved in priority order:
 *   1. The `example` argument (takes precedence)
 *   2. `.openapi({ example: ... })` metadata on the schema field
 *   3. A type-appropriate default (`'string'`, `1.0`, `true`)
 *
 * Intended for use with consumer-curated schemas — schemas that describe only
 * the fields the consumer actually reads. Passing a shared full-response schema
 * risks turning contract tests into schema tests (see Pact docs on consumer-driven contracts).
 *
 * @example
 * // pact/http/helpers/consumer-schemas.ts
 * export const ConsumerMovieSchema = z.object({
 *   id: z.number().int(),
 *   name: z.string(),
 *   year: z.number().int(),
 *   rating: z.number(),
 *   director: z.string()
 * })
 *
 * // pact/http/consumer/movies-read.pacttest.ts
 * import { zodToPactMatchers } from '@seontechnologies/pactjs-utils'
 * import { ConsumerMovieSchema } from '../helpers/consumer-schemas'
 *
 * const movie = { id: 1, name: 'My movie', year: 1999, rating: 8.5, director: 'John Doe' }
 * data: zodToPactMatchers(ConsumerMovieSchema, movie)
 * // { id: integer(1), name: string('My movie'), year: integer(1999), rating: decimal(8.5), director: string('John Doe') }
 */
export const zodToPactMatchers = (
  schema: z.ZodTypeAny,
  example?: unknown
): unknown => {
  const typeName = schema.type as string
  const matcher = matchers[typeName]
  return matcher
    ? matcher(schema, example)
    : MatchersV3.like(resolveExample(schema, example) ?? null)
}
