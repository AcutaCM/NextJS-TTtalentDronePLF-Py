#!/usr/bin/env node
// Downloads SVG icons from Figma Images API and saves them into public/images
// Usage:
//   1) Create .env.local in project root with:
//        FIGMA_TOKEN=your_personal_access_token
//        FIGMA_FILE_KEY=8lI7Fm3AIcLQKSctPlBImE
//   2) npm run figma:pull

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

// Minimal .env.local loader (no external deps)
async function loadDotEnvLocal() {
  try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    const raw = await fs.readFile(envPath, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      if (!line || line.trim().startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      let val = line.slice(eq + 1);
      // Strip optional quotes
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = val;
    }
  } catch (e) {
    // .env.local is optional
  }
}

await loadDotEnvLocal();

const FIGMA_TOKEN = process.env.FIGMA_TOKEN;
const FILE_KEY = process.env.FIGMA_FILE_KEY || '8lI7Fm3AIcLQKSctPlBImE';

if (!FIGMA_TOKEN) {
  console.error('[figma:pull] Missing FIGMA_TOKEN. Please set it in .env.local');
  process.exit(1);
}

const OUTPUT_DIR = path.resolve(process.cwd(), 'public', 'images');

const nodes = [
  { id: '72:50', filename: 'settings.svg' },
  { id: '72:53', filename: 'bell.svg' },
  { id: '72:45', filename: 'user.svg' },
  { id: '79:161', filename: 'fullscreen.svg' },
  { id: '79:179', filename: 'camera.svg' },
  { id: '94:980', filename: 'help-circle.svg' },
];

function buildImagesURL(fileKey, nodeIds, params = {}) {
  const base = `https://api.figma.com/v1/images/${encodeURIComponent(fileKey)}`;
  const idsParam = nodeIds.join(',');
  const search = new URLSearchParams({ ids: idsParam, format: 'svg', svg_include_id: 'true', ...params });
  return `${base}?${search.toString()}`;
}

async function fetchJSON(url, headers) {
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status} - ${res.statusText}: ${text}`);
  }
  return res.json();
}

async function fetchBinary(url) {
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Download failed ${res.status} - ${res.statusText}: ${text}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const url = buildImagesURL(FILE_KEY, nodes.map((n) => n.id));
  const data = await fetchJSON(url, { 'X-Figma-Token': FIGMA_TOKEN });

  if (!data || !data.images) {
    console.error('[figma:pull] Invalid response:', data);
    process.exit(1);
  }

  const results = [];
  for (const n of nodes) {
    const imageUrl = data.images[n.id];
    if (!imageUrl) {
      console.warn(`[figma:pull] No image url for node ${n.id} (${n.filename}). It may not be directly exportable.`);
      continue;
    }
    try {
      const bin = await fetchBinary(imageUrl);
      const outPath = path.join(OUTPUT_DIR, n.filename);
      await fs.writeFile(outPath, bin);
      results.push({ filename: n.filename, ok: true });
      console.log(`[figma:pull] Saved ${n.filename}`);
    } catch (e) {
      console.error(`[figma:pull] Failed to save ${n.filename}:`, e.message);
      results.push({ filename: n.filename, ok: false, error: e.message });
    }
  }

  const okCount = results.filter(r => r.ok).length;
  console.log(`\n[figma:pull] Done. ${okCount}/${nodes.length} files saved to ${OUTPUT_DIR}`);
}

main().catch((e) => {
  console.error('[figma:pull] Unhandled error:', e);
  process.exit(1);
});