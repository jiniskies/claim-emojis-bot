import "dotenv/config";
import express from "express";
import fs from "fs";
import { Client, GatewayIntentBits, Events, EmbedBuilder } from "discord.js";
import { getAll, add, remove, clear } from "./store.js";

// ── Web server (primary entrypoint) ─────────────────────────────────────────

const PORT = process.env.PORT;
if (!PORT) {
  console.error("❌ PORT environment variable is not set.");
  process.exit(1);
}

const app = express();

app.get("/", (_req, res) => {
  res.type("text/plain").send("Bot is alive");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🌐 Web server listening on 0.0.0.0:${PORT}`);
});

// ── Discord bot ──────────────────────────────────────────────────────────────

const PREFIX = "!";
const PINK = 0xf4b8c8;
const BOARD_FILE = "./board.json";

function loadBoard() {
  if (!fs.existsSync(BOARD_FILE)) return null;

  try {
    return JSON.parse(fs.readFileSync(BOARD_FILE, "utf-8"));
  } catch {
    return null;
  }
}

function saveBoard(data) {
  fs.writeFileSync(BOARD_FILE, JSON.stringify(data, null, 2));
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

function buildBoardEmbed() {
  const entries = getAll();
  const divider = "⎯".repeat(22);

  const embed = new EmbedBuilder()
    .setColor(PINK)
    .setTitle("🌸 Claim Emojis")
    .setFooter({ text: "sorted A–Z" })
    .setTimestamp();

  if (entries.length === 0) {
    embed.setDescription(
      `${divider}\n\n_No entries yet._\nUse \`!claim <emoji>\` to get started!\n\n${divider}`
    );
  } else {
    const lines = entries.map((e) => `${e.emoji} ${e.username}`).join("\n");
    embed.setDescription(`${divider}\n\n${lines}\n\n${divider}`);
  }

  return embed;
}

async function updateBoard() {
  const board = loadBoard();

  if (!board?.channelId) {
    console.log("❌ No board saved. Run !setupboard first.");
    return;
  }

  try {
    const channel = await client.channels.fetch(board.channelId);
    if (!channel) throw new Error("Channel not found");

    let msg;

    try {
      msg = await channel.messages.fetch(board.messageId);
    } catch {
      console.log("⚠️ Board message missing — recreating...");

      msg = await channel.send({ embeds: [buildBoardEmbed()] });

      saveBoard({
        channelId: channel.id,
        messageId: msg.id,
      });

      return;
    }

    await msg.edit({ embeds: [buildBoardEmbed()] });
    console.log("📋 Board updated.");
  } catch (err) {
    console.error("❌ updateBoard failed:", err);
  }
}
client.once(Events.ClientReady, (c) => {
  console.log(`✅ Discord bot logged in as ${c.user.tag}`);

  const board = loadBoard();

  if (board?.channelId && board?.messageId) {
    console.log("📋 Board loaded — auto-updating enabled.");
  } else {
    console.log("ℹ️ No board found. Run !setupboard to create one.");
  }
});

process.on("unhandledRejection", (err) => {
  if (err?.message?.includes("disallowed intents")) {
    console.error(
      "\n❌ Message Content intent is not enabled in the Discord Developer Portal.\n" +
      "  Go to: Applications → Bot → Privileged Gateway Intents → MESSAGE CONTENT INTENT\n"
    );
    process.exit(1);
  }
  console.error("Unhandled error:", err);
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const command = args.shift().toLowerCase();

  if (command === "claim") {
    if (args.length < 1) {
      return message.reply("Usage: `!claim <emoji>`\nExample: `!claim 🌸`");
    }
    const emoji = args[0];
    const displayName = message.member?.displayName ?? message.author.username;
    const success = add(displayName, emoji);

if (!success) {
  return message.reply("❌ That emoji is already taken by someone else. Please choose a different one!");
}

await message.reply(
  `🌸 **${displayName}** is now using ${emoji}!`
);

await updateBoard();

  } else if (command === "add") {
    if (args.length < 2) {
      return message.reply("Usage: `!add <username> <emoji>`\nExample: `!add Alice 🎉`");
    }
    const [username, emoji] = args;
    const success = add(username, emoji);

if (!success) {
  return message.reply("❌ That emoji is already taken. Please choose another one!");
}

await message.reply(
  `Added/updated **${username}** with ${emoji}!`
);

await updateBoard();

  } else if (command === "remove") {
    if (args.length < 1) return message.reply("Usage: `!remove <username>`");
    const success = remove(args[0]);
    if (success) {
      await message.reply(`Removed **${args[0]}** from the list.`);
      await updateBoard();
    } else {
      message.reply(`**${args[0]}** was not found in the list.`);
    }

  } else if (command === "list") {
    const entries = getAll();
    if (entries.length === 0) {
      return message.reply("The list is empty. Add someone with `!add <username> <emoji>`.");
    }
    const lines = entries.map((e) => `${e.emoji} **${e.username}**`).join("\n");
    await message.reply(`**All entries (alphabetical):**\n${lines}`);
    await updateBoard();

  } else if (command === "search") {
    if (args.length < 1) return message.reply("Usage: `!search <username>`");
    const entry = getAll().find(
      (e) => e.username.toLowerCase() === args[0].toLowerCase()
    );
    message.reply(
      entry ? `${entry.emoji} **${entry.username}**` : `No entry found for **${args[0]}**.`
    );

  } else if (command === "resetboard") {
    clear();
    await updateBoard();
    await message.reply("🗑️ Board has been reset — all entries cleared.");


} else if (command === "setupboard") {
  try {
    const boardMsg = await message.channel.send({
      embeds: [buildBoardEmbed()],
    });

    saveBoard({
      channelId: message.channel.id,
      messageId: boardMsg.id,
    });

    await message.reply(
      "🌸 **Board created and saved!**\n\n" +
      "This bot will now auto-update this embed forever (even after restarts)."
    );

    console.log(
      `📋 Board saved — CHANNEL_ID=${message.channel.id} MESSAGE_ID=${boardMsg.id}`
    );
  } catch (err) {
    message.reply("❌ Failed to create board message: " + err.message);
  }


  } else if (command === "help") {
    message.reply([
      "**Available commands:**",
      "`!claim <emoji>` — Claim a spot using your Discord display name",
      "`!add <username> <emoji>` — Add or update a user's emoji manually",
      "`!remove <username>` — Remove a user from the list",
      "`!list` — Show all entries sorted alphabetically",
      "`!search <username>` — Look up a specific user's emoji",
      "`!resetboard` — Clear all entries and refresh the board",
      "`!setupboard` — Create the persistent embed board in this channel",
      "`!help` — Show this help message",
    ].join("\n"));
  }
});

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error("❌ DISCORD_TOKEN environment variable is not set.");
  process.exit(1);
}

client.login(token);
