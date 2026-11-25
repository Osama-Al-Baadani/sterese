import type { Category } from "./types";

export interface CategoryIndex {
  roots: Category[];
  getChildren: (parentId: number) => Category[];
}

/** تبني فهرس الأقسام غير الفارغة مرة واحدة بتعقيد O(N) */
export function buildCategoryIndex(categories: Category[]): CategoryIndex {
  const rawChildren = new Map<number, Category[]>();
  for (const cat of categories) {
    const list = rawChildren.get(cat.parent);
    if (list) list.push(cat);
    else rawChildren.set(cat.parent, [cat]);
  }

  const hasProductsCache = new Map<number, boolean>();
  const visiting = new Set<number>();

  function checkHasProducts(cat: Category): boolean {
    const cached = hasProductsCache.get(cat.id);
    if (cached !== undefined) return cached;
    if (visiting.has(cat.id)) return false;

    visiting.add(cat.id);
    let result = (cat.count ?? 0) > 0;
    const kids = rawChildren.get(cat.id) ?? [];
    for (const kid of kids) {
      if (checkHasProducts(kid)) result = true;
    }
    visiting.delete(cat.id);

    hasProductsCache.set(cat.id, result);
    return result;
  }

  for (const cat of categories) {
    checkHasProducts(cat);
  }

  const nonEmptyChildren = new Map<number, Category[]>();
  for (const [parentId, kids] of rawChildren.entries()) {
    const filtered = kids.filter((c) => hasProductsCache.get(c.id));
    if (filtered.length > 0) {
      nonEmptyChildren.set(parentId, filtered);
    }
  }

  return {
    roots: nonEmptyChildren.get(0) ?? [],
    getChildren: (parentId: number) => nonEmptyChildren.get(parentId) ?? [],
  };
}

export function childrenOf(categories: Category[], parentId: number): Category[] {
  return categories.filter((c) => c.parent === parentId);
}

export function descendantIds(categories: Category[], id: number): number[] {
  const ids = [id];
  for (const child of childrenOf(categories, id)) {
    ids.push(...descendantIds(categories, child.id));
  }
  return ids;
}

export function hasProducts(categories: Category[], id: number): boolean {
  const byId = new Map(categories.map((c) => [c.id, c]));
  return descendantIds(categories, id).some((descendantId) => (byId.get(descendantId)?.count ?? 0) > 0);
}

export function ancestorChain(categories: Category[], selectedId: number | null): Category[] {
  if (selectedId === null) return [];
  const byId = new Map(categories.map((c) => [c.id, c]));
  const chain: Category[] = [];
  let current = byId.get(selectedId);
  while (current) {
    chain.unshift(current);
    current = current.parent ? byId.get(current.parent) : undefined;
  }
  return chain;
}