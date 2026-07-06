import { describe, expect, it } from "vitest";
import { isHardDeleteForbidden, isLibraryStatus } from "./workflow-rules";

describe("workflow-rules", () => {
  it("identifies library statuses", () => {
    expect(isLibraryStatus("publicado")).toBe(true);
    expect(isLibraryStatus("arquivado")).toBe(true);
    expect(isLibraryStatus("producao")).toBe(false);
  });

  it("forbids hard delete for published/archived", () => {
    expect(isHardDeleteForbidden("publicado")).toBe(true);
    expect(isHardDeleteForbidden("arquivado")).toBe(true);
    expect(isHardDeleteForbidden("producao")).toBe(false);
  });
});
