'use client'

import { useEffect, useRef, useState } from 'react'

type SpeakButtonProps = {
  text: string
  lang?: string
  className?: string
  label?: string
}

export default function SpeakButton({
  text,
  lang = 'en-US',
  className = '',
  label = '播放',
}: SpeakButtonProps) {
  const [speaking, setSpeaking] = useState(false)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel()
    }
  }, [])

  const handleSpeak = () => {
    if (!text?.trim()) return

    if (speaking) {
      window.speechSynthesis.cancel()
      setSpeaking(false)
      return
    }

    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = lang
    utterance.rate = 0.92
    utterance.pitch = 1
    utterance.volume = 1

    utterance.onstart = () => setSpeaking(true)
    utterance.onend = () => setSpeaking(false)
    utterance.onerror = () => setSpeaking(false)

    utteranceRef.current = utterance
    window.speechSynthesis.speak(utterance)
  }

  return (
    <button
      type="button"
      onClick={handleSpeak}
      className={
        className ||
        'rounded-full border-2 border-[#1f2430] bg-white px-4 py-2 text-sm font-semibold text-[#111827]'
      }
    >
      {speaking ? '停止' : label}
    </button>
  )
}