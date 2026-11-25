import { headers } from "next/headers";

const INDEXABLE_HOSTS = new Set(["storeseco.com", "www.storeseco.com"]);

/**
 * ALLOW_INDEXING alone isn't hostname-aware — staging.storeseco.com runs the
 * same build off the same env file as the real domain, so relying on the env
 * var by itself would let staging get indexed too the moment production
 * indexing is turned on. Only the real domain is ever indexable, regardless
 * of what ALLOW_INDEXING says.
 */
export async function isIndexable(): Promise<boolean> {
  if (process.env.ALLOW_INDEXING !== "true") return false;
  const host = (await headers()).get("host")?.split(":")[0] ?? "";
  return INDEXABLE_HOSTS.has(host);
}
