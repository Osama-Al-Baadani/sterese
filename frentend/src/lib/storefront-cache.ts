import { revalidatePath, revalidateTag } from "next/cache";

export const STOREFRONT_CACHE_TAG = "storefront";

let lastPurgedVersion: string | null = null;

export function getLastPurgedVersion(): string | null {
  return lastPurgedVersion;
}

export function rememberVersion(version?: string | null) {
  if (version && lastPurgedVersion === null) {
    lastPurgedVersion = version;
  }
}

export function purgeStorefrontCache(newVersion?: string | null): boolean {
  if (newVersion && lastPurgedVersion === newVersion) {
    return false;
  }
  if (newVersion) {
    lastPurgedVersion = newVersion;
  }
  revalidateTag(STOREFRONT_CACHE_TAG, { expire: 0 });
  revalidatePath("/", "layout");
  return true;
}
