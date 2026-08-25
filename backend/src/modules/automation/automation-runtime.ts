export interface AutomationNode {
  id: string;
  type: string;
  nextNodeId?: string;
  alternateNodeId?: string;
}

export interface AutomationGraph {
  entryNodeId: string;
  nodes: AutomationNode[];
  maxExecutionDepth: number;
}

export interface AutomationGraphIssue {
  code: "DUPLICATE_NODE" | "ENTRY_NOT_FOUND" | "EDGE_NOT_FOUND" | "UNBOUNDED_CYCLE" | "END_UNREACHABLE";
  nodeId?: string;
  message: string;
}

/**
 * Shared graph validation for CRM workflows and Marketing journeys.
 * Cycles are rejected at activation: waits and retries are represented by
 * persisted execution state, never graph loops.
 */
export function validateAutomationGraph(graph: AutomationGraph): AutomationGraphIssue[] {
  const issues: AutomationGraphIssue[] = [];
  const byId = new Map<string, AutomationNode>();
  for (const node of graph.nodes) {
    if (byId.has(node.id)) {
      issues.push({ code: "DUPLICATE_NODE", nodeId: node.id, message: `Le nœud ${node.id} est déclaré plusieurs fois.` });
    }
    byId.set(node.id, node);
  }
  if (!byId.has(graph.entryNodeId)) {
    issues.push({ code: "ENTRY_NOT_FOUND", message: "Le nœud d’entrée est introuvable." });
    return issues;
  }
  for (const node of graph.nodes) {
    for (const target of [node.nextNodeId, node.alternateNodeId].filter(Boolean) as string[]) {
      if (!byId.has(target)) {
        issues.push({ code: "EDGE_NOT_FOUND", nodeId: node.id, message: `Le nœud ${node.id} référence ${target}, qui n’existe pas.` });
      }
    }
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  let endReachable = false;
  const walk = (id: string, depth: number) => {
    if (depth > graph.maxExecutionDepth) {
      issues.push({ code: "UNBOUNDED_CYCLE", nodeId: id, message: "Le parcours dépasse la profondeur maximale autorisée." });
      return;
    }
    if (visiting.has(id)) {
      issues.push({ code: "UNBOUNDED_CYCLE", nodeId: id, message: "Les boucles de parcours ne sont pas autorisées." });
      return;
    }
    if (visited.has(id)) return;
    const node = byId.get(id);
    if (!node) return;
    if (node.type === "END") endReachable = true;
    visiting.add(id);
    if (node.nextNodeId) walk(node.nextNodeId, depth + 1);
    if (node.alternateNodeId) walk(node.alternateNodeId, depth + 1);
    visiting.delete(id);
    visited.add(id);
  };
  walk(graph.entryNodeId, 0);
  if (!endReachable) {
    issues.push({ code: "END_UNREACHABLE", message: "Au moins une fin de parcours doit être accessible depuis le déclencheur." });
  }
  return issues;
}

export function assertAutomationGraph(graph: AutomationGraph) {
  const issues = validateAutomationGraph(graph);
  if (issues.length) {
    const error = new Error("AUTOMATION_GRAPH_INVALID");
    Object.assign(error, { issues });
    throw error;
  }
}
