'use client'

type SpeakButtonProps = {
  text: string
  label?: string
  lang?: string
  rate?: number
  className?: string
}

function guessLang(text: string, fallback = 'en-US') {
  if (/[\u4e00-\u9fff]/.test(text)) return 'zh-CN'
  if (/[\u3040-\u30ff]/.test(text)) return 'ja-JP'
  if (/[\uac00-\ud7af]/.test(text)) return 'ko-KR'
  if (/[\u0600-\u06ff]/.test(text)) return 'ar-SA'
  return fallback
}

export default function SpeakButton({
  text,
  label = '播放',
  lang,
  rate = 0.9,
  className,
}: SpeakButtonProps) {
  function speak() {
    const value = text?.trim()

    if (!value) {
      alert('没有可播放的文本')
      return
    }

    if (typeof window === 'undefined' || !window.speechSynthesis) {
      alert('当前浏览器不支持发音功能')
      return
    }

    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(value)
    utterance.lang = lang || guessLang(value)
    utterance.rate = rate
    utterance.pitch = 1
    utterance.volume = 1

    window.speechSynthesis.speak(utterance)
  }

  return (
    <button
      type="button"
      onClick={speak}
      className={
        className ||
        'btn-secondary px-4 py-2 text-sm'
      }
    >
      {label}
    </button>
  )
}