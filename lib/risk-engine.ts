/**
 * InvoPlus Risk Scoring Engine
 *
 * Deterministic, rule-based invoice risk scoring.
 * No external API needed — runs entirely on our servers.
 *
 * Scoring logic mirrors what a credit analyst would check:
 *   - Invoice tenor (days until due) — longer = more risk
 *   - Invoice amount — very high amounts carry concentration risk
 *   - Completeness of debtor information
 *   - Currency (USD/EUR lower risk than exotic currencies)
 *   - Invoice number format (structured = more professional)
 */

export type RiskGrade = 'A' | 'B' | 'C' | 'D'

export interface RiskAssessment {
  score: number           // 0–100
  grade: RiskGrade
  advanceRateMin: number  // minimum advance rate we'd recommend (e.g. 0.80)
  advanceRateMax: number  // maximum advance rate (e.g. 0.92)
  tenorDays: number
  riskFactors: string[]
  positiveFactors: string[]
  summary: string
}

const LOW_RISK_CURRENCIES = ['USD', 'EUR', 'GBP', 'CHF', 'JPY', 'CAD', 'AUD']

export function scoreInvoice(params: {
  invoiceNumber: string
  debtorName: string
  amount: number
  currency: string
  issueDate: string   // YYYY-MM-DD
  dueDate: string     // YYYY-MM-DD
}): RiskAssessment {
  const { invoiceNumber, debtorName, amount, currency, issueDate, dueDate } = params
  const riskFactors: string[] = []
  const positiveFactors: string[] = []
  let score = 80 // start at 80, adjust up/down

  // ── Tenor ──────────────────────────────────────────────────────────────────
  const issue = new Date(issueDate)
  const due = new Date(dueDate)
  const tenorDays = Math.round((due.getTime() - issue.getTime()) / (1000 * 60 * 60 * 24))

  if (tenorDays <= 30) {
    score += 8
    positiveFactors.push('Short tenor (≤30 days) — low duration risk')
  } else if (tenorDays <= 60) {
    score += 4
    positiveFactors.push('Standard tenor (31–60 days)')
  } else if (tenorDays <= 90) {
    // neutral — industry standard
    positiveFactors.push('Net 90 — common in B2B trade')
  } else if (tenorDays <= 120) {
    score -= 6
    riskFactors.push('Extended tenor (91–120 days) — higher default window')
  } else {
    score -= 14
    riskFactors.push(`Long tenor (${tenorDays} days) — significantly elevated risk`)
  }

  // ── Amount ─────────────────────────────────────────────────────────────────
  if (amount < 5000) {
    score -= 4
    riskFactors.push('Very small invoice — higher relative processing cost')
  } else if (amount <= 50000) {
    score += 3
    positiveFactors.push('Small-to-mid invoice — good liquidity profile')
  } else if (amount <= 250000) {
    positiveFactors.push('Mid-size invoice — standard financing range')
  } else if (amount <= 1000000) {
    score -= 5
    riskFactors.push('Large invoice — concentration risk for single financier')
  } else {
    score -= 12
    riskFactors.push('Very large invoice (>$1M) — requires syndication')
  }

  // ── Currency ───────────────────────────────────────────────────────────────
  const upperCurrency = currency.toUpperCase()
  if (LOW_RISK_CURRENCIES.includes(upperCurrency)) {
    score += 3
    positiveFactors.push(`${upperCurrency} — major reserve currency, low FX risk`)
  } else {
    score -= 8
    riskFactors.push(`${upperCurrency} — exotic currency adds FX conversion risk`)
  }

  // ── Invoice number format ───────────────────────────────────────────────────
  const hasStructuredFormat = /^[A-Z]{2,5}[-\/]?\d{4}[-\/]?\d{2,6}$/i.test(invoiceNumber.trim())
  if (hasStructuredFormat) {
    score += 2
    positiveFactors.push('Structured invoice number — professional numbering system')
  } else if (invoiceNumber.trim().length < 3) {
    score -= 5
    riskFactors.push('Invoice number too short — may not be unique')
  }

  // ── Debtor name ─────────────────────────────────────────────────────────────
  const hasLegalSuffix = /(Ltd|Limited|Inc|Corp|Corporation|LLC|LLP|GmbH|PLC|Pty|SAS|BV|AG)\.?$/i.test(debtorName.trim())
  if (hasLegalSuffix) {
    score += 3
    positiveFactors.push('Debtor is a registered legal entity')
  } else if (debtorName.trim().split(' ').length === 1) {
    score -= 6
    riskFactors.push('Debtor name appears to be a sole trader or individual')
  }

  if (debtorName.trim().length < 4) {
    score -= 8
    riskFactors.push('Debtor name too short — insufficient identification')
  }

  // ── Due date validity ───────────────────────────────────────────────────────
  const today = new Date()
  const daysUntilDue = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (daysUntilDue < 0) {
    score -= 20
    riskFactors.push('Invoice is already past due date — very high default risk')
  } else if (daysUntilDue < 14) {
    score -= 8
    riskFactors.push('Invoice due within 14 days — limited auction window')
  }

  // ── Clamp score 0–100 ──────────────────────────────────────────────────────
  score = Math.max(0, Math.min(100, Math.round(score)))

  // ── Grade ──────────────────────────────────────────────────────────────────
  let grade: RiskGrade
  let advanceRateMin: number
  let advanceRateMax: number

  if (score >= 85) {
    grade = 'A'
    advanceRateMin = 0.87
    advanceRateMax = 0.93
  } else if (score >= 70) {
    grade = 'B'
    advanceRateMin = 0.82
    advanceRateMax = 0.89
  } else if (score >= 50) {
    grade = 'C'
    advanceRateMin = 0.75
    advanceRateMax = 0.84
  } else {
    grade = 'D'
    advanceRateMin = 0.65
    advanceRateMax = 0.78
  }

  const summary = score >= 85
    ? `Low-risk invoice from a registered entity with favorable terms. Strong candidate for competitive financing.`
    : score >= 70
    ? `Moderate-risk invoice with standard terms. Financiers will price in some risk premium.`
    : score >= 50
    ? `Elevated risk profile. Limited debtor information or unfavorable tenor. Expect conservative bids.`
    : `High-risk invoice. Missing key information or unfavorable conditions. May not attract bids.`

  return { score, grade, advanceRateMin, advanceRateMax, tenorDays, riskFactors, positiveFactors, summary }
}
