'use client'

import { useEffect } from 'react'

type UiLang = 'en' | 'zh' | 'sw'

function detectDeviceLanguage(): UiLang {
  if (typeof window === 'undefined') return 'en'

  const langs = [
    ...(navigator.languages || []),
    navigator.language || '',
  ]
    .join(',')
    .toLowerCase()

  if (langs.includes('zh')) return 'zh'
  if (langs.includes('sw')) return 'sw'
  return 'en'
}

function getStoredUiLanguage(): UiLang | null {
  if (typeof window === 'undefined') return null

  const value = window.localStorage.getItem('sl_ui_lang')

  if (value === 'zh' || value === 'en' || value === 'sw') {
    return value
  }

  return null
}

function getPreferredUiLanguage(): UiLang {
  return getStoredUiLanguage() || detectDeviceLanguage()
}

export default function UiLanguageBoot() {
  useEffect(() => {
    const lang = getPreferredUiLanguage()

    document.documentElement.lang = lang
    document.documentElement.setAttribute('data-ui-lang', lang)
  }, [])

  return null
}