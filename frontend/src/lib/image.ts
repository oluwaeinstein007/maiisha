const EXTERNAL_IMAGE_HOSTS = ["images.unsplash.com", "images.pexels.com"];

/**
 * Seed/demo product photos are pinned to external stock-photo CDNs and are
 * already pre-sized via imgix query params — routing them through Next's
 * image optimizer just adds a server-side fetch that has to reach the
 * public internet from wherever the app is hosted (and gains little, since
 * the source is already the right size/format). Backend-hosted photos still
 * go through the optimizer as normal. Letting the browser fetch external
 * images directly avoids that extra hop being a single point of failure.
 */
export function isUnoptimizedImage(url: string): boolean {
  try {
    return EXTERNAL_IMAGE_HOSTS.includes(new URL(url).hostname);
  } catch {
    return false;
  }
}
