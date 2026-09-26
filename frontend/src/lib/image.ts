const EXTERNAL_IMAGE_HOSTS = ["images.unsplash.com", "images.pexels.com"];

/** localhost, loopback and private-network addresses — where a developer's own machine (or Docker network) lives. */
function isLocalHost(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "[::1]" ||
    hostname.endsWith(".local") ||
    /^127\./.test(hostname) ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
  );
}

/**
 * Seed/demo product photos are pinned to external stock-photo CDNs and are
 * already pre-sized via imgix query params — routing them through Next's
 * image optimizer just adds a server-side fetch that has to reach the
 * public internet from wherever the app is hosted (and gains little, since
 * the source is already the right size/format). Backend-hosted photos still
 * go through the optimizer as normal. Letting the browser fetch external
 * images directly avoids that extra hop being a single point of failure.
 *
 * Images hosted on a local/private address are loaded directly too: Next's
 * optimizer refuses to fetch from private IPs (SSRF protection), and from
 * inside the Docker frontend container "localhost" isn't the backend anyway —
 * so on a dev machine every uploaded product photo and brand logo would
 * otherwise be a broken image. A production domain is public, so it's unaffected.
 */
export function isUnoptimizedImage(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return EXTERNAL_IMAGE_HOSTS.includes(hostname) || isLocalHost(hostname);
  } catch {
    return false;
  }
}
