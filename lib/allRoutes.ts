import { Node, Edge, RouteResult } from './types';

/**
 * Finds all simple paths (no repeated nodes) between origin and destination.
 * Returns results sorted by cost ascending. First result is always the optimal route.
 */
export function findAllRoutes(
  nodes: Node[],
  edges: Edge[],
  originLabel: string,
  destLabel: string
): RouteResult[] {
  // Build adjacency list
  const adj = new Map<string, { neighbor: string; weight: number }[]>();
  for (const node of nodes) adj.set(node.label, []);

  for (const edge of edges) {
    const src = nodes.find(n => n.id === edge.sourceId);
    const tgt = nodes.find(n => n.id === edge.targetId);
    if (!src || !tgt) continue;
    adj.get(src.label)!.push({ neighbor: tgt.label, weight: edge.weight });
    adj.get(tgt.label)!.push({ neighbor: src.label, weight: edge.weight });
  }

  const results: RouteResult[] = [];
  const visited = new Set<string>();

  function dfs(current: string, path: string[], cost: number) {
    if (current === destLabel) {
      results.push({ path: [...path], cost, isOptimal: false });
      return;
    }

    const neighbors = adj.get(current) ?? [];
    for (const { neighbor, weight } of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        path.push(neighbor);
        dfs(neighbor, path, cost + weight);
        path.pop();
        visited.delete(neighbor);
      }
    }
  }

  visited.add(originLabel);
  dfs(originLabel, [originLabel], 0);

  // Sort by cost
  results.sort((a, b) => a.cost - b.cost);

  // Mark optimal
  if (results.length > 0) {
    results[0].isOptimal = true;
  }

  return results;
}
