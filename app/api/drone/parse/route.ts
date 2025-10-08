import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const res = await fetch("http://127.0.0.1:3004/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const ct = res.headers.get("content-type") || "application/json; charset=utf-8";
    const text = await res.text();
    return new NextResponse(text, { status: res.status, headers: { "Content-Type": ct } });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}