import type { AiWorkspaceSnapshot } from "./types";
import { generateContextPrompt, markdownToPlainText } from "./prompt-generator";

export type ExportFormat = "markdown" | "json" | "txt";

export async function copyToClipboard(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportSnapshot(snapshot: AiWorkspaceSnapshot, format: ExportFormat): string {
  switch (format) {
    case "markdown":
      return generateContextPrompt(snapshot);
    case "json":
      return JSON.stringify(snapshot, null, 2);
    case "txt":
      return markdownToPlainText(generateContextPrompt(snapshot));
    default:
      return generateContextPrompt(snapshot);
  }
}

export function exportFilename(format: ExportFormat): string {
  const ext = format === "json" ? "json" : format === "txt" ? "txt" : "md";
  return `lots-bi-code-context.${ext}`;
}

export function exportMimeType(format: ExportFormat): string {
  switch (format) {
    case "json":
      return "application/json";
    case "txt":
      return "text/plain";
    default:
      return "text/markdown";
  }
}

const CHAT_CONTEXT_USAGE_FOOTER = `# Como utilizar este contexto

Cole este documento como a primeira mensagem de uma nova conversa.

Depois descreva apenas a tarefa desejada.

**Exemplos:**

• Implementar uma funcionalidade
• Auditar arquitetura
• Revisar código
• Criar plano de implementação
• Explicar um módulo

A IA deve considerar este documento como a principal fonte de contexto antes de responder.`;

export function withChatContextUsageFooter(markdown: string): string {
  if (markdown.includes("Como utilizar este contexto")) return markdown;
  return `${markdown.trimEnd()}\n\n---\n\n${CHAT_CONTEXT_USAGE_FOOTER}`;
}

export function exportChatContext(snapshot: AiWorkspaceSnapshot, format: ExportFormat): string {
  const markdown = withChatContextUsageFooter(snapshot.chatContextMarkdown);
  switch (format) {
    case "markdown":
      return markdown;
    case "json":
      return JSON.stringify(
        {
          type: "ai-chat-context",
          generatedAt: snapshot.generatedAt,
          markdown,
          snapshot,
        },
        null,
        2,
      );
    case "txt":
      return markdownToPlainText(markdown);
    default:
      return markdown;
  }
}

export function exportChatContextFilename(format: ExportFormat): string {
  const ext = format === "json" ? "json" : format === "txt" ? "txt" : "md";
  return `lots-bi-chat-context.${ext}`;
}

export function exportChatContextMimeType(format: ExportFormat): string {
  return exportMimeType(format);
}
