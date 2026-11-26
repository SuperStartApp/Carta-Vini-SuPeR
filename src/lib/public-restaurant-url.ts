/** URL canonico condiviso dai link pubblici e dai QR Code. */
export function publicRestaurantUrl(slug: string): string | null {
  if (slug.length > 80 || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return null;

  const { NEXT_PUBLIC_APP_URL, NODE_ENV, VERCEL_URL, VERCEL_BRANCH_URL, VERCEL_PROJECT_PRODUCTION_URL } = process.env;
  const development = NODE_ENV === "development";
  const value = NEXT_PUBLIC_APP_URL?.trim() || (development ? "http://127.0.0.1:3000" : "");
  if (!/^https?:\/\/[^\s/?#\\@]+\/?$/i.test(value)) return null;

  try {
    const url = new URL(value);
    const host = url.hostname.replace(/\.$/, "");
    const loopback = host === "localhost" || host.endsWith(".localhost") || host === "[::1]" || /^127\.\d+\.\d+\.\d+$/.test(host);
    if ((!development || !loopback) && url.protocol !== "https:") return null;
    if (!development && loopback) return null;

    const runtimeHost = [VERCEL_URL, VERCEL_BRANCH_URL].some(candidate => candidate?.toLowerCase() === host);
    const generatedHost = host.endsWith(".vercel.app")
      && (host.includes("-git-") || /-[a-z0-9]{9}-[a-z0-9-]+\.vercel\.app$/.test(host));
    if ((runtimeHost || generatedHost) && host !== VERCEL_PROJECT_PRODUCTION_URL?.toLowerCase()) return null;

    return new URL(`/r/${slug}`, url.origin).href;
  } catch {
    return null;
  }
}
