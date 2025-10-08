import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { id, text, metadata, baseUrl, apiKey } = await req.json()
    const MEM0_BASE = baseUrl || process.env.MEM0_BASE_URL || 'https://api.mem0.ai/v1'
    const MEM0_KEY = apiKey || process.env.MEM0_API_KEY

    if (!MEM0_KEY) return NextResponse.json({ error: 'MEM0_API_KEY not configured' }, { status: 400 })
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const body: any = {}
    if (typeof text === 'string') body.text = text
    if (metadata) body.metadata = metadata

    const resp = await fetch(`${MEM0_BASE.replace(/\/$/, '')}/memories/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${MEM0_KEY}` },
      body: JSON.stringify(body),
    })

    const data = await resp.json().catch(() => ({}))
    if (!resp.ok) {
      return NextResponse.json({ error: data?.error || 'mem0 update failed' }, { status: 502 })
    }
    return NextResponse.json({ ok: true, data })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'server error' }, { status: 500 })
  }
}

