type DiscussionNode = {
  id: string;
  parentId: string | null;
  content: string;
  createdAt: Date;
  author: {
    name: string | null;
    email: string;
  };
};

export function buildDiscussionTree(posts: DiscussionNode[]) {
  const byId = new Map<
    string,
    DiscussionNode & {
      replies: (DiscussionNode & { replies: unknown[] })[];
    }
  >();
  const roots: (DiscussionNode & { replies: unknown[] })[] = [];

  for (const post of posts) {
    byId.set(post.id, { ...post, replies: [] });
  }

  for (const post of posts) {
    const current = byId.get(post.id);
    if (!current) continue;

    if (!post.parentId) {
      roots.push(current);
      continue;
    }

    const parent = byId.get(post.parentId);
    if (!parent) {
      roots.push(current);
      continue;
    }

    parent.replies.push(current);
  }

  return roots;
}

export function discussionToText(
  nodes: (DiscussionNode & { replies: unknown[] })[],
  depth = 0,
): string {
  let output = "";
  const indent = "  ".repeat(depth);

  for (const node of nodes) {
    const post = node as DiscussionNode & {
      replies: (DiscussionNode & { replies: unknown[] })[];
    };
    output += `${indent}- ${post.author.name ?? post.author.email} (${post.createdAt.toISOString()}): ${post.content}\n`;
    if (post.replies.length > 0) {
      output += discussionToText(post.replies, depth + 1);
    }
  }

  return output;
}
