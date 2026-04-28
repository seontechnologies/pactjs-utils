import type { JsonMap } from '../pact-types'
import { toJsonMap } from './to-json-map'

export type ProviderStateInput = {
  name: string
  params: Record<string, unknown>
}

/**
 * Creates a tuple representing a provider state for use with Pact.
 * Converts the parameters into a JsonMap where all values are Pact-compatible.
 *
 * @example
 * const state = createProviderState({
 *   name: 'An existing movie exists',
 *   params: { name: 'Inception', year: 2010 }
 * })
 * provider.given(...state)
 */
export const createProviderState = ({
  name,
  params
}: ProviderStateInput): [string, JsonMap] => [name, toJsonMap(params)]
