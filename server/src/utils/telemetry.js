// Simple in-memory metrics for HeyCiti's backend.
// These counters reset whenever the server restarts.
export const metrics = {
  ticketmasterCalls: 0,     // every request actually sent to Ticketmaster
  ticketmasterFailures: 0,  // requests that timed out, errored, or got a non-OK response
};

// Resets all counters. Only used by tests.
export function resetMetrics() {
  metrics.ticketmasterCalls = 0;
  metrics.ticketmasterFailures = 0;
}
