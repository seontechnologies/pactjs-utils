// Re-export state handlers from the HTTP helpers.
// Message provider verification needs the same DB state setup
// (e.g., "An existing movie exists", "No movies exist") as HTTP verification.
export { stateHandlers } from '../../http/helpers/state-handlers'
