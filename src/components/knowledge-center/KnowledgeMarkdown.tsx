import { useSuspenseQuery } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import { Link } from "@tanstack/react-router";
import { MermaidDiagram } from "./MermaidDiagram";
import { kcKnownSlugsQuery } from "@/lib/knowledge-center/registry";
import { resolveMarkdownHref } from "@/lib/knowledge-center/link-resolver";

interface KnowledgeMarkdownProps {
  content: string;
  currentDocPath: string;
}

export function KnowledgeMarkdown({ content, currentDocPath }: KnowledgeMarkdownProps) {
  const { data: knownSlugs } = useSuspenseQuery(kcKnownSlugsQuery);

  return (
    <div className="knowledge-prose">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug]}
        components={{
          a({ href, children, ...props }) {
            const resolved = href ? resolveMarkdownHref(href, currentDocPath, knownSlugs) : href;
            const isExternal = resolved?.match(/^(https?:|mailto:|tel:)/i);
            const isHash = resolved?.startsWith("#");

            if (isExternal || isHash) {
              return (
                <a
                  href={resolved}
                  target={isExternal ? "_blank" : undefined}
                  rel={isExternal ? "noopener noreferrer" : undefined}
                  {...props}
                >
                  {children}
                </a>
              );
            }

            if (resolved?.startsWith("/admin/knowledge/")) {
              const path = resolved.split("#")[0];
              const splat = path.replace("/admin/knowledge/", "");
              const hash = resolved.includes("#")
                ? resolved.slice(resolved.indexOf("#"))
                : undefined;
              return (
                <Link
                  to="/admin/knowledge/$"
                  params={{ _splat: splat }}
                  hash={hash}
                  className="text-primary-600 underline underline-offset-[3px] dark:text-primary-300"
                >
                  {children}
                </Link>
              );
            }

            if (resolved === "/admin/knowledge") {
              return (
                <Link
                  to="/admin/knowledge"
                  className="text-primary-600 underline underline-offset-[3px] dark:text-primary-300"
                >
                  {children}
                </Link>
              );
            }

            return (
              <a href={resolved} {...props}>
                {children}
              </a>
            );
          },
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className ?? "");
            const lang = match?.[1];
            const text = String(children).replace(/\n$/, "");

            if (lang === "mermaid") {
              return <MermaidDiagram chart={text} />;
            }

            const inline = !className;
            if (inline) {
              return (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            }

            return (
              <pre>
                <code className={className} {...props}>
                  {children}
                </code>
              </pre>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
