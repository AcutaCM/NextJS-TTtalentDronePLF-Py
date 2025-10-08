import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

interface MessageMarkdownProps {
  content: string;
}

const MermaidBlock: React.FC<{ code: string }> = ({ code }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let canceled = false;

    const renderMermaid = async () => {
      setError(null);
      if (typeof window === 'undefined') return;
      try {
        const mermaid = (await import('mermaid')).default;
        // 初始化一次即可，多次调用 initialize 也可容忍
        mermaid.initialize({
          startOnLoad: false,
          theme: 'dark',
          securityLevel: 'loose',
        });

        const el = containerRef.current;
        if (!el) return;
        // 清空后再渲染
        el.innerHTML = '';
        // 生成唯一 id
        const id = `mmd-${Math.random().toString(36).slice(2)}`;
        // 使用 mermaid.render 生成 SVG
        const { svg } = await mermaid.render(id, code);
        if (!canceled) {
          el.innerHTML = svg;
        }
      } catch (e: any) {
        if (!canceled) setError(e?.message || 'Mermaid 渲染失败');
      }
    };

    renderMermaid();
    return () => {
      canceled = true;
    };
  }, [code]);

  if (error) {
    // 回退为普通代码块显示错误
    return (
      <div className="relative group">
        <div className="text-xs text-red-400/90 mb-2">Mermaid 渲染失败：{error}</div>
        <pre className="overflow-auto">
          <code className="hljs language-mermaid">{code}</code>
        </pre>
      </div>
    );
  }

  return <div ref={containerRef} className="my-3"></div>;
};

const MessageMarkdown: React.FC<MessageMarkdownProps> = ({ content }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  }, []);

  // 轻量预处理：确保 ```mermaid 块能被识别
  const normalized = useMemo(() => content ?? '', [content]);

  return (
    <div className="prose prose-invert max-w-none prose-pre:rounded-lg prose-pre:bg-black/30 prose-code:text-white/90 prose-table:table-auto prose-table:w-full prose-th:border prose-td:border prose-td:border-white/10 prose-th:border-white/20 prose-th:bg-white/5 prose-thead:bg-white/5">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeHighlight, { detect: true }]]}
        components={{
          code(props: any) {
            const { inline, className, children, ...rest } = props || {};
            const codeText = String(children || '').replace(/\n$/, '');
            const lang = (className || '').replace('language-', '').trim();

            // 行内代码
            if (inline) {
              return (
                <code className={`px-1 py-0.5 rounded bg-white/10 ${className || ''}`} {...rest}>
                  {children}
                </code>
              );
            }

            // Mermaid 图表
            if (lang === 'mermaid' || className?.includes('language-mermaid') || className === 'mermaid') {
              return <MermaidBlock code={codeText} />;
            }

            // 普通代码块（带复制按钮）
            return (
              <div className="relative group">
                <button
                  type="button"
                  onClick={() => handleCopy(codeText)}
                  className="absolute top-2 right-2 z-10 px-2 py-1 text-xs rounded bg-white/10 text-white/80 hover:bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="复制代码"
                  title="复制代码"
                >
                  复制
                </button>
                {copied && (
                  <div className="absolute top-2 right-16 text-xs px-2 py-1 rounded bg-green-600/80 text-white/90 shadow">
                    已复制
                  </div>
                )}
                <pre className="overflow-auto">
                  <code className={`hljs ${className || ''}`}>{children as any}</code>
                </pre>
              </div>
            );
          },
          table({ children }) {
            return (
              <div className="overflow-x-auto my-2 rounded-lg border border-white/10">
                <table className="table-auto w-full text-sm">{children}</table>
              </div>
            );
          },
          input({ type, ...props }) {
            if (type === 'checkbox') {
              return <input type="checkbox" {...props} disabled className="mr-2 align-middle" />;
            }
            return <input type={type} {...props} />;
          },
        }}
      >
        {normalized}
      </ReactMarkdown>
    </div>
  );
};

export default MessageMarkdown;