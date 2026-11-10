// Replies are indented at most this many levels; deeper ones open in a
// thread view rooted at the deepest shown comment ("continue thread").
// Matches THREAD_DEPTH in the backend's communityRules.js.
export const MAX_INDENT = 3;

// Returns a copy of the tree with `reply` added under `parentId`.
export function addReply(nodes, parentId, reply) {
  return nodes.map((n) =>
    n.id === parentId
      ? { ...n, replies: [...n.replies, reply], replyCount: n.replyCount + 1 }
      : { ...n, replies: addReply(n.replies, parentId, reply) }
  );
}
