import { NextRequest } from "next/server";

const TARGET = process.env.DIFY_BASE_URL || process.env.NEXT_PUBLIC_DIFY_URL || "http://localhost:3001";

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params;
  const url = new URL(req.url);
  const upstream = new URL(resolvedParams.path.join("/"), TARGET);
  upstream.search = url.search;

  const res = await fetch(upstream.toString(), {
    method: "GET",
    headers: forwardHeaders(req),
  });

  return createResponse(res);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params;
  const upstream = new URL(resolvedParams.path.join("/"), TARGET);
  const res = await fetch(upstream.toString(), {
    method: "POST",
    headers: forwardHeaders(req),
    body: req.body,
    duplex: "half",
  } as RequestInit & { duplex: string });
  return createResponse(res);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params;
  const upstream = new URL(resolvedParams.path.join("/"), TARGET);
  const res = await fetch(upstream.toString(), {
    method: "PUT",
    headers: forwardHeaders(req),
    body: req.body,
    duplex: "half",
  } as RequestInit & { duplex: string });
  return createResponse(res);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params;
  const upstream = new URL(resolvedParams.path.join("/"), TARGET);
  const res = await fetch(upstream.toString(), {
    method: "PATCH",
    headers: forwardHeaders(req),
    body: req.body,
    duplex: "half",
  } as RequestInit & { duplex: string });
  return createResponse(res);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params;
  const upstream = new URL(resolvedParams.path.join("/"), TARGET);
  const res = await fetch(upstream.toString(), {
    method: "DELETE",
    headers: forwardHeaders(req),
  });
  return createResponse(res);
}

function forwardHeaders(req: NextRequest): HeadersInit {
  const headers = new Headers(req.headers);
  headers.delete("host");
  headers.set("x-forwarded-by", "drone-analyzer-nextjs");
  return headers;
}

function createResponse(upstreamRes: Response) {
  const headers = new Headers(upstreamRes.headers);
  // 处理 CORS / CSP 可在此扩展
  return new Response(upstreamRes.body, {
    status: upstreamRes.status,
    headers,
  });
}