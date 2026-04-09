/**
 * Social Media Hybrid Tree Comment Algorithm
 * 
 * This algorithm builds a true parent-child tree structure while
 * identifying direct "Reply To" context for each node.
 */

function buildCommentTree(allComments, userMap, userVotes) {
  const map = new Map();
  const roots = [];

  // 1. Initialize mapped comments
  allComments.forEach(c => {
    map.set(c._id.toString(), {
      ...c,
      user: userMap[c.userId.toString()],
      userVote: userVotes[c._id.toString()] || 0,
      replies: []
    });
  });

  // 2. Build the tree
  allComments.forEach(c => {
    const node = map.get(c._id.toString());
    if (c.parentId) {
      const parentNode = map.get(c.parentId.toString());
      if (parentNode) {
        // Attach context: Who are we replying to?
        if (parentNode.user) {
          node.replyToUser = {
            username: parentNode.user.username
          };
        }
        parentNode.replies.push(node);
      } else {
        // Orphaned or deleted parent - treat as root
        roots.push(node);
      }
    } else {
      roots.push(node);
    }
  });

  // 3. Sort each level chronologically
  const sortRecursively = (nodes) => {
    nodes.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    nodes.forEach(n => {
      if (n.replies.length > 0) sortRecursively(n.replies);
    });
  };

  sortRecursively(roots);
  // We sort roots by newest first (typical for feed)
  roots.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return roots;
}

module.exports = { buildCommentTree };
