import { describe, expect, it } from "vitest";
import { validateAutomationGraph } from "../../src/modules/automation/automation-runtime.js";

describe("shared marketing automation runtime", () => {
  it("accepts a bounded journey with a persisted wait", () => {
    expect(
      validateAutomationGraph({
        entryNodeId: "welcome",
        maxExecutionDepth: 20,
        nodes: [
          { id: "welcome", type: "SEND_EMAIL", nextNodeId: "wait" },
          { id: "wait", type: "WAIT", nextNodeId: "end" },
          { id: "end", type: "END" },
        ],
      }),
    ).toEqual([]);
  });

  it("rejects cycles, missing edges and journeys without a reachable end", () => {
    const issues = validateAutomationGraph({
      entryNodeId: "start",
      maxExecutionDepth: 5,
      nodes: [
        {
          id: "start",
          type: "BRANCH",
          nextNodeId: "start",
          alternateNodeId: "missing",
        },
      ],
    });
    expect(issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "EDGE_NOT_FOUND",
        "UNBOUNDED_CYCLE",
        "END_UNREACHABLE",
      ]),
    );
  });
});
