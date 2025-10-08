import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { id, baseUrl, apiKey } = await req.json()
    const MEM0_BASE = baseUrl || process.env.MEM0_BASE_URL || 'https://api.mem0.ai/v1'
    const MEM0_KEY = apiKey || process.env.MEM0_API_KEY

    if (!MEM0_KEY) return NextResponse.json({ error: 'MEM0_API_KEY not configured' }, { status: 400 })
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const resp = await fetch(`${MEM0_BASE.replace(/\/$/, '')}/memories/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${MEM0_KEY}` },
    })

    if (!resp.ok) {
      const data = await resp.json().catch(() => ({}))
      return NextResponse.json({ error: data?.error || 'mem0 delete failed' }, { status: 502 })
    }
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'server error' }, { status: 500 })
  }
}

