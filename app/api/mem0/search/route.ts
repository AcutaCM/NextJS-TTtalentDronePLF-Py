import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { query, userId, topK = 5, baseUrl, apiKey } = await req.json()

    const MEM0_BASE = baseUrl || process.env.MEM0_BASE_URL || 'https://api.mem0.ai/v1'
    const MEM0_KEY = apiKey || process.env.MEM0_API_KEY

    if (!MEM0_KEY) {
      return NextResponse.json({ error: 'MEM0_API_KEY not configured' }, { status: 400 })
    }
    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'query is required' }, { status: 400 })
    }

    // Generic mem0 search endpoint (adjust to actual API if needed)
    const resp = await fetch(`${MEM0_BASE.replace(/\/$/, '')}/memories/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${MEM0_KEY}`,
      },
      body: JSON.stringify({ query, user_id: userId || 'default', top_k: topK }),
    })

    const data = await resp.json().catch(() => ({}))
    if (!resp.ok) {
      return NextResponse.json({ error: data?.error || 'mem0 search failed' }, { status: 502 })
    }

    return NextResponse.json({ ok: true, results: data?.results || data || [] })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'server error' }, { status: 500 })
  }
}

