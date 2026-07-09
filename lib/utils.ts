import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(date))
}

export function truncate(str: string, n: number) {
  return str.length > n ? str.slice(0, n) + '…' : str
}

// Canton ledger errors come back as one long raw string — full gRPC error
// JSON (correlationId, traceId, the entire submitted command payload) baked
// into err.message server-side and passed straight through. Recognize the
// common, actionable ones and give a real instruction instead of a wall of
// JSON; fall back to a truncated version of whatever's left so a UI can
// never be blown out by an unrecognized one.
export function humanizeCantonError(raw: string | undefined | null): string {
  if (!raw) return 'Something went wrong — try again.'
  if (raw.includes('CONTRACT_NOT_FOUND')) {
    return "This listing changed on-chain since you loaded it (someone else's bid or settlement archived it) — refresh the page and try again."
  }
  if (raw.includes('Insufficient balance') || raw.includes('INSUFFICIENT')) {
    return 'Insufficient balance for this action.'
  }
  if (raw.includes('TOO_MANY_USER_RIGHTS')) {
    return 'The shared Canton sandbox is at capacity for new identities right now — try again in a few minutes.'
  }
  // Most Canton errors carry a human-readable "cause" field inside the
  // JSON blob — surface just that instead of the whole payload.
  const causeMatch = raw.match(/"cause":"([^"]+)"/)
  if (causeMatch) return causeMatch[1]
  return truncate(raw, 160)
}
