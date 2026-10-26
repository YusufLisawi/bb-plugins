import { describe, expect, it } from "vitest";
import type { PluginSidebarSection, PluginSidebarThread } from "@get-bb/plugin-sdk/app";
import { normalizeSectionOwners, partitionBySection, sectionsForProject } from "../src/sectionFolders";

const section = (id: string): PluginSidebarSection => ({ id, name: id, createdAt: 0, updatedAt: 0 });
const thread = (id: string, sectionId: string | null = null, parentThreadId: string | null = null) =>
  ({ id, sectionId, parentThreadId, projectId: "proj" }) as PluginSidebarThread;

describe("folders inside a project", () => {
  const sections = [section("later"), section("bugs"), section("other-project")];

  it("shows the folders created in the project, even empty, plus any holding its threads", () => {
    const owners = { later: "proj", "other-project": "elsewhere" };
    const threads = [thread("t1", "bugs")];
    expect(sectionsForProject("proj", threads, sections, owners).map((s) => s.id)).toEqual(["later", "bugs"]);
  });

  it("files a family under its root's folder, so subthreads stay under their parent", () => {
    const folders = [section("later"), section("bugs")];
    const threads = [
      thread("root", "bugs"),
      thread("child", null, "root"),
      thread("child-elsewhere", "later", "root"),
      thread("loose"),
      thread("unknown-section", "deleted"),
    ];
    const { bySection, loose } = partitionBySection(threads, folders);
    expect(bySection.get("bugs")!.map((t) => t.id)).toEqual(["root", "child", "child-elsewhere"]);
    expect(bySection.get("later")).toEqual([]);
    expect(loose.map((t) => t.id)).toEqual(["loose", "unknown-section"]);
  });

  it("drops malformed stored owners", () => {
    expect(normalizeSectionOwners({ ok: "proj", bad: 3, "": "x" })).toEqual({ ok: "proj" });
    expect(normalizeSectionOwners(["nope"])).toEqual({});
  });
});
