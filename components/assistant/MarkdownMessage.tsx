"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import { markdownSanitizeSchema } from "@/lib/markdown-schema";
import { getCodeHighlighter, isKnownLanguage } from "@/lib/code-highlighter";

function isInternalHref(href: string): boolean {
  return href.startsWith("/") && !href.startsWith("//");
}

function extractLanguage(className: string | undefined): string | undefined {
  const match = /language-(\S+)/.exec(className ?? "");
  return match?.[1];
}

function CopyButton({ getText }: { getText: () => string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(getText()).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      className="assistant-code-copy"
      aria-label="Copy code"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

// Renders plain text immediately, then swaps in Shiki-highlighted HTML once
// the shared highlighter instance (see lib/code-highlighter.ts) has loaded --
// react-markdown can't await a highlighter mid-render (it runs synchronously),
// so highlighting here happens after the fact via a small effect instead of
// as a rehype plugin.
function CodeBlock({ code, language }: { code: string; language: string | undefined }) {
  const [html, setHtml] = useState<string | null>(null);
  const codeRef = useRef(code);
  codeRef.current = code;

  useEffect(() => {
    let cancelled = false;
    getCodeHighlighter().then((highlighter) => {
      if (cancelled) return;
      const lang = isKnownLanguage(highlighter, language) ? language! : "plaintext";
      setHtml(
        highlighter.codeToHtml(codeRef.current, {
          lang,
          themes: { light: "github-light", dark: "github-dark" },
          defaultColor: false,
        }),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [code, language]);

  return (
    <div className="assistant-code-block">
      {language && <span className="assistant-code-lang">{language}</span>}
      <CopyButton getText={() => code} />
      {html ? (
        <div className="assistant-code-shiki" dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <pre>
          <code>{code}</code>
        </pre>
      )}
    </div>
  );
}

function getTextContent(node: React.ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(getTextContent).join("");
  if (node && typeof node === "object" && "props" in node) {
    return getTextContent((node as { props?: { children?: React.ReactNode } }).props?.children);
  }
  return "";
}

export function MarkdownMessage({ text }: { text: string }) {
  return (
    <div className="assistant-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeSanitize, markdownSanitizeSchema]]}
        components={{
          a({ href, children, ...props }) {
            if (!href) return <span {...props}>{children}</span>;
            if (isInternalHref(href)) {
              return (
                <Link href={href} {...props}>
                  {children}
                </Link>
              );
            }
            return (
              <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
                {children}
              </a>
            );
          },
          pre({ children }) {
            const child = Array.isArray(children) ? children[0] : children;
            const className =
              child && typeof child === "object" && "props" in child
                ? (child.props as { className?: string }).className
                : undefined;
            const code = getTextContent(children).replace(/\n$/, "");
            return <CodeBlock code={code} language={extractLanguage(className)} />;
          },
          table({ children, ...props }) {
            return (
              <div className="assistant-table-scroll">
                <table {...props}>{children}</table>
              </div>
            );
          },
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
