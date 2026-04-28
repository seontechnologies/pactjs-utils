import type { JsonMap } from '../pact-types'

/**
 * Converts an object with arbitrary value types to a `JsonMap` where all values are compatible with Pact's expectations.
 *
 * Handles various data types:
 * - `null` and `undefined`: Converted to the string `"null"`.
 * - `object`: Serialized using `JSON.stringify` unless it's a Date or Array.
 * - `number` and `boolean`: Preserved as is.
 * - `Date`: Converted to an ISO string format.
 * - `Array`: Converted to a comma-separated string via `String()`.
 */
export const toJsonMap = (obj: Record<string, unknown>): JsonMap =>
  Object.fromEntries(
    Object.entries(obj).map(([key, value]) => {
      if (value === null || value === undefined) {
        return [key, 'null']
      } else if (
        typeof value === 'object' &&
        !(value instanceof Date) &&
        !Array.isArray(value)
      ) {
        return [key, JSON.stringify(value)]
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        return [key, value]
      } else if (value instanceof Date) {
        return [key, value.toISOString()]
      } else {
        return [key, String(value)]
      }
    })
  )
