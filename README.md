# SignalFeed

[![Build Status](https://img.shields.io/badge/build-passing-green.svg)]()
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D16-green.svg)](https://nodejs.org/)

从海量 RSS 噪音中提取有价值的信号。基于优先级策略抓取 RSS 源，使用 AI 生成文章摘要，并通过邮件发送简报。

## 功能特性

- 📡 **信号提取**: 12 个精选 RSS 源，按优先级分层管理，从噪音中提取高价值信息
- 🎯 **智能筛选**: 优先抓取核心源，自动关键词预筛选 AI/LLM/前沿科技内容
- 🤖 **AI 摘要**: 支持智谱 AI / OpenAI / DeepSeek，可自定义提示词
- 📦 **GitHub Releases**: 订阅项目发布动态，自动过滤修复/测试内容
- 🎨 **卡片生成**: 自动生成小红书风格的社交媒体卡片图片
- 📧 **邮件简报**: 可自定义品牌色和样式的 HTML 简报
- ⏰ **定时任务**: 支持系统 cron 定时执行
- 🔧 **手动触发**: 命令行手动触发，支持指定时间范围
- 💾 **本地存储**: SQLite 数据库存储历史记录
- 🔄 **失败重试**: 自动记录抓取和生成失败，便于排查

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置文件

复制配置模板并根据需要修改：

```bash
cp config.example.yaml config.yaml
```

`config.yaml` 中包含所有可配置项：RSS 源、AI 提供商、邮件设置、品牌样式等。

### 3. 环境变量

复制 `.env.example` 为 `.env`，填入密钥：

```bash
cp .env.example .env
```

```env
# AI 提供商配置（选择其一）
# OpenAI（推荐）
# OPENAI_API_KEY=your_openai_api_key
# OPENAI_BASE_URL=https://api.openai.com/v1
# OPENAI_MODEL=gpt-4o-mini

# 智谱 AI
# ZHIPU_API_KEY=your_zhipu_api_key
# ZHIPU_BASE_URL=https://open.bigmodel.cn/api/paas/v4
# ZHIPU_MODEL=glm-4-flash

# DeepSeek
# DEEPSEEK_API_KEY=your_deepseek_api_key
# DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
# DEEPSEEK_MODEL=deepseek-chat

# 邮件 SMTP 配置
# SMTP_HOST=smtp.qq.com
# SMTP_PORT=465
# SMTP_USER=your_email@example.com
# SMTP_PASS=your_email_auth_code

# 可选配置
# EMAIL_SUBJECT_PREFIX=SignalFeed    # 邮件主题前缀
# DB_PATH=data/signalfeed.db          # 数据库路径
# SCHEDULE_CRON=0 9 * * *             # 定时任务 cron 表达式
```

### 4. 配置定时任务（可选）

```bash
crontab -e
```

```
0 8 * * * cd /path/to/signalfeed && npm start >> ~/signalfeed.log 2>&1
```

### 5. 手动运行

```bash
npm start              # 最近 24 小时
npm start -- --days 3  # 最近 3 天
npm start -- --days 7  # 最近 7 天
```

## 配置体系

配置优先级：`环境变量` > `config.yaml` > `内置默认值`

### 配置文件分工

| 文件 | 用途 | 说明 |
|------|------|------|
| `.env` | 敏感信息 | API Key、密码等，不提交到 Git |
| `config.yaml` | 用户配置 | 模型切换、邮箱配置等，不提交到 Git |
| `config/defaults.yaml` | 默认参数 | 模型参数、超时配置等，通常不需修改 |
| `config/keywords.yaml` | AI 关键词 | 筛选相关文章的关键词列表 |
| `config/prompts.yaml` | AI 提示词 | 摘要生成的提示词模板 |
| `config/sources.yaml` | RSS 订阅源 | 数据源列表和优先级配置 |
| `config/branding.yaml` | 品牌视觉 | 邮件和卡片的颜色样式 |

所有配置文件都有详细注释，可直接查看文件了解配置项含义。

### AI 提供商

在 `config.yaml` 中设置 `ai.provider`（如 `openai`、`zhipu`、`deepseek`），在 `.env` 中填入对应 API Key。

### RSS 源配置

编辑 `config/sources.yaml` 添加订阅源。

**当前订阅源（12 个）：**

| 名称 | 分类 | 优先级 |
|------|------|--------|
| OpenAI | AI核心 | high |
| Stratechery | 商业分析 | high |
| One Useful Thing | 范式解读 | high |
| Google DeepMind | AI核心 | high |
| Lenny's Newsletter | 产品/增长/商业 | medium |
| MIT Tech Review - AI | 科技媒体 | medium |
| 阮一峰 | 技术博客 | medium |
| Simon Willison | 技术博客 | medium |
| n8n Production AI Playbook | AI应用 | medium |
| Ars Technica AI | 科技媒体 | medium |
| The Verge AI | 科技媒体 | medium |
| Nature Machine Intelligence | 学术研究 | medium |

### GitHub Releases 配置

在 `config/sources.yaml` 的 `githubSources` 中添加要订阅的项目。

**当前订阅项目（1 个）：**

| 项目 | 仓库 |
|------|------|
| Spring AI Alibaba | alibaba/spring-ai-alibaba |

### 邮件配置

在 `config.yaml` 的 `email.smtp` 中配置 SMTP 信息，或在 `.env` 中设置环境变量。

### 品牌视觉

在 `config.yaml` 的 `branding` 中自定义邮件和卡片的颜色样式。

### 自定义 AI 提示词

编辑 `config/prompts.yaml` 修改摘要生成的提示词风格。

## 项目结构

```
signalfeed/
├── src/
│   ├── config/
│   │   ├── index.ts             # 配置加载器 (YAML + ENV)
│   │   └── types.ts             # 配置类型定义
│   ├── services/
│   │   ├── ai/
│   │   │   ├── types.ts              # AIProvider 接口
│   │   │   └── providers/
│   │   │       └── openai-compatible.ts  # 通用 OpenAI 兼容实现
│   │   ├── ai.ts                     # AI 服务 (筛选、去重、摘要)
│   │   ├── database.ts          # 数据库服务
│   │   ├── rss.ts               # RSS 订阅服务
│   │   ├── email.ts             # 邮件服务
│   │   ├── github-releases.ts   # GitHub Releases 服务
│   │   ├── xiaohongshu.ts       # 卡片生成服务
│   │   └── failure-logger.ts    # 失败日志服务
│   ├── models/
│   │   └── index.ts
│   └── index.ts                 # 主程序入口
├── config/                      # 配置文件目录
│   ├── defaults.yaml            # 默认运行参数
│   ├── keywords.yaml            # AI 关键词列表
│   ├── prompts.yaml             # AI 提示词模板
│   ├── sources.yaml             # RSS 订阅源列表
│   └── branding.yaml            # 品牌视觉配置
├── config.example.yaml          # 配置模板
├── .env.example                 # 环境变量模板
├── tsconfig.json                # TypeScript 配置
├── .gitignore                   # Git 忽略配置
├── LICENSE                      # 许可证文件
├── data/                        # 数据库和日志 (gitignore)
│   ├── signalfeed.db            # SQLite 数据库
│   ├── failures.json            # 失败记录
│   └── cards/                   # 生成的卡片图片
└── package.json
```

## 抓取策略

1. 先扫描高优先级源的所有文章
2. 如果达到目标数量（工作日 20 篇，周末 40 篇，可配置）则停止
3. 否则继续抓取中优先级源
4. 最后才抓取低优先级源

## 执行流程

每次运行简报任务时，系统会按照以下步骤执行：

1. **获取 RSS 文章** - 根据优先级策略抓取各 RSS 源的最新文章
2. **AI 筛选相关文章** - 使用关键词和 AI 判断筛选出相关内容
3. **去重** - 移除重复或高度相似的文章
4. **生成文章简报** - 为每篇文章生成标题、摘要、推荐语和标签
5. **生成卡片** - 自动生成小红书风格的社交媒体卡片图片
6. **获取 GitHub Releases** - 抓取订阅项目的最新发布版本
7. **生成 GitHub Releases 摘要** - 为每个版本生成摘要，过滤修复/测试内容
8. **发送简报邮件** - 将文章简报和版本更新合并发送邮件

## 开发

```bash
npm run build    # 编译 TypeScript
npm run dev      # 开发模式运行
```

## 许可证

ISC