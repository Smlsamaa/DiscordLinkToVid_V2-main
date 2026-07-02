require("dotenv").config();
const { Client, GatewayIntentBits, Partials, AttachmentBuilder } = require("discord.js");
const { extractTikTokUrls, fetchTikTokPost, downloadBuffer } = require("./tiktok");
const { extractFacebookUrls, fetchFacebookVideoUrl } = require("./facebook");
const { toEmbedProxyUrl } = require("./embedProxy");
const { startServer } = require("./server");

const MAX_FILE_SIZE = Number(process.env.MAX_FILE_SIZE_MB || 10) * 1024 * 1024;
const CHUNK_SIZE = 10; // Discord's max attachments per message
const EMBED_PROXY_DOMAIN = process.env.TIKTOK_EMBED_PROXY_DOMAIN || "tnktok.com";
const VIDEO_CAPTION = "Here you go brotha!";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  for (const url of extractTikTokUrls(message.content)) {
    await handleTikTokUrl(message, url);
  }

  for (const url of extractFacebookUrls(message.content)) {
    await handleFacebookUrl(message, url);
  }
});

async function handleTikTokUrl(message, url) {
  try {
    await message.channel.sendTyping();
    const post = await fetchTikTokPost(url);

    if (post.type === "image") {
      await sendSlideshow(message, post);
    } else if (post.type === "video") {
      await sendVideo(message, url);
    } else {
      await message.reply({
        content: `[Tao đéo thấy vid](${url})`,
        allowedMentions: { repliedUser: false },
      });
    }
  } catch (err) {
    console.error(`Failed to process ${url}:`, err);
    // Reupload failed for some other reason (API error, no media found, etc.) —
    // an embed-proxy link still has a good chance of rendering correctly.
    await message
      .reply({
        content: `[${VIDEO_CAPTION}](${toEmbedProxyUrl(url, EMBED_PROXY_DOMAIN, "d")})`,
        allowedMentions: { repliedUser: false },
      })
      .catch(() => {});
    await message.suppressEmbeds(true).catch(() => {});
  }
}

async function handleFacebookUrl(message, url) {
  try {
    const videoUrl = await fetchFacebookVideoUrl(url);

    if (!videoUrl) {
      await message.reply({
        content: `[Tao đéo thấy vid](${url})`,
        allowedMentions: { repliedUser: false },
      });
      return;
    }

    await message.reply({
      content: `[${VIDEO_CAPTION}](${videoUrl})`,
      allowedMentions: { repliedUser: false },
    });
    await message.suppressEmbeds(true).catch(() => {});
  } catch (err) {
    console.error(`Failed to process ${url}:`, err);
    await message
      .reply({
        content: `[Tao đéo thấy vid](${url})`,
        allowedMentions: { repliedUser: false },
      })
      .catch(() => {});
  }
}

async function sendVideo(message, url) {
  // Videos always go through the embed-proxy link instead of being downloaded and
  // re-uploaded — Discord renders the inline preview itself, so there's no bandwidth/
  // memory cost on our end regardless of the video's size.
  await message.reply({
    content: `[${VIDEO_CAPTION}](${toEmbedProxyUrl(url, EMBED_PROXY_DOMAIN, "d")})`,
    allowedMentions: { repliedUser: false },
  });
  await message.suppressEmbeds(true).catch(() => {});
}

async function sendSlideshow(message, post) {
  const imageUrls = post.images || [];
  if (imageUrls.length === 0) {
    throw new Error("No images found in TikTok slideshow response");
  }

  const attachments = [];
  for (let i = 0; i < imageUrls.length; i++) {
    const result = await downloadBuffer(imageUrls[i], MAX_FILE_SIZE);
    if (result.buffer) {
      attachments.push(new AttachmentBuilder(result.buffer, { name: `tiktok-${i + 1}.jpg` }));
    } else {
      console.warn(`Skipped image ${i + 1} (too large or failed to download)`);
    }
  }

  if (attachments.length === 0) {
    throw new Error("All slideshow images failed to download");
  }

  // Send in batches of 10 (Discord's per-message attachment cap).
  for (let i = 0; i < attachments.length; i += CHUNK_SIZE) {
    const chunk = attachments.slice(i, i + CHUNK_SIZE);
    if (i === 0) {
      await message.reply({
        content: VIDEO_CAPTION,
        files: chunk,
        allowedMentions: { repliedUser: false },
      });
    } else {
      await message.channel.send({ files: chunk });
    }
  }

  await message.suppressEmbeds(true).catch(() => {});
}

startServer(client);
client.login(process.env.DISCORD_TOKEN);
