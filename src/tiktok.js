const Tiktok = require("@tobyg74/tiktok-api-dl");

const TIKTOK_URL_REGEX =
  /https?:\/\/(?:www\.|vt\.|vm\.|m\.)?tiktok\.com\/[^\s<>]+/gi;

function extractTikTokUrls(content) {
  const matches = content.match(TIKTOK_URL_REGEX) || [];
  return [...new Set(matches)];
}

async function fetchTikTokPost(url) {
  const response = await Tiktok.Downloader(url, { version: "v1" });

  if (response.status !== "success" || !response.result) {
    throw new Error(response.message || "TikTok lookup failed");
  }

  return response.result;
}

async function downloadBuffer(url, maxBytes) {
  const res = await fetch(url, {
    headers: {
      // Some TikTok CDN hosts reject requests with no UA / referer.
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      Referer: "https://www.tiktok.com/",
    },
  });

  if (!res.ok) {
    throw new Error(`Download failed (${res.status})`);
  }

  const contentLength = Number(res.headers.get("content-length") || 0);
  if (maxBytes && contentLength && contentLength > maxBytes) {
    return { tooLarge: true, size: contentLength };
  }

  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (maxBytes && buffer.byteLength > maxBytes) {
    return { tooLarge: true, size: buffer.byteLength };
  }

  return { buffer };
}

module.exports = {
  extractTikTokUrls,
  fetchTikTokPost,
  downloadBuffer,
};
