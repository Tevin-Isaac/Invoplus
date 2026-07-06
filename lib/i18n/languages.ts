export type LanguageCode = 'en' | 'es' | 'fr' | 'de' | 'pt' | 'ar' | 'zh' | 'hi' | 'sw' | 'ru' | 'ja'

export interface Language {
  code: LanguageCode
  label: string
  flag: string
  rtl?: boolean
}

// Flag = the country most associated with the language, not an exhaustive
// list of every country that speaks it (e.g. Swahili -> Kenya, per request).
export const LANGUAGES: Language[] = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'pt', label: 'Português', flag: '🇵🇹' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦', rtl: true },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
  { code: 'sw', label: 'Kiswahili', flag: '🇰🇪' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
]

export const DEFAULT_LANGUAGE: LanguageCode = 'en'
