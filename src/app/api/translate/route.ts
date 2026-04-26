import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import OpenAI from 'openai'
import crypto from 'crypto'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const LANGUAGE_NAME_MAP: Record<string, string> = {
  en: 'English',
  zh: 'Chinese',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  pt: 'Portuguese',
  ru: 'Russian',
  ja: 'Japanese',
  ko: 'Korean',
  hi: 'Hindi',
  ar: 'Arabic',
  id: 'Indonesian',
  vi: 'Vietnamese',
  th: 'Thai',
  fil: 'Filipino',
  tr: 'Turkish',
  it: 'Italian',
  nl: 'Dutch',
  pl: 'Polish',
  uk: 'Ukrainian',
  sw: 'Swahili',
  ms: 'Malay',
  bn: 'Bengali',
  ur: 'Urdu',
  ta: 'Tamil',
  te: 'Telugu',
  mr: 'Marathi',
  pa: 'Punjabi',
  fa: 'Persian',
  he: 'Hebrew',
  ro: 'Romanian',
  el: 'Greek',
  cs: 'Czech',
  hu: 'Hungarian',
  sv: 'Swedish',
  da: 'Danish',
  fi: 'Finnish',
  no: 'Norwegian',
  sk: 'Slovak',
  bg: 'Bulgarian',
  ca: 'Catalan',
  hr: 'Croatian',
  sr: 'Serbian',
  sl: 'Slovenian',
  lt: 'Lithuanian',
  lv: 'Latvian',
  et: 'Estonian',
  mk: 'Macedonian',
  ka: 'Georgian',
  sq: 'Albanian',
}

const ALLOWED_SOURCE_LANGS = new Set([
  'en', 'zh', 'es', 'fr', 'de', 'pt', 'ru', 'ja', 'ko', 'hi',
  'ar', 'id', 'vi', 'th', 'fil', 'tr', 'it', 'nl', 'pl', 'uk',
  'sw', 'ms', 'bn', 'ur', 'ta', 'te', 'mr', 'pa', 'fa', 'he',
  'ro', 'el', 'cs', 'hu', 'sv', 'da', 'fi', 'no', 'sk', 'bg',
  'ca', 'hr', 'sr', 'sl', 'lt', 'lv', 'et', 'mk', 'ka', 'sq',
])

const ALLOWED_TARGET_LANGS = new Set([
  'zh', 'en', 'ja', 'ko', 'es', 'fr', 'de', 'pt', 'ru', 'ar',
  'hi', 'id', 'vi', 'th', 'fil', 'sw', 'tr', 'it', 'ms', 'nl',
])

const GUEST_ID_COOKIE = 'sl_guest_id'
const GUEST_FULL_USED_COOKIE = 'sl_guest_full_used'
const GUEST_COOKIE_MAX_AGE = 60 * 60 * 24 * 30
const GUEST_LOOKBACK_DAYS = 30

const FREE_DAILY_DEFAULT_QUOTA = 1
const TRIAL_DAILY_QUOTA = 3
const MAX_INPUT_LENGTH = 500

type TranslateResult = {
  basic: string
  natural?: string
  native?: string
  keywords: string[]
  pinyin: string
}

type UsagePayload = {
  today_full_translate_count?: number
  remaining_full_translate_count?: number | 'unlimited'
  guest_full_translate_used?: number
  guest_full_translate_limit?: number
  guest_remaining_full_translate_count?: number
}

type PaywallPayload = {
  title: string
  message: string
  cta: string
} | null

function getLanguageName(code: string) {
  return LANGUAGE_NAME_MAP[code] || code
}

function normalizeText(input: unknown) {
  if (typeof input !== 'string') return ''
  return input.trim().replace(/\s+/g, ' ')
}

function safeJsonParse(content: string) {
  try {
    return JSON.parse(content)
  } catch {
    return {}
  }
}

function hashText(input: string) {
  return crypto.createHash('sha256').update(input).digest('hex')
}

function getClientIp(req: NextRequest) {
  const forwardedFor = req.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || 'unknown'
  }
  return req.headers.get('x-real-ip') || 'unknown'
}

function getLookbackIso(days: number) {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString()
}

function getTodayRange() {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)

  return {
    start: todayStart.toISOString(),
    end: todayEnd.toISOString(),
  }
}

function isTrialActive(profile: {
  is_vip?: boolean | null
  trial_ends_at?: string | null
  plan_type?: string | null
}) {
  if (profile.is_vip) return false
  if (profile.plan_type !== 'trial') return false
  if (!profile.trial_ends_at) return false
  return new Date(profile.trial_ends_at).getTime() > Date.now()
}

function buildGuestPaywall(): PaywallPayload {
  return {
    title: '游客试用已用完',
    message: '注册可领取 7 天试用期，保存训练记录，并继续跟读与挑战。',
    cta: '注册领取 7 天试用',
  }
}

function buildFreePaywall(): PaywallPayload {
  return {
    title: '今日完整训练已用完',
    message: '注册试用或升级 VIP 后，可继续完整训练、固定节奏跟读和关键词挑战。',
    cta: '升级 VIP',
  }
}

async function getOrCreateGuestId(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  let guestId = cookieStore.get(GUEST_ID_COOKIE)?.value
  if (!guestId) {
    guestId = crypto.randomUUID()
  }
  return guestId
}

async function generateTranslation(params: {
  text: string
  sourceLang: string
  targetLang: string
  fullMode: boolean
}): Promise<TranslateResult> {
  const { text, sourceLang, targetLang, fullMode } = params
  const sourceLangName = getLanguageName(sourceLang)
  const targetLangName = getLanguageName(targetLang)
  const shouldReturnPinyin = targetLang === 'zh'

  const prompt = fullMode
    ? `
你是一个语言学习产品里的表达教练。

任务：
把用户输入的原句，从 ${sourceLangName} 转成适合学习与口语训练的 ${targetLangName} 表达。

请严格返回 JSON：
{
  "basic": "...",
  "natural": "...",
  "native": "...",
  "keywords": ["...", "..."],
  "pinyin": "..."
}

要求：
1. basic：最易学、最直接，适合初学者
2. natural：更自然、更接近日常交流
3. native：更像熟练使用者会说的话，但不要太难
4. keywords：从目标语结果中提取 3-6 个高频关键词或核心短语
5. pinyin：只有当目标语是 Chinese 时才返回拼音；否则返回空字符串
6. 输出必须是目标语，不要解释，不要加额外文本

原始语言：${sourceLangName}
目标语言：${targetLangName}
原句：${text}
目标语是否需要拼音：${shouldReturnPinyin ? 'yes' : 'no'}
`
    : `
你是一个语言学习产品里的表达教练。

任务：
把用户输入的原句，从 ${sourceLangName} 转成适合基础训练的 ${targetLangName} 表达。

请严格返回 JSON：
{
  "basic": "...",
  "keywords": ["...", "..."],
  "pinyin": "..."
}

要求：
1. basic：最易学、最直接，适合初学者
2. keywords：从目标语结果中提取 3-6 个高频关键词或核心短语
3. pinyin：只有当目标语是 Chinese 时才返回拼音；否则返回空字符串
4. 输出必须是目标语，不要解释，不要加额外文本

原始语言：${sourceLangName}
目标语言：${targetLangName}
原句：${text}
目标语是否需要拼音：${shouldReturnPinyin ? 'yes' : 'no'}
`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.4,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: '你是一个严谨的语言学习助手，只返回 JSON。',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
  })

  const content = completion.choices[0]?.message?.content || '{}'
  const parsed = safeJsonParse(content)

  return {
    basic: typeof parsed.basic === 'string' ? parsed.basic : '',
    natural: typeof parsed.natural === 'string' ? parsed.natural : '',
    native: typeof parsed.native === 'string' ? parsed.native : '',
    keywords: Array.isArray(parsed.keywords)
      ? parsed.keywords.filter((item: unknown) => typeof item === 'string').slice(0, 6)
      : [],
    pinyin: typeof parsed.pinyin === 'string' ? parsed.pinyin : '',
  }
}

function createJsonResponse(params: {
  authenticated: boolean
  plan: string
  source: 'guest' | 'free' | 'vip'
  mode: 'full' | 'limited'
  result?: TranslateResult
  usage: UsagePayload
  paywall: PaywallPayload
}) {
  const { authenticated, plan, source, mode, result, usage, paywall } = params

  return NextResponse.json({
    authenticated,
    plan,
    source,
    mode,
    basic: result?.basic || '',
    natural: mode === 'full' ? result?.natural || '' : '',
    native: mode === 'full' ? result?.native || '' : '',
    keywords: result?.keywords || [],
    pinyin: result?.pinyin || '',
    usage,
    paywall,
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const text = normalizeText(body?.text)
    const sourceLang = typeof body?.sourceLang === 'string' ? body.sourceLang.trim() : 'en'
    const targetLang = typeof body?.targetLang === 'string' ? body.targetLang.trim() : 'zh'

    if (!text) {
      return NextResponse.json({ error: '请输入内容' }, { status: 400 })
    }

    if (text.length > MAX_INPUT_LENGTH) {
      return NextResponse.json(
        { error: `输入内容过长，请控制在 ${MAX_INPUT_LENGTH} 个字符以内` },
        { status: 400 }
      )
    }

    if (!ALLOWED_SOURCE_LANGS.has(sourceLang)) {
      return NextResponse.json({ error: '不支持的原始语言' }, { status: 400 })
    }

    if (!ALLOWED_TARGET_LANGS.has(targetLang)) {
      return NextResponse.json({ error: '不支持的目标语言' }, { status: 400 })
    }

    const supabase = await createClient()
    const admin = createAdminClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const cookieStore = await cookies()

    // -------------------------
    // Guest
    // -------------------------
    if (!user) {
      const guestId = await getOrCreateGuestId(cookieStore)
      const guestFullUsedByCookie = cookieStore.get(GUEST_FULL_USED_COOKIE)?.value === '1'

      const ipHash = hashText(getClientIp(req))
      const userAgentHash = hashText(req.headers.get('user-agent') || 'unknown')
      const sourceTextHash = hashText(text)
      const sinceIso = getLookbackIso(GUEST_LOOKBACK_DAYS)

      let guestUsedByDb = false

      const { count: guestIdCount } = await admin
        .from('guest_usage_logs')
        .select('*', { count: 'exact', head: true })
        .eq('action_type', 'guest_full_translate')
        .eq('guest_id', guestId)
        .gte('created_at', sinceIso)

      const { count: deviceCount } = await admin
        .from('guest_usage_logs')
        .select('*', { count: 'exact', head: true })
        .eq('action_type', 'guest_full_translate')
        .eq('ip_hash', ipHash)
        .eq('user_agent_hash', userAgentHash)
        .gte('created_at', sinceIso)

      if ((guestIdCount || 0) > 0 || (deviceCount || 0) > 0) {
        guestUsedByDb = true
      }

      if (guestFullUsedByCookie || guestUsedByDb) {
        const response = createJsonResponse({
          authenticated: false,
          plan: 'guest',
          source: 'guest',
          mode: 'limited',
          usage: {
            guest_full_translate_used: 1,
            guest_full_translate_limit: 1,
            guest_remaining_full_translate_count: 0,
          },
          paywall: buildGuestPaywall(),
        })

        response.cookies.set(GUEST_ID_COOKIE, guestId, {
          httpOnly: true,
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
          path: '/',
          maxAge: GUEST_COOKIE_MAX_AGE,
        })

        response.cookies.set(GUEST_FULL_USED_COOKIE, '1', {
          httpOnly: true,
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
          path: '/',
          maxAge: GUEST_COOKIE_MAX_AGE,
        })

        return response
      }

      const full = await generateTranslation({
        text,
        sourceLang,
        targetLang,
        fullMode: true,
      })

      const response = createJsonResponse({
        authenticated: false,
        plan: 'guest',
        source: 'guest',
        mode: 'full',
        result: full,
        usage: {
          guest_full_translate_used: 1,
          guest_full_translate_limit: 1,
          guest_remaining_full_translate_count: 0,
        },
        paywall: null,
      })

      await admin.from('guest_usage_logs').insert({
        guest_id: guestId,
        ip_hash: ipHash,
        user_agent_hash: userAgentHash,
        action_type: 'guest_full_translate',
        source_text_hash: sourceTextHash,
      })

      response.cookies.set(GUEST_ID_COOKIE, guestId, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: GUEST_COOKIE_MAX_AGE,
      })

      response.cookies.set(GUEST_FULL_USED_COOKIE, '1', {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: GUEST_COOKIE_MAX_AGE,
      })

      return response
    }

    // -------------------------
    // Logged user
    // -------------------------
    const { data: dbUser, error: userError } = await supabase
      .from('users')
      .select(
        'id, email, is_vip, vip_expires_at, plan_type, daily_quota, trial_started_at, trial_ends_at'
      )
      .eq('id', user.id)
      .single()

    if (userError || !dbUser) {
      return NextResponse.json({ error: '用户信息不存在' }, { status: 404 })
    }

    const vip = !!dbUser.is_vip
    const trialActive = isTrialActive(dbUser)
    const dailyQuota = Number.isFinite(dbUser.daily_quota)
      ? Math.max(Number(dbUser.daily_quota), 0)
      : FREE_DAILY_DEFAULT_QUOTA
    const effectiveQuota = vip ? Infinity : trialActive ? TRIAL_DAILY_QUOTA : dailyQuota

    const { start, end } = getTodayRange()

    const { count: todayCount, error: usageError } = await supabase
      .from('usage_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('action_type', 'full_translate')
      .gte('created_at', start)
      .lte('created_at', end)

    if (usageError) {
      return NextResponse.json({ error: '使用记录读取失败' }, { status: 500 })
    }

    const usedCount = todayCount || 0

    if (vip) {
      const full = await generateTranslation({
        text,
        sourceLang,
        targetLang,
        fullMode: true,
      })

      return createJsonResponse({
        authenticated: true,
        plan: dbUser.plan_type || 'vip',
        source: 'vip',
        mode: 'full',
        result: full,
        usage: {
          today_full_translate_count: usedCount,
          remaining_full_translate_count: 'unlimited',
        },
        paywall: null,
      })
    }

    if (usedCount < effectiveQuota) {
      const full = await generateTranslation({
        text,
        sourceLang,
        targetLang,
        fullMode: true,
      })

      const { error: insertError } = await supabase.from('usage_logs').insert({
        user_id: user.id,
        action_type: 'full_translate',
      })

      if (insertError) {
        return NextResponse.json({ error: '写入使用记录失败' }, { status: 500 })
      }

      return createJsonResponse({
        authenticated: true,
        plan: trialActive ? 'trial' : dbUser.plan_type || 'free',
        source: trialActive ? 'free' : 'free',
        mode: 'full',
        result: full,
        usage: {
          today_full_translate_count: usedCount + 1,
          remaining_full_translate_count:
            effectiveQuota === Infinity ? 'unlimited' : Math.max(effectiveQuota - usedCount - 1, 0),
        },
        paywall: null,
      })
    }

    const limited = await generateTranslation({
      text,
      sourceLang,
      targetLang,
      fullMode: false,
    })

    return createJsonResponse({
      authenticated: true,
      plan: trialActive ? 'trial' : dbUser.plan_type || 'free',
      source: 'free',
      mode: 'limited',
      result: limited,
      usage: {
        today_full_translate_count: usedCount,
        remaining_full_translate_count: 0,
      },
      paywall: buildFreePaywall(),
    })
  } catch (error) {
    console.error('translate error:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}