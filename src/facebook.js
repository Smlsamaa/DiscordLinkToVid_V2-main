const axios = require("axios");
const ytdlp = require("yt-dlp-exec");

const FACEBOOK_URL_REGEX =
  /https?:\/\/(?:www\.|web\.|m\.)?facebook\.com\/[^\s<>]+|https?:\/\/fb\.watch\/[^\s<>]+/gi;

function extractFacebookUrls(content) {
  const matches = content.match(FACEBOOK_URL_REGEX) || [];
  return [...new Set(matches)];
}

// Asks yt-dlp for the direct (signed, short-lived) CDN url instead of downloading the
// video — Discord embeds a raw .mp4 link natively, so there's no reupload needed.
async function fetchUrlViaYtDlp(url) {
  try {
    const stdout = await ytdlp(url, {
      getUrl: true,
      format: "best[ext=mp4]/best",
      noCheckCertificates: true,
    });
    const videoUrl = String(stdout).trim().split("\n")[0];
    return videoUrl.startsWith("http") ? videoUrl : null;
  } catch (err) {
    console.error("[Facebook] yt-dlp failed:", err.message);
    return null;
  }
}

// Last-resort fallback for links yt-dlp can't extract — an unofficial third-party API,
// so treat it as best-effort only, same caveat as the old embed-proxy dependency.
async function fetchUrlViaApi(url) {
  try {
    const apiUrl = `https://www.fbdownloader.net/api/video?url=${encodeURIComponent(url)}`;
    const response = await axios.get(apiUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      timeout: 15000,
    });
    return response.data?.hd || response.data?.sd || null;
  } catch (err) {
    console.error("[Facebook] API fallback failed:", err.message);
    return null;
  }
}

async function fetchFacebookVideoUrl(url) {
  return (await fetchUrlViaYtDlp(url)) || (await fetchUrlViaApi(url));
}

module.exports = { extractFacebookUrls, fetchFacebookVideoUrl };
