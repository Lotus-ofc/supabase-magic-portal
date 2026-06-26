import type { DocEntry, NavNode } from "./types";
import { HIDDEN_SLUGS, ROOT_DOC_LABELS, labelForSegment, orderForSegment } from "./categories";

interface TreeBuilder {
  children: Map<string, TreeBuilder>;
  docs: DocEntry[];
  segment: string;
  isRoot: boolean;
}

function createNode(segment: string, isRoot: boolean): TreeBuilder {
  return { children: new Map(), docs: [], segment, isRoot };
}

function docSortKey(doc: DocEntry): string {
  const name = doc.path.split("/").pop() ?? doc.path;
  if (name.toLowerCase() === "readme") return "\0readme";
  if (name.match(/^\d{4}-/)) return name;
  return name.toLowerCase();
}

function builderToNavNode(builder: TreeBuilder, parentPath: string): NavNode | null {
  const childNodes: NavNode[] = [];

  for (const doc of [...builder.docs].sort((a, b) => docSortKey(a).localeCompare(docSortKey(b)))) {
    if (HIDDEN_SLUGS.has(doc.slug)) continue;
    const fileName = doc.path.split("/").pop() ?? doc.slug;
    if (fileName.toLowerCase() === "readme" && doc.path.includes("/")) {
      childNodes.unshift({
        id: `doc:${doc.slug}`,
        type: "doc",
        label: doc.title,
        slug: doc.slug,
        order: -1,
      });
      continue;
    }
    childNodes.push({
      id: `doc:${doc.slug}`,
      type: "doc",
      label: doc.title,
      slug: doc.slug,
      order: 0,
    });
  }

  for (const [, child] of [...builder.children.entries()].sort(
    (a, b) => orderForSegment(a[0]) - orderForSegment(b[0]) || a[0].localeCompare(b[0]),
  )) {
    const node = builderToNavNode(
      child,
      parentPath ? `${parentPath}/${child.segment}` : child.segment,
    );
    if (node) childNodes.push(node);
  }

  if (childNodes.length === 0) return null;

  const fullPath = parentPath ? `${parentPath}/${builder.segment}` : builder.segment;
  const rootMeta = builder.isRoot ? ROOT_DOC_LABELS[builder.segment] : undefined;
  const label =
    rootMeta?.label ??
    (builder.isRoot ? labelForSegment(builder.segment) : labelForSegment(builder.segment));
  const order = rootMeta?.order ?? (builder.isRoot ? orderForSegment(builder.segment) : 0);

  if (
    builder.isRoot &&
    builder.segment.includes("-") === false &&
    ROOT_DOC_LABELS[builder.segment]
  ) {
    return {
      id: `root:${builder.segment}`,
      type: "doc",
      label,
      slug: builder.segment,
      order,
      children: childNodes.length > 1 ? childNodes : undefined,
    };
  }

  const onlyDoc =
    childNodes.length === 1 && childNodes[0].type === "doc" && !builder.docs.length
      ? childNodes[0]
      : null;

  if (onlyDoc && builder.children.size === 0 && builder.docs.length === 0) {
    return onlyDoc;
  }

  return {
    id: `folder:${fullPath}`,
    type: builder.isRoot ? "category" : "folder",
    label,
    order,
    children: childNodes,
    slug:
      builder.docs.length === 1 && builder.children.size === 0 ? builder.docs[0].slug : undefined,
  };
}

export function buildNavigationTree(docs: DocEntry[]): NavNode[] {
  const root = createNode("", true);

  for (const doc of docs) {
    const parts = doc.path.split("/");
    let current = root;

    if (parts.length === 1) {
      const leaf = createNode(parts[0], true);
      leaf.docs.push(doc);
      root.children.set(parts[0], leaf);
      continue;
    }

    for (let i = 0; i < parts.length - 1; i++) {
      const seg = parts[i];
      if (!current.children.has(seg)) {
        current.children.set(seg, createNode(seg, i === 0));
      }
      current = current.children.get(seg)!;
    }

    current.docs.push(doc);
  }

  const nodes: NavNode[] = [];
  for (const [, child] of [...root.children.entries()].sort(
    (a, b) => orderForSegment(a[0]) - orderForSegment(b[0]) || a[0].localeCompare(b[0]),
  )) {
    const node = builderToNavNode(child, "");
    if (node) nodes.push(node);
  }

  return nodes.sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));
}

export function flattenNavSlugs(nodes: NavNode[]): string[] {
  const slugs: string[] = [];
  const walk = (list: NavNode[]) => {
    for (const n of list) {
      if (n.slug) slugs.push(n.slug);
      if (n.children) walk(n.children);
    }
  };
  walk(nodes);
  return slugs;
}

export function breadcrumbForSlug(
  slug: string,
  docsBySlug: Map<string, DocEntry>,
): { label: string; slug?: string }[] {
  const doc = docsBySlug.get(slug);
  const crumbs: { label: string; slug?: string }[] = [
    { label: "Knowledge Center", slug: undefined },
  ];
  crumbs.push({ label: "Início", slug: "start-here" });

  if (!doc) return crumbs;

  const parts = doc.path.split("/");
  let acc = "";
  for (let i = 0; i < parts.length - 1; i++) {
    acc = acc ? `${acc}/${parts[i]}` : parts[i];
    crumbs.push({ label: labelForSegment(parts[i]) });
  }
  crumbs.push({ label: doc.title, slug: doc.slug });
  return crumbs;
}
