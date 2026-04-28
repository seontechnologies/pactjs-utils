import { truncateTables } from './truncate-tables'

export default async function globalSetup() {
  console.log('Running global setup once before everything...')
  await truncateTables()

  return async function globalTeardown() {
    console.log('Running global teardown once after everything...')
    await truncateTables()
  }
}
