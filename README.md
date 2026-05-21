# claim emojis bot

A Discord bot that lets server members claim a unique emoji next to their display name. Entries are stored alphabetically and displayed on a persistent pink pastel embed board that updates automatically.

## Features

- Persistent embed board that auto-updates on every change
- All entries sorted A–Z
- Data stored locally in `data/entries.json` (survives restarts)
- Built-in Express web server for uptime monitoring (UptimeRobot, etc.)

## Commands

| Command | Description |
|---|---|
| `!claim <emoji>` | Claim a spot using your Discord display name |
| `!add <username> <emoji>` | Add or update a user's emoji manually |
| `!remove <username>` | Remove a user from the list |
| `!list` | Show all entries sorted A–Z |
| `!search <username>` | Look up a specific user's emoji |
| `!setupboard` | Create the persistent embed board in this channel |
| `!resetboard` | Clear all entries and refresh the board |
| `!help` | Show all commands |

## Setup

### 1. Clone and install

```bash
git clone <your-repo-url>
cd claim-emojis-bot
npm install
```

### 2. Create a Discord application

1. Go to [discord.com/developers/applications](https://discord.com/developers/applications)
2. Create a new application → add a Bot
3. Under **Bot → Privileged Gateway Intents**, enable **MESSAGE CONTENT INTENT**
4. Copy the bot token

### 3. Configure environment variables

Create a `.env` file (or set secrets in your host):

```env
DISCORD_TOKEN=your_bot_token_here
PORT=3000

# Set these after running !setupboard in Discord:
CHANNEL_ID=
MESSAGE_ID=
```

### 4. Invite the bot to your server

Use the OAuth2 URL generator with scopes `bot` and permissions:
- Read Messages / View Channels
- Send Messages
- Embed Links
- Read Message History

### 5. Run the bot

```bash
npm start
```

### 6. Set up the persistent board

In your Discord server, type `!setupboard` in the channel where you want the board to live. The bot will reply with a `CHANNEL_ID` and `MESSAGE_ID` — save those as environment variables and restart the bot.

## Project structure

```
src/
  index.js   — Discord bot + Express server
  store.js   — JSON persistence layer
data/
  entries.json   — Runtime data (auto-created, not committed)
package.json
```

## Hosting

The bot runs as a single Node.js process. The Express server listens on `0.0.0.0:$PORT` and responds with `Bot is alive` at `/` — point UptimeRobot (or any HTTP monitor) at that URL to keep the process alive on free-tier hosts.

```
PORT=3000 node src/index.js
```
