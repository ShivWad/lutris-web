// Browser writes must originate from this app. Headerless local CLI requests
// remain supported; this is request-forgery protection, not authentication.
export function isSameOriginRequest(request: Request): boolean {
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") return false;
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const source = new URL(origin);
    return (source.protocol === "http:" || source.protocol === "https:") &&
      source.host === (request.headers.get("host") ?? new URL(request.url).host);
  } catch {
    return false;
  }
}
