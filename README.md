# tiktok-discord-bot

Discord bot that watches chat for TikTok links and reposts the media directly:

- **Videos** → posted as a link through an embed-fixer proxy (default `tnktok.com`), which Discord renders as an inline video preview. Videos are never downloaded, so there's no size limit or processing cost on our end.
- **Slideshows** (TikTok's photo-post format) → every image is downloaded and re-uploaded (no audio track).

The original message with the TikTok link is deleted once the media is reposted, replaced by a plain message tagging whoever sent it.

## Setup

1. Create a Discord application + bot at https://discord.com/developers/applications, enable the **Message Content Intent** under Bot settings, and invite it to your server with the `Send Messages`, `Attach Files`, and `Manage Messages` (needed to delete the original link message) permissions.
2. Copy `.env.example` to `.env` and fill in `DISCORD_TOKEN`.
3. Install dependencies:
   ```
   npm install
   ```
4. Run the bot:
   ```
   npm start
   ```

## Notes

- Video links go through an embed-fixer proxy (default `tnktok.com`, alternative: `fixtiktok.com`) — configurable via `TIKTOK_EMBED_PROXY_DOMAIN` in `.env`. (`vxtiktok.com` was the previous default but was shut down following a legal request in November 2025 — worth keeping an eye on since these proxy services tend to be short-lived.)
- Video links use `tnktok.com`'s "direct mode" (the `d.` subdomain prefix), which strips the likes/comments/caption card down to a bare video player.
- `MAX_FILE_SIZE_MB` only applies to slideshow images now, since videos are no longer downloaded.
- Slideshow images are sent in batches of 10 (Discord's per-message attachment limit).
- Uses [@tobyg74/tiktok-api-dl](https://www.npmjs.com/package/@tobyg74/tiktok-api-dl) for TikTok metadata/download URLs, which is an unofficial scraper and may break if TikTok changes its API.

## Deploying to Render

Render's web services require an HTTP port to be bound, so the bot runs a tiny Express server ([src/server.js](src/server.js)) alongside the Discord client with `/` and `/health` endpoints.

1. Push this repo to GitHub.
2. In Render, choose **New > Blueprint** and point it at the repo — it will pick up [render.yaml](render.yaml) and create a free web service automatically.
   - Alternatively, create a **Web Service** manually with build command `npm install` and start command `npm start`.
3. Set the `DISCORD_TOKEN` environment variable in the Render dashboard (marked `sync: false` in the blueprint, so it won't be committed).
4. Render assigns `PORT` automatically — no need to set it yourself.

Free Render web services spin down after ~15 minutes of no HTTP traffic and cold-start on the next request, which will disconnect the bot in between. To keep it alive, ping the service's `/health` endpoint every few minutes with an uptime monitor (e.g. [UptimeRobot](https://uptimerobot.com/)), or upgrade to a paid instance.
