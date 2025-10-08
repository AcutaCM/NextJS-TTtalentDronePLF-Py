import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { userId, baseUrl, apiKey, limit = 20, cursor } = await req.json()

    const MEM0_BASE = baseUrl || process.env.MEM0_BASE_URL || 'https://api.mem0.ai/v1'
    const MEM0_KEY = apiKey || process.env.MEM0_API_KEY

    if (!MEM0_KEY) {
      return NextResponse.json({ error: 'MEM0_API_KEY not configured' }, { status: 400 })
    }

    const qs = new URLSearchParams()
    if (userId) qs.set('user_id', userId)
    if (limit) qs.set('limit', String(limit))
    if (cursor) qs.set('cursor', String(cursor))

    const url = `${MEM0_BASE.replace(/\/$/, '')}/memories?${qs.toString()}`
    const resp = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${MEM0_KEY}` },
    })

    const data = await resp.json().catch(() => ({}))
    if (!resp.ok) {
      return NextResponse.json({ error: data?.error || 'mem0 list failed' }, { status: 502 })
    }

    return NextResponse.json({ ok: true, data })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'server error' }, { status: 500 })
  }
}

