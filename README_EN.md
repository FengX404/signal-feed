# SignalFeed

[![Build Status](https://img.shields.io/badge/build-passing-green.svg)]()
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D16-green.svg)](https://nodejs.org/)

Extract valuable signals from massive RSS noise. Fetches RSS feeds based on priority strategy, generates article summaries using AI, and sends briefings via email.

## Features

- **Signal Extraction**: 11 curated RSS feeds organized in priority tiers, extracting high-value information from noise
- **Smart Filtering**: Prioritizes core feeds with automatic keyword pre-filtering for AI/LLM/Frontier Technology content
- **AI Summarization**: Supports Zhipu AI / OpenAI / DeepSeek with customizable prompts
- **GitHub Releases**: Subscribe to project release updates with automatic filtering of fixes/testing content
- **Card Generation**: Automatically creates Xiaohongshu-style social media card images
- **Email Briefing**: HTML briefings with customizable brand colors and styles
- **Scheduled Tasks**: Supports system cron for scheduled execution
- **Manual Trigger**: CLI manual triggering with configurable time ranges
- **Local Storage**: SQLite database for storing history
- **Retry Mechanism**: Automatic recording of fetch and generation failures for troubleshooting

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Settings

Copy the configuration template and modify as needed:

```bash
cp config.example.yaml config.yaml
```

`config.yaml` contains all configurable options: RSS feeds, AI providers, email settings, brand styles, etc.

### 3. Environment Variables

Copy `.env.example` to `.env` and fill in your keys:

```bash
cp .env.example .env
```

```env
# AI Provider Configuration (choose one)
# OpenAI (Recommended)
# OPENAI_API_KEY=your_openai_api_key
# OPENAI_BASE_URL=https://api.openai.com/v1
# OPENAI_MODEL=gpt-4o-mini

# Zhipu AI
# ZHIPU_API_KEY=your_zhipu_api_key
# ZHIPU_BASE_URL=https://open.bigmodel.cn/api/paas/v4
# ZHIPU_MODEL=glm-4-flash

# DeepSeek
# DEEPSEEK_API_KEY=your_deepseek_api_key
# DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
# DEEPSEEK_MODEL=deepseek-chat

# Email SMTP Configuration
# SMTP_HOST=smtp.qq.com
# SMTP_PORT=465
# SMTP_USER=your_email@example.com
# SMTP_PASS=your_email_auth_code

# Optional Configuration
# EMAIL_SUBJECT_PREFIX=SignalFeed    # Email subject prefix
# DB_PATH=data/signalfeed.db          # Database path
# SCHEDULE_CRON=0 9 * * *             # Scheduled task cron expression
```

### 4. Setup Scheduled Task (Optional)

```bash
crontab -e
```

```
0 8 * * * cd /path/to/signalfeed && npm start >> ~/signalfeed.log 2>&1
```

### 5. Manual Run

```bash
npm start              # Last 24 hours
npm start -- --days 3  # Last 3 days
npm start -- --days 7  # Last 7 days
```

## Configuration System

```
Configuration Priority: Environment Variables > config.yaml > Built-in Defaults
```

### AI Providers

Set `ai.provider` in `config.yaml` to the corresponding provider name (e.g., `openai`, `zhipu`, `deepseek`), then fill in the corresponding API Key in `.env`.

Supports all OpenAI API-compatible providers. Just configure `baseUrl`, `apiKey`, and `model` fields. See `config.example.yaml` for details.

**Configuration Options:**
- `ai.provider` - Currently used AI provider
- `ai.temperature` - Generation temperature (0-1, lower is more deterministic)
- `ai.maxTokens` - Maximum generated tokens
- `ai.requestInterval` - Request interval (milliseconds) to avoid rate limiting
- `ai.timeout` - Request timeout (milliseconds)

### RSS Feed Configuration

Edit `rss.sources` in `config.yaml`:

```yaml
rss:
  sources:
    - name: "Your Feed"
      url: "https://example.com/feed.xml"
      priority: high    # high | medium | low
      category: "Category"
```

**Configuration Options:**
- `rss.fetchTimeout` - Individual feed fetch timeout (milliseconds)
- `rss.defaultDays` - Default days of articles to fetch
- `rss.targetCount.weekday` - Target article count on weekdays
- `rss.targetCount.weekend` - Target article count on weekends
- `rss.targetCount.maxTotal` - Maximum articles per briefing

### GitHub Releases Configuration

Add projects to subscribe to in `config.yaml`:

```yaml
github:
  sources:
    - name: "langchain"
      owner: "langchain-ai"
      repo: "langchain"
```

### Email Configuration

```yaml
email:
  smtp:
    host: "smtp.qq.com"
    port: 465
    secure: true
    user: "your_email@example.com"
    pass: "your_auth_code"
  senderName: "SignalFeed"
  subjectPrefix: "SignalFeed"
```

### Brand Visual

```yaml
branding:
  email:
    primary: "#667eea"
    headerEmoji: "📡"
  card:
    primary: "#4A9B6D"
```

**Configuration Options:**
- `branding.email` - Email briefing colors and styling
- `branding.card` - Xiaohongshu card colors and styling

### Custom AI Prompts

Modify system prompts and user prompt templates for different scenarios under `ai.prompts` node in `config.yaml`:

- `briefingSystem` / `briefingUser` - Article briefing generation
- `summarizeSystem` / `summarizeUser` - Article summary generation
- `releaseSystem` / `releaseUser` - GitHub Release summary generation

## Project Structure

```
signalfeed/
├── src/
│   ├── config/
│   │   ├── index.ts             # Config loader (YAML + ENV)
│   │   └── defaults.ts          # Built-in defaults
│   ├── services/
│   │   ├── ai/
│   │   │   ├── types.ts              # AIProvider interface
│   │   │   └── providers/
│   │   │       └── openai-compatible.ts  # Generic OpenAI-compatible implementation
│   │   ├── ai.ts                     # AI service (filtering, deduplication, summarization)
│   │   ├── database.ts          # Database service
│   │   ├── rss.ts               # RSS feed service
│   │   ├── email.ts             # Email service
│   │   ├── github-releases.ts   # GitHub Releases service
│   │   ├── xiaohongshu.ts       # Card generation service
│   │   └── failure-logger.ts    # Failure logging service
│   ├── models/
│   │   └── index.ts
│   └── index.ts                 # Main entry point
├── config.example.yaml          # Configuration template
├── .env.example                 # Environment variables template
├── tsconfig.json                # TypeScript configuration
├── .gitignore                   # Git ignore configuration
├── LICENSE                      # License file
├── data/                        # Database and logs (gitignore)
│   ├── signalfeed.db            # SQLite database
│   ├── failures.json            # Failure records
│   └── cards/                   # Generated card images
└── package.json
```

## Fetch Strategy

1. First scan all articles from high-priority feeds
2. Stop if target count reached (20 articles on weekdays, 40 on weekends, configurable)
3. Otherwise continue fetching medium-priority feeds
4. Finally fetch low-priority feeds

## Execution Flow

Each briefing task runs through the following steps:

1. **Fetch RSS Articles** - Get latest articles from RSS feeds by priority strategy
2. **AI Filter Related Articles** - Use keywords and AI judgment to filter relevant content
3. **Deduplication** - Remove duplicate or highly similar articles
4. **Generate Article Briefings** - Create title, summary, recommendation, and tags for each article
5. **Generate Cards** - Automatically create Xiaohongshu-style social media card images
6. **Fetch GitHub Releases** - Get latest releases from subscribed projects
7. **Generate Release Summaries** - Create summaries for each version, filtering out fixes/testing content
8. **Send Briefing Email** - Combine article briefings and version updates into email

## Development

```bash
npm run build    # Compile TypeScript
npm run dev      # Run in development mode
```

## License

ISC
