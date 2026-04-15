import { Node, Edge } from './types';

export interface DijkstraResult {
  path: string[];   // node labels
  cost: number;
  found: boolean;
}

/**
 * Builds an adjacency list from nodes and edges (undirected graph).
 */
function buildAdjacency(nodes: Node[], edges: Edge[]): Map<string, { neighbor: string; weight: number }[]> {
  const adj = new Map<string, { neighbor: string; weight: number }[]>();

  for (const node of nodes) {
    adj.set(node.label, []);
  }

  for (const edge of edges) {
    const src = nodes.find(n => n.id === edge.sourceId);
    const tgt = nodes.find(n => n.id === edge.targetId);
    if (!src || !tgt) continue;

    adj.get(src.label)!.push({ neighbor: tgt.label, weight: edge.weight });
    adj.get(tgt.label)!.push({ neighbor: src.label, weight: edge.weight });
  }

  return adj;
}

/**
 * Dijkstra algorithm — returns shortest path and cost between two nodes.
 */
export function dijkstra(
  nodes: Node[],
  edges: Edge[],
  originLabel: string,
  destLabel: string
): DijkstraResult {
  const adj = buildAdjacency(nodes, edges);

  const dist = new Map<string, number>();
  const prev = new Map<string, string | null>();
  const visited = new Set<string>();

  for (const node of nodes) {
    dist.set(node.label, Infinity);
    prev.set(node.label, null);
  }
  dist.set(originLabel, 0);

  // Simple priority queue using sorted array
  const queue: { label: string; cost: number }[] = [{ label: originLabel, cost: 0 }];

  while (queue.length > 0) {
    queue.sort((a, b) => a.cost - b.cost);
    const { label: current } = queue.shift()!;

    if (visited.has(current)) continue;
    visited.add(current);

    if (current === destLabel) break;

    const neighbors = adj.get(current) ?? [];
    for (const { neighbor, weight } of neighbors) {
      if (visited.has(neighbor)) continue;
      const newCost = dist.get(current)! + weight;
      if (newCost < dist.get(neighbor)!) {
        dist.set(neighbor, newCost);
        prev.set(neighbor, current);
        queue.push({ label: neighbor, cost: newCost });
      }
    }
  }

  const totalCost = dist.get(destLabel) ?? Infinity;
  if (totalCost === Infinity) {
    return { path: [], cost: Infinity, found: false };
  }

  // Reconstruct path
  const path: string[] = [];
  let current: string | null = destLabel;
  while (current !== null) {
    path.unshift(current);
    current = prev.get(current) ?? null;
  }

  return { path, cost: totalCost, found: true };
}
