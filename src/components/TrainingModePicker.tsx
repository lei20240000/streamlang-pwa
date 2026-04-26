'use client'

type Props = {
  canChallenge: boolean
  shadowingRounds: number
  isVip: boolean
  onChooseShadowing: () => void
  onChooseChallenge: () => void
}

export default function TrainingModePicker({
  canChallenge,
  shadowingRounds,
  isVip,
  onChooseShadowing,
  onChooseChallenge,
}: Props) {
  return (
    <div className="rounded-3xl border bg-white p-5 shadow-sm">
      <h3 className="text-lg font-semibold">选择训练方式</h3>
      <p className="mt-2 text-sm text-gray-600">
        一次只走一条训练路径，避免页面过重，也更适合持续练习。
      </p>

      {!isVip && !canChallenge ? (
        <div className="mt-4 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm text-gray-700">
          先完成 3 遍影子跟读，再解锁情景挑战。
          <div className="mt-2 font-medium">当前进度：{shadowingRounds}/3</div>
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <button
          onClick={onChooseShadowing}
          className="rounded-2xl border p-4 text-left transition hover:bg-gray-50"
        >
          <div className="font-medium">影子跟读</div>
          <div className="mt-1 text-sm text-gray-500">
            先模仿，再张嘴，训练节奏、发音和语感。
          </div>
        </button>

        <button
          onClick={onChooseChallenge}
          disabled={!canChallenge && !isVip}
          className="rounded-2xl border p-4 text-left transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <div className="font-medium">情景挑战</div>
          <div className="mt-1 text-sm text-gray-500">
            先自己改写，再看 AI 优化版、反馈和评分。
          </div>
        </button>
      </div>
    </div>
  )
}