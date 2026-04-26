'use client'

import { useEffect, useMemo, useState } from 'react'

type Props = {
  text: string
  lang?: string
  rates?: number[]
  onComplete?: () => void
}

type PlayStatus = 'idle' | 'playing' | 'paused' | 'done'

const LANG_PREFIX_MAP: Record<string, string[]> = {
  en: ['en-US', 'en-GB', 'en'],
  zh: ['zh-CN', 'zh-TW', 'zh-HK', 'zh'],
  ja: ['ja-JP', 'ja'],
  ko: ['ko-KR', 'ko'],
  es: ['es-ES', 'es-MX', 'es'],
  fr: ['fr-FR', 'fr-CA', 'fr'],
  de: ['de-DE', 'de'],
  pt: ['pt-BR', 'pt-PT', 'pt'],
  ru: ['ru-RU', 'ru'],
  ar: ['ar-SA', 'ar'],
  hi: ['hi-IN', 'hi'],
  id: ['id-ID', 'id'],
  vi: ['vi-VN', 'vi'],
  th: ['th-TH', 'th'],
  fil: ['fil-PH', 'fil', 'tl-PH', 'tl'],
  sw: ['sw-KE', 'sw-TZ', 'sw'],
  tr: ['tr-TR', 'tr'],
  it: ['it-IT', 'it'],
  nl: ['nl-NL', 'nl'],
  ms: ['ms-MY', 'ms'],
}

export default function ShadowingPlayer({
  text,
  lang = 'en',
  rates = [1],
  onComplete,
}: Props) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [voiceName, setVoiceName] = useState('')
  const [status, setStatus] = useState<PlayStatus>('idle')
  const [currentStep, setCurrentStep] = useState(0)
  const [error, setError] = useState('')

  const speechSupported =
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    'SpeechSynthesisUtterance' in window

  const normalizedRates = useMemo(() => {
    return rates.length ? rates : [1]
  }, [rates])

  useEffect(() => {
    if (!speechSupported) return

    function loadVoices() {
      const allVoices = window.speechSynthesis.getVoices()

      const uniqueMap = new Map<string, SpeechSynthesisVoice>()
      for (const voice of allVoices) {
        const key = `${voice.name}__${voice.lang}`
        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, voice)
        }
      }

      const uniqueVoices = Array.from(uniqueMap.values())
      setVoices(uniqueVoices)

      if (!voiceName && uniqueVoices.length > 0) {
        const preferred = pickVoice(uniqueVoices, lang)
        if (preferred) {
          setVoiceName(preferred.name)
        }
      }
    }

    loadVoices()
    window.speechSynthesis.onvoiceschanged = loadVoices

    return () => {
      window.speechSynthesis.onvoiceschanged = null
      window.speechSynthesis.cancel()
    }
  }, [speechSupported, voiceName, lang])

  useEffect(() => {
    if (!speechSupported) return
    window.speechSynthesis.cancel()
    setStatus('idle')
    setCurrentStep(0)
    setError('')
  }, [text, normalizedRates, speechSupported, lang])

  function pickVoice(allVoices: SpeechSynthesisVoice[], targetLang: string) {
    const prefixes = LANG_PREFIX_MAP[targetLang] || [targetLang]

    for (const prefix of prefixes) {
      const found = allVoices.find((v) =>
        v.lang.toLowerCase().startsWith(prefix.toLowerCase())
      )
      if (found) return found
    }

    const englishFallback = allVoices.find((v) =>
      v.lang.toLowerCase().startsWith('en')
    )
    return englishFallback || allVoices[0] || null
  }

  function getSelectedVoice() {
    if (!voices.length) return null
    return voices.find((v) => v.name === voiceName) || pickVoice(voices, lang)
  }

  function getSpeechLang() {
    const prefixes = LANG_PREFIX_MAP[lang]
    return prefixes?.[0] || 'en-US'
  }

  function speakStep(stepIndex: number) {
    if (!speechSupported) {
      setError('当前浏览器不支持语音播放。')
      return
    }

    if (!text.trim()) {
      setError('没有可播放的文本。')
      return
    }

    const utter = new SpeechSynthesisUtterance(text)
    utter.lang = getSpeechLang()
    utter.rate = normalizedRates[stepIndex] || 1
    utter.pitch = 1
    utter.volume = 1

    const selectedVoice = getSelectedVoice()
    if (selectedVoice) utter.voice = selectedVoice

    utter.onstart = () => {
      setStatus('playing')
      setCurrentStep(stepIndex + 1)
    }

    utter.onend = () => {
      const nextStep = stepIndex + 1
      if (nextStep < normalizedRates.length) {
        setTimeout(() => speakStep(nextStep), 300)
      } else {
        setStatus('done')
        onComplete?.()
      }
    }

    utter.onerror = () => {
      setError('语音播放失败，请检查浏览器语音权限或切换语音后重试。')
      setStatus('idle')
    }

    window.speechSynthesis.speak(utter)
  }

  function handleStart() {
    if (!speechSupported) {
      setError('当前浏览器不支持语音播放。')
      return
    }

    if (!text.trim()) {
      setError('没有可播放的文本。')
      return
    }

    window.speechSynthesis.cancel()
    setCurrentStep(0)
    setError('')
    speakStep(0)
  }

  function handlePause() {
    if (!speechSupported || status !== 'playing') return
    window.speechSynthesis.pause()
    setStatus('paused')
  }

  function handleResume() {
    if (!speechSupported || status !== 'paused') return
    window.speechSynthesis.resume()
    setStatus('playing')
  }

  function handleStop() {
    if (!speechSupported) return
    window.speechSynthesis.cancel()
    setStatus('idle')
    setCurrentStep(0)
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border bg-gray-50 p-4">
        <div className="text-sm text-gray-500">当前跟读文本</div>
        <div className="mt-2 text-lg font-medium leading-8">{text || '暂无文本'}</div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border bg-white p-4">
          <div className="text-sm text-gray-500">训练进度</div>
          <div className="mt-2 text-base font-medium">
            第 {currentStep} / {normalizedRates.length} 次
          </div>

          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-black transition-all"
              style={{
                width: `${(currentStep / Math.max(normalizedRates.length, 1)) * 100}%`,
              }}
            />
          </div>

          <div className="mt-3 text-sm text-gray-600">
            状态：
            {status === 'idle' && '未开始'}
            {status === 'playing' && '播放中'}
            {status === 'paused' && '已暂停'}
            {status === 'done' && '已完成'}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-4">
          <div className="text-sm text-gray-500">速度安排</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {normalizedRates.map((rate, index) => (
              <span
                key={`${rate}-${index}`}
                className="rounded-full border bg-gray-50 px-3 py-1 text-xs"
              >
                第{index + 1}次：{rate}x
              </span>
            ))}
          </div>

          <div className="mt-4">
            <label className="mb-2 block text-sm font-medium">语音</label>
            <select
              value={voiceName}
              onChange={(e) => setVoiceName(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 text-sm"
              disabled={!voices.length}
            >
              {voices.length ? (
                voices.map((voice, index) => (
                  <option
                    key={`${voice.name}-${voice.lang}-${index}`}
                    value={voice.name}
                  >
                    {voice.name} ({voice.lang})
                  </option>
                ))
              ) : (
                <option value="">暂无可用语音</option>
              )}
            </select>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleStart}
          disabled={!speechSupported || !text.trim()}
          className="rounded-2xl bg-black px-5 py-3 text-sm font-medium text-white disabled:opacity-50"
        >
          开始
        </button>

        <button
          onClick={handlePause}
          disabled={status !== 'playing'}
          className="rounded-2xl border px-5 py-3 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
        >
          暂停
        </button>

        <button
          onClick={handleResume}
          disabled={status !== 'paused'}
          className="rounded-2xl border px-5 py-3 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
        >
          继续
        </button>

        <button
          onClick={handleStop}
          className="rounded-2xl border px-5 py-3 text-sm font-medium hover:bg-gray-50"
        >
          停止
        </button>
      </div>
    </div>
  )
}