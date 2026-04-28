import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { produceMovieEvent } from './movie-events'
import { Kafka } from 'kafkajs'
import { generateMovieWithId } from '../../../shared/test-utils/movie-factories'
import type { Movie } from '@shared/types/movie-types'

// Mock kafkajs
vi.mock('kafkajs', () => ({
  Kafka: vi.fn().mockImplementation(() => ({
    producer: vi.fn(() => ({
      connect: vi.fn().mockResolvedValue(undefined),
      send: vi.fn(),
      disconnect: vi.fn()
    }))
  }))
}))

// Mock fs — must provide default export since source uses `import fs from 'node:fs/promises'`
vi.mock('node:fs/promises', () => ({
  default: {
    appendFile: vi.fn().mockResolvedValue(undefined)
  },
  appendFile: vi.fn().mockResolvedValue(undefined)
}))

// Mock console.table and console.error
global.console.table = vi.fn()
global.console.error = vi.fn()

describe('produceMovieEvent', () => {
  const mockMovie: Movie = generateMovieWithId()
  const key = mockMovie.id.toString() // the key is always a string in Kafka

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should produce a movie event successfully', async () => {
    const kafkaInstance = new Kafka({
      clientId: 'test-client',
      brokers: ['localhost:9092']
    })
    const event = {
      topic: 'movie-created',
      messages: [{ key, value: JSON.stringify(mockMovie) }]
    }
    const producer = kafkaInstance.producer()
    await producer.connect()
    await producer.send(event)
    await producer.disconnect()

    // Start the async operation
    const resultPromise = produceMovieEvent(mockMovie, 'created')

    // Advance timers to trigger the setTimeout in logEvent
    await vi.advanceTimersByTimeAsync(1500)

    const result = await resultPromise

    expect(Kafka).toHaveBeenCalledWith(expect.any(Object))
    expect(producer.connect).toHaveBeenCalled()
    expect(producer.send).toHaveBeenCalledWith(event)
    expect(producer.disconnect).toHaveBeenCalled()
    expect(console.table).toHaveBeenCalled()
    expect(result).toEqual(
      expect.objectContaining({
        topic: 'movie-created',
        messages: [{ key, value: mockMovie }]
      })
    )
  })
})
