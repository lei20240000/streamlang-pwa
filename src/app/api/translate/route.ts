import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function getUserRegion(lang: string) {
  const l = (lang || '').toLowerCase()

  if (l.includes('zh')) return 'CN'
  if (l.includes('hi')) return 'IN'
  if (l.includes('id')) return 'ID'
  if (l.includes('vi')) return 'VN'
  if (l.includes('th')) return 'TH'
  if (l.includes('tl') || l.includes('fil')) return 'PH'
  if (l.includes('ja')) return 'JP'
  if (l.includes('ko')) return 'KR'

  return 'OTHER'
}

function getPromptByRegion(region: string, text: string) {
  switch (region) {
    case 'IN':
      return `तुम एक चीनी भाषा शिक्षक हो। इस वाक्य को सीखने के लिए आउटपुट करो (JSON में):
{
"basic":"",
"natural":"",
"native":"",
"keywords":[],
"pinyin":""
}
वाक्य: ${text}`

    case 'ID':
      return `Anda adalah guru bahasa Mandarin. Tolong hasilkan:
{
"basic":"",
"natural":"",
"native":"",
"keywords":[],
"pinyin":""
}
Kalimat: ${text}`

    case 'VN':
      return `Bạn là giáo viên tiếng Trung. Hãy trả về JSON:
{
"basic":"",
"natural":"",
"native":"",
"keywords":[],
"pinyin":""
}
Câu: ${text}`

    case 'TH':
      return `คุณคือครูภาษาจีน โปรดตอบ JSON:
{
"basic":"",
"natural":"",
"native":"",
"keywords":[],
"pinyin":""
}
ประโยค: ${text}`

    case 'PH':
      return `You are a Chinese teacher. Output JSON:
{
"basic":"",
"natural":"",
"native":"",
"keywords":[],
"pinyin":""
}
Sentence: ${text}`

    case 'JP':
      return `あなたは中国語の先生です。JSON形式で：
{
"basic":"",
"natural":"",
"native":"",
"keywords":[],
"pinyin":""
}
文：${text}`

    case 'KR':
      return `당신은 중국어 선생님입니다. JSON 출력:
{
"basic":"",
"natural":"",
"native":"",
"keywords":[],
"pinyin":""
}
문장: ${text}`

    default:
      return `You are a Chinese teacher. Output STRICT JSON:
{
"basic":"",
"natural":"",
"native":"",
"keywords":[],
"pinyin":""
}
Sentence: ${text}`
  }
}

function getTodayRange() {
  const now = new Date()

  const start = new Date(now)
  start.setHours(0, 0, 0, 0)

  const end = new Date(now)
  end.setHours(23, 59, 59, 999)

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  }
}

async function getTodayFullTranslateCount(userId: string) {
  const supabase = await createClient()
  const { start, end } = getTodayRange()

  const { count, error } = await supabase
    .from('usage_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('action_type', 'full_translate')
    .gte('created_at', start)
    .lte('created_at', end)

  if (error) {
    throw error
  }

  return count ?? 0
}

async function callQwen(prompt: string) {
  const res = await fetch(
    'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.QWEN_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'qwen3.5-flash',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    }
  )

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data?.message || 'Qwen 调用失败')
  }

  return data?.choices?.[0]?.message?.content || ''
}

async function callOpenAI(prompt: string) {
  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      input: prompt,
    }),
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data?.error?.message || 'OpenAI 调用失败')
  }

  return data?.output?.[0]?.content?.[0]?.text || data?.output_text || ''
}

function safeJsonParse(raw: string) {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function buildFullPrompt(text: string, lang: string) {
  const region = getUserRegion(lang)
  const regionPrompt = getPromptByRegion(region, text)

  return `
${regionPrompt}

You are a professional Chinese teacher.

You MUST return ONLY valid JSON.
No explanation, no markdown.

Format:
{
  "basic": "simple Chinese",
  "natural": "natural Chinese",
  "native": "native Chinese",
  "keywords": ["word1","word2","word3"],
  "pinyin": "pinyin"
}
`.trim()
}

function buildBasicOnlyPrompt(text: string, lang: string) {
  const region = getUserRegion(lang)

  switch (region) {
    case 'IN':
      return `तुम एक चीनी भाषा शिक्षक हो। केवल JSON लौटाओ:
{
"basic":"",
"keywords":[],
"pinyin":""
}
वाक्य: ${text}`

    case 'ID':
      return `Anda adalah guru bahasa Mandarin. Hanya keluarkan JSON:
{
"basic":"",
"keywords":[],
"pinyin":""
}
Kalimat: ${text}`

    case 'VN':
      return `Bạn là giáo viên tiếng Trung. Chỉ trả về JSON:
{
"basic":"",
"keywords":[],
"pinyin":""
}
Câu: ${text}`

    case 'TH':
      return `คุณคือครูภาษาจีน โปรดตอบเฉพาะ JSON:
{
"basic":"",
"keywords":[],
"pinyin":""
}
ประโยค: ${text}`

    case 'JP':
      return `あなたは中国語の先生です。JSONのみ返してください:
{
"basic":"",
"keywords":[],
"pinyin":""
}
文：${text}`

    case 'KR':
      return `당신은 중국어 선생님입니다. JSON만 출력하세요:
{
"basic":"",
"keywords":[],
"pinyin":""
}
문장: ${text}`

    default:
      return `You are a Chinese teacher.

Return ONLY valid JSON:
{
  "basic": "",
  "keywords": [],
  "pinyin": ""
}

Sentence: ${text}`
  }
}

function normalizeFullResult(parsed: any) {
  return {
    basic: typeof parsed?.basic === 'string' ? parsed.basic : '',
    natural: typeof parsed?.natural === 'string' ? parsed.natural : '',
    native: typeof parsed?.native === 'string' ? parsed.native : '',
    keywords: Array.isArray(parsed?.keywords) ? parsed.keywords : [],
    pinyin: typeof parsed?.pinyin === 'string' ? parsed.pinyin : '',
  }
}

function normalizeBasicResult(parsed: any) {
  return {
    basic: typeof parsed?.basic === 'string' ? parsed.basic : '',
    keywords: Array.isArray(parsed?.keywords) ? parsed.keywords : [],
    pinyin: typeof parsed?.pinyin === 'string' ? parsed.pinyin : '',
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json(
        { error: '请先登录后再使用' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const text = body?.text?.trim?.() || ''
    const lang = body?.lang || ''

    if (!text) {
      return NextResponse.json({ error: '请输入文本' }, { status: 400 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('id, email, is_vip, vip_expires_at, plan_type, daily_quota')
      .eq('id', authUser.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: '用户资料不存在，请重新登录' },
        { status: 404 }
      )
    }

    const todayCount = await getTodayFullTranslateCount(authUser.id)
    const isVip = !!profile.is_vip
    const dailyQuota = Number(profile.daily_quota ?? 3)
    const remainingBefore = isVip ? Infinity : Math.max(dailyQuota - todayCount, 0)

    const useQwen = false

    // ===== 免费额度内 or VIP：完整输出 =====
    if (isVip || remainingBefore > 0) {
      const fullPrompt = buildFullPrompt(text, lang)
      const raw = useQwen
        ? await callQwen(fullPrompt)
        : await callOpenAI(fullPrompt)

      const parsed = safeJsonParse(raw)

      if (!parsed) {
        return NextResponse.json(
          { error: '模型返回非JSON', raw },
          { status: 500 }
        )
      }

      const result = normalizeFullResult(parsed)

      const { error: logError } = await supabase.from('usage_logs').insert({
        user_id: authUser.id,
        action_type: 'full_translate',
      })

      if (logError) {
        return NextResponse.json(
          { error: '额度日志写入失败', detail: logError.message },
          { status: 500 }
        )
      }

      const remainingAfter = isVip
        ? 'unlimited'
        : Math.max(dailyQuota - (todayCount + 1), 0)

      return NextResponse.json({
        mode: 'full',
        data: result,
        usage: {
          today_full_translate_count: todayCount + 1,
          remaining_full_translate_count: remainingAfter,
        },
        paywall: remainingAfter === 0 && !isVip
          ? {
              show: true,
              title: '今日完整训练次数已用完',
              message: '升级 VIP，继续使用 natural/native 表达、关键词强化和影子跟读。',
            }
          : remainingAfter === 1 && !isVip
            ? {
                show: true,
                title: '你今天还剩 1 次完整训练',
                message: '升级 VIP 可无限使用完整翻译、关键词强化和影子跟读。',
              }
            : null,
      })
    }

    // ===== 免费额度已用完：仅返回 basic =====
    const basicPrompt = buildBasicOnlyPrompt(text, lang)
    const raw = useQwen
      ? await callQwen(basicPrompt)
      : await callOpenAI(basicPrompt)

    const parsed = safeJsonParse(raw)

    if (!parsed) {
      return NextResponse.json(
        { error: '模型返回非JSON', raw },
        { status: 500 }
      )
    }

    const basicResult = normalizeBasicResult(parsed)

    return NextResponse.json({
      mode: 'limited',
      data: basicResult,
      usage: {
        today_full_translate_count: todayCount,
        remaining_full_translate_count: 0,
      },
      paywall: {
        show: true,
        title: '今日完整训练次数已用完',
        message: '升级 VIP，继续使用 natural/native 表达、关键词强化和影子跟读。',
      },
    })
  } catch (e: any) {
    return NextResponse.json(
      {
        error: 'API调用失败',
        detail: e?.message || 'unknown error',
      },
      { status: 500 }
    )
  }
}