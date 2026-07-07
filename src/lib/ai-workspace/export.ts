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
  const date = new Date().toISOString().slice(0, 10);
  const ext = format === "json" ? "json" : format === "txt" ? "txt" : "md";
  return `lots-bi-context-pack-${date}.${ext}`;
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

export function exportChatContext(snapshot: AiWorkspaceSnapshot, format: ExportFormat): string {
  switch (format) {
    case "markdown":
      return snapshot.chatContextMarkdown;
    case "json":
      return JSON.stringify(
        {
          type: "ai-chat-context",
          generatedAt: snapshot.generatedAt,
          markdown: snapshot.chatContextMarkdown,
          snapshot,
        },
        null,
        2,
      );
    case "txt":
      return markdownToPlainText(snapshot.chatContextMarkdown);
    default:
      return snapshot.chatContextMarkdown;
  }
}

export function exportChatContextFilename(format: ExportFormat): string {
  const date = new Date().toISOString().slice(0, 10);
  const ext = format === "json" ? "json" : format === "txt" ? "txt" : "md";
  return `lots-bi-ai-chat-context-${date}.${ext}`;
}

export function exportChatContextMimeType(format: ExportFormat): string {
  return exportMimeType(format);
}
