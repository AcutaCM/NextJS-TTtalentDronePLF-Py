import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { text, userId, baseUrl, apiKey, metadata } = await req.json()

    const MEM0_BASE = baseUrl || process.env.MEM0_BASE_URL || 'https://api.mem0.ai/v1'
    const MEM0_KEY = apiKey || process.env.MEM0_API_KEY

    if (!MEM0_KEY) {
      return NextResponse.json({ error: 'MEM0_API_KEY not configured' }, { status: 400 })
    }
    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'text is required' }, { status: 400 })
    }

    // Generic mem0 add endpoint (adjust to actual API schema if needed)
    const resp = await fetch(`${MEM0_BASE.replace(/\/$/, '')}/memories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${MEM0_KEY}`,
      },
      body: JSON.stringify({ text, user_id: userId || 'default', metadata: metadata || {} }),
    })

    const data = await resp.json().catch(() => ({}))
    if (!resp.ok) {
      return NextResponse.json({ error: data?.error || 'mem0 add failed' }, { status: 502 })
    }

    return NextResponse.json({ ok: true, data })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'server error' }, { status: 500 })
  }
}

