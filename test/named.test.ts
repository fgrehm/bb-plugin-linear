import { describe, expect, it } from "vitest";
import { resolveNamed } from "../src/named.js";

const PROJECTS = [
  { id: "p_bb", name: "BB" },
  { id: "p_bbi", name: "BB Image" },
  { id: "p_mkt", name: "BB Marketplace" },
];

describe("resolveNamed", () => {
  it("takes an exact match whatever else the substring hits", () => {
    // "BB" is a prefix of two other projects. Guessing here would file a
    // migration issue under the wrong project.
    const result = resolveNamed(PROJECTS, "bb", "Agents", "project");
    expect(result).toEqual({ ok: true, value: { id: "p_bb", name: "BB" } });
  });

  it("takes a lone partial match", () => {
    const result = resolveNamed(PROJECTS, "image", "Agents", "project");
    expect(result).toEqual({ ok: true, value: { id: "p_bbi", name: "BB Image" } });
  });

  it("refuses an ambiguous prefix and names the candidates", () => {
    const result = resolveNamed(PROJECTS, "b", "Agents", "project");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    // The user has to be able to tell which of these they meant, and a
    // refusal that does not name them is a dead end.
    expect(result.message).toContain("BB Image");
    expect(result.message).toContain("BB Marketplace");
  });

  it("names the team in a miss, because 'no match' is not actionable", () => {
    const result = resolveNamed(PROJECTS, "website", "Agents", "project");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toBe('No project matching "website" on Agents.');
  });

  it("ignores surrounding whitespace, which arrives from a comma list", () => {
    const result = resolveNamed(PROJECTS, "  BB Image ", "Agents", "project");
    expect(result).toEqual({ ok: true, value: { id: "p_bbi", name: "BB Image" } });
  });
});
