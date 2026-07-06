import { queryOptions } from "@tanstack/react-query";
import { ensureAiWorkspaceSnapshot } from "./snapshot";
import { generateContextPrompt } from "./prompt-generator";

export const aiWorkspaceSnapshotQuery = queryOptions({
  queryKey: ["ai-workspace", "snapshot"],
  queryFn: () => ensureAiWorkspaceSnapshot(),
  staleTime: Infinity,
});

export const aiWorkspacePromptQuery = queryOptions({
  queryKey: ["ai-workspace", "prompt"],
  queryFn: async () => {
    const snapshot = await ensureAiWorkspaceSnapshot();
    return generateContextPrompt(snapshot);
  },
  staleTime: Infinity,
});
