type Identity = {
  userId: string
  username: string
  userIdentifier: string
}

/**
 * Generates a fake auth token matching the sample-app's token format.
 * Token format: `<ISO-timestamp>:<JSON-identity>` or just `<ISO-timestamp>`
 * This is a sample-app-only helper — NOT part of the library.
 */
export const generateAuthToken = (identity?: Identity): string => {
  const timestamp = new Date().toISOString()
  if (identity) return `${timestamp}:${JSON.stringify(identity)}`
  return timestamp
}

/**
 * Default admin identity for pact tests.
 */
export const pactAdminIdentity: Identity = {
  userId: 'pact-user',
  username: 'pact',
  userIdentifier: 'admin'
}
