import "server-only";

/**
 * Minimal in-memory brute-force guard for the login action.
 *
 * This is intentionally simple: it resets on server restart and is
 * per-process (won't coordinate across multiple instances). That's an
 * acceptable tradeoff for a small internal admin tool; revisit with a
 * persisted store (e.g. a Supabase table) if this ever runs multi-instance
 * behind a load balancer.
 */




function getLockoutMS(): number{
  const lockoutMS = Number(process.env.LOCKOUT_MS)
  if (!process.env.LOCKOUT_MS || Number.isNaN(lockoutMS) || lockoutMS <= 0) {
    throw new Error(
      "LOCKOUT_MS must be set in environment to a positive number",
    );
  }
  return lockoutMS;
}


function getMaxAttempts(): number {
  const maxAttempts = Number(process.env.MAX_ATTEMPTS);
  if (!process.env.MAX_ATTEMPTS || Number.isNaN(maxAttempts) || maxAttempts <= 0) {
    throw new Error(
      "MAX_ATTEMPTS must be set in environment to a positive number",
    );
  }
  return maxAttempts;
}


interface Attempt {
  count: number;
  lockedUntil: number | null;
}

const attempts = new Map<string, Attempt>();

export function isLockedOut(key: string): boolean {
  const entry = attempts.get(key);
  if (!entry?.lockedUntil) return false;
  if (Date.now() >= entry.lockedUntil) {
    attempts.delete(key);
    return false;
  }
  return true;
}

export function recordFailedAttempt(key: string): void {
  const entry = attempts.get(key) ?? { count: 0, lockedUntil: null };
  entry.count += 1;
  if (entry.count >= getMaxAttempts()) {
    entry.lockedUntil = Date.now() + getLockoutMS();
    entry.count = 0;
  }
  attempts.set(key, entry);
}

export function clearAttempts(key: string): void {
  attempts.delete(key);
}
