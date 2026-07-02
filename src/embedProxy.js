// Swaps a URL's hostname for an embed-fixer proxy domain so Discord renders an inline
// video/photo embed instead of its broken (or missing) native preview.
function toEmbedProxyUrl(url, proxyDomain, modifier) {
  try {
    const parsed = new URL(url);
    parsed.hostname = modifier ? `${modifier}.${proxyDomain}` : proxyDomain;
    return parsed.toString();
  } catch {
    return url;
  }
}

module.exports = { toEmbedProxyUrl };
