"use client";
import React, { useEffect, useMemo, useState } from 'react';
import { Button } from "@heroui/button";
import { Input, Textarea } from "@heroui/input";
import { Divider } from "@heroui/divider";

interface MemoryItem {
  id?: string;
  text?: string;
  content?: string;
  metadata?: any;
  created_at?: string;
}

const MemoryPanel: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<MemoryItem[]>([]);
  const [newText, setNewText] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const fetchList = async () => {
    setLoading(true);
    try {
      if (query.trim()) {
        const resp = await fetch('/api/mem0/search', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, topK: 20 })
        });
        const data = await resp.json();
        const results: any[] = data?.results || [];
        setItems(results);
      } else {
        const resp = await fetch('/api/mem0/list', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ limit: 50 })
        });
        const data = await resp.json();
        const arr: any[] = data?.data?.results || data?.data || [];
        setItems(arr);
      }
    } catch (e) {
      console.error('mem0 list error', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchList(); }, []);

  const addMemory = async () => {
    const t = newText.trim(); if (!t) return;
    try {
      const resp = await fetch('/api/mem0/add', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: t, metadata: { source: 'memory-panel', ts: Date.now() } })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || 'add failed');
      setNewText("");
      fetchList();
    } catch (e) {
      console.error('mem0 add error', e);
    }
  };

  const deleteMemory = async (id?: string) => {
    if (!id) return;
    try {
      const resp = await fetch('/api/mem0/delete', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || 'delete failed');
      fetchList();
    } catch (e) {
      console.error('mem0 delete error', e);
    }
  };

  const startEdit = (id?: string, text?: string) => {
    if (!id) return;
    setEditId(id); setEditText(text || "");
  };

  const saveEdit = async () => {
    if (!editId) return;
    try {
      const resp = await fetch('/api/mem0/update', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editId, text: editText })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || 'update failed');
      setEditId(null); setEditText("");
      fetchList();
    } catch (e) {
      console.error('mem0 update error', e);
    }
  };

  return (
    <div className="w-full h-full min-h-0 flex flex-col bg-background/60 border border-divider rounded-[16px] overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-content1/50">
        <div className="text-foreground text-sm font-medium">记忆管理 (mem0)</div>
        <div className="ml-auto flex items-center gap-2">
          <Input size="sm" placeholder="搜索记忆..." value={query} onValueChange={setQuery} className="w-64" />
          <Button size="sm" onPress={fetchList} isLoading={loading}>搜索/刷新</Button>
        </div>
      </div>

      <div className="p-3 space-y-3 overflow-auto">
        <div className="space-y-2">
          <div className="text-foreground/70 text-xs">新增记忆</div>
          <div className="flex gap-2">
            <Textarea minRows={2} value={newText} onValueChange={setNewText} placeholder="输入要保存的文本..." className="flex-1" />
            <Button onPress={addMemory} color="primary">保存</Button>
          </div>
        </div>

        <Divider className="bg-white/10" />

        <div className="space-y-2">
          <div className="text-foreground/70 text-xs">记忆列表</div>
          <div className="space-y-2">
            {items.length === 0 && (
              <div className="text-foreground/50 text-xs">暂无记忆</div>
            )}
            {items.map((it, idx) => {
              const id = (it as any).id || (it as any)._id || String(idx);
              const text = it.text || it.content || '';
              return (
                <div key={id} className="p-2 rounded-lg border border-divider bg-content2/30">
                  {editId === id ? (
                    <div className="space-y-2">
                      <Textarea value={editText} onValueChange={setEditText} minRows={2} />
                      <div className="flex gap-2">
                        <Button size="sm" color="primary" onPress={saveEdit}>保存</Button>
                        <Button size="sm" variant="light" onPress={() => { setEditId(null); setEditText(''); }}>取消</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0 text-sm text-foreground whitespace-pre-wrap">{text}</div>
                      <div className="shrink-0 flex items-center gap-2">
                        <Button size="sm" variant="flat" onPress={() => startEdit(id, text)}>编辑</Button>
                        <Button size="sm" color="danger" variant="flat" onPress={() => deleteMemory(id)}>删除</Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemoryPanel;

