import { afterEach, describe, expect, it } from "vitest";
import { createFakePluginHost, makeThreadResponse } from "@get-bb/plugin-sdk/testing";
import plugin from "../server.js";
import { createStore } from "../src/store/store.js";
import { NOW, state, team } from "./helpers/store.js";

/**
 * The name to id resolution on `create`, driven through the real CLI.
 *
 * One team, several projects, is the shape the BB Tasks migration needs: the
 * team stays single and the project carries the distinction. So a create that
 * cannot name its project and labels is the blocker, and both refusal paths
 * are asserted here because a refusal that does not name the candidates is
 * worse than a wrong answer.
 *
 * The refusals are asserted rather than a successful create, on purpose: they
 * resolve before any Linear call, so the test needs no key and cannot write.
 */

const cleanups: (() => Promise<void>)[] = [];
afterEach(async () => {
  for (const cleanup of cleanups.splice(0)) await cleanup();
});

async function fixture() {
  const thread = makeThreadResponse({ id: "t", projectId: "proj_bb", environmentId: null });
  const { bb, harness } = createFakePluginHost({
    pluginId: "linear",
    sdk: {
      threads: { get: async () => thread, timeline: async () => ({ rows: [] }) as never },
      projects: {
        list: async () =>
          [
            {
              id: "proj_bb",
              name: "bb-plugin-linear",
              kind: "shared",
              gitRemoteUrl: null,
              sources: [],
            },
          ] as never,
      },
    },
  });
  cleanups.push(() => harness.lifecycle.dispose());
  await plugin(bb as never);
  const store = createStore(bb.storage.database() as never);
  store.putTeams([team("team_age", "AGE", { name: "Agents" })], NOW);
  store.replaceWorkflowStates("team_age", [state("todo", "team_age", "unstarted")], NOW);
  store.putLabels([
    { id: "l_mkt", teamId: "team_age", name: "marketplace", color: null, parentId: null, isGroup: false, updatedAt: NOW },
  ]);
  store.putProjects(
    [
      { id: "p_bb", name: "BB", description: null, url: null, statusId: null, leadId: null, startDate: null, targetDate: null, progress: null, updatedAt: NOW },
      { id: "p_image", name: "BB Image", description: null, url: null, statusId: null, leadId: null, startDate: null, targetDate: null, progress: null, updatedAt: NOW },
    ],
    [
      { projectId: "p_bb", teamId: "team_age" },
      { projectId: "p_image", teamId: "team_age" },
    ],
  );
  // Through the real CLI, so the binding and the server's scope snapshot come
  // from the same path the user runs.
  const bound = await harness.behavior.runCli(["bind", "AGE", "--project", "proj_bb"]);
  expect(bound.exitCode).toBe(0);
  return { harness, store };
}

describe("bb linear create", () => {
  it("refuses an unknown project and names the team it looked on", async () => {
    const { harness } = await fixture();
    const result = await harness.behavior.runCli(["create", "Ship", "--project", "Website"]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('No project matching "Website" on Agents.');
  });

  it("refuses an ambiguous project prefix and names the candidates", async () => {
    // "BB" and "BB Image" both contain "bb". A guess would file the issue
    // under a project the user did not mean.
    const { harness } = await fixture();
    const result = await harness.behavior.runCli(["create", "Ship", "--project", "b"]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("BB Image");
  });

  it("refuses an unknown label rather than creating the issue unlabelled", async () => {
    const { harness } = await fixture();
    const result = await harness.behavior.runCli(["create", "Ship", "--label", "image"]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('No label matching "image" on Agents.');
  });
});
