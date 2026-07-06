// One-time script: translates lib/i18n/locales/en.json into every other
// supported language and writes lib/i18n/locales/{code}.json. Uses Google
// Translate's free, keyless "gtx" endpoint (the same one used by several
// open-source translation libraries) — run this locally whenever en.json
// changes, then commit the resulting JSON files. The running app never
// calls this API itself; it only ever reads the committed JSON.
//
// (Tried MyMemory first — it's officially keyless too, but its anonymous
// quota is only 5000 words/day and it silently returns a "quota exceeded"
// English sentence as if it were a valid translation instead of an error,
// which poisoned several locale files. gtx has no such quota in practice
// for a one-time batch like this.)
//
// Usage: node scripts/translate.mjs [langCode ...]
//   node scripts/translate.mjs          -> translates all languages
//   node scripts/translate.mjs sw ar    -> translates just those

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const localesDir = path.join(__dirname, '..', 'lib', 'i18n', 'locales')

// Google's "gtx" target codes — "zh" alone is ambiguous, force Simplified.
const GTX_CODE = { zh: 'zh-CN' }

const ALL_CODES = ['es', 'fr', 'de', 'pt', 'ar', 'zh', 'hi', 'sw', 'ru', 'ja']
const targets = process.argv.slice(2).length ? process.argv.slice(2) : ALL_CODES

function flatten(obj, prefix = '') {
  const out = {}
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (typeof v === 'object' && v !== null) Object.assign(out, flatten(v, key))
    else out[key] = v
  }
  return out
}

function unflatten(flat) {
  const out = {}
  for (const [key, value] of Object.entries(flat)) {
    const parts = key.split('.')
    let node = out
    for (let i = 0; i < parts.length - 1; i++) {
      node = node[parts[i]] ??= {}
    }
    node[parts[parts.length - 1]] = value
  }
  return out
}

async function translateOne(text, targetCode) {
  const gtx = GTX_CODE[targetCode] ?? targetCode
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${gtx}&dt=t&q=${encodeURIComponent(text)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status} for "${text}" -> ${targetCode}`)
  const data = await res.json()
  // Response shape: [[[translatedChunk, originalChunk, ...], ...], ...]
  const translated = data?.[0]?.map(chunk => chunk[0]).join('')
  if (!translated) throw new Error(`No translation for "${text}" -> ${targetCode}`)
  return translated
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function main() {
  const en = JSON.parse(readFileSync(path.join(localesDir, 'en.json'), 'utf-8'))
  const flatEn = flatten(en)
  const entries = Object.entries(flatEn)

  for (const code of targets) {
    console.log(`Translating ${entries.length} strings -> ${code}...`)
    const flatOut = {}
    for (const [key, text] of entries) {
      let attempt = 0
      while (true) {
        try {
          flatOut[key] = await translateOne(text, code)
          break
        } catch (err) {
          attempt++
          if (attempt > 3) {
            console.warn(`  giving up on "${key}", falling back to English: ${err.message}`)
            flatOut[key] = text
            break
          }
          await sleep(1000 * attempt)
        }
      }
      await sleep(150) // stay well under MyMemory's free rate limit
    }
    const nested = unflatten(flatOut)
    const outPath = path.join(localesDir, `${code}.json`)
    writeFileSync(outPath, JSON.stringify(nested, null, 2) + '\n')
    console.log(`  wrote ${outPath}`)
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
