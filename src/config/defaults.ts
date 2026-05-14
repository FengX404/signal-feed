import * as path from 'path';

const PROJECT_ROOT = path.resolve(__dirname, '../..');

export const defaults = {
  app: {
    name: 'SignalFeed',
    userAgent: 'Mozilla/5.0 (compatible; SignalFeed/1.0)',
  },

  ai: {
    provider: 'openai' as string,

    providers: {
      openai: {
        baseUrl: 'https://api.openai.com/v1',
        apiKey: '',
        model: 'gpt-4o-mini',
      },
      zhipu: {
        baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
        apiKey: '',
        model: 'glm-4-flash',
      },
      deepseek: {
        baseUrl: 'https://api.deepseek.com/v1',
        apiKey: '',
        model: 'deepseek-chat',
      },
    },

    keywords: [
      'AI', 'artificial intelligence', 'machine learning', 'deep learning',
      'neural network', 'GPT', 'LLM', 'large language model', 'ChatGPT',
      'Claude', 'Gemini', 'OpenAI', 'Anthropic', 'DeepSeek', '人工智能',
      '机器学习', '深度学习', '大模型', '大语言模型', '神经网络',
      'quantum', 'blockchain', 'Web3', 'metaverse', 'AR/VR', '量子',
      '区块链', '元宇宙', 'AGI', 'transformer', 'NLP', 'computer vision',
      'reinforcement learning', 'diffusion', 'generative AI', '生成式AI',
    ],

    temperature: 0.3,
    maxTokens: 2000,
    summaryTemperature: 0.3,
    summaryMaxTokens: 1500,
    requestInterval: 300,
    timeout: 30000,

    prompts: {
      briefingSystem:
        '你是一个专业的科技文章摘要助手。核心原则：摘要必须包含原文中的具体数据、数字、百分比、产品名、模型名、技术细节、研究发现或实验结论，杜绝泛泛概括。禁止使用"本文探讨了""文章分析了""介绍了"等空洞开头，必须直接告诉读者发生了什么、得出了什么结论。所有输出必须使用中文，专有名词（如产品名、公司名、技术术语）可保留英文。',
      briefingUser:
        '请为以下文章生成一个适合个人IP的简报条目。\n\n标题:{title}\n来源:{source}\n链接:{link}\n\n内容:\n{content}\n\n请生成:\n1. 一个简洁准确的中文标题:\n   - 准确反映文章核心内容\n   - 突出关键信息或观点\n   - 避免夸张和标题党\n   - 如果原标题已经很好,可以保留或微调\n   \n2. 一段中文摘要（严格控制在120-150字之间，不得少于120字，不得多于150字），要求逐条遵守:\n   - 必须包含具体信息：至少提及一个原文出现的数据、数字、百分比、产品名、模型名、技术细节或实验结论，缺少时直接说明"原文未提供具体数据或技术细节"\n   - 直接告诉读者"发生了什么"或"得出了什么结论"，禁止使用"本文探讨了""文章分析了""介绍了XX的发展"等概括性开头\n   - 反例："本文探讨了AI在医疗领域的应用前景" → 正例："Google DeepMind发布了Med-PaLM 3，在USMLE医学考试中达到92%准确率，超越人类医生的87%"\n   - 反例："OpenAI发布了新功能" → 正例："OpenAI为ChatGPT增加了代码解释器功能，支持上传CSV/JSON文件并自动生成可视化图表"\n   - 反例："OpenAI通过采用沙箱技术、审批流程和遥测确保Codex安全运行" → 正例："OpenAI公布Codex安全运行细节，其沙箱基于Linux内核Landlock+seccomp，引入Auto-review子代理自动审批低风险操作，并通过OpenTelemetry导出日志集成至SIEM"\n   - 让读者不看原文也能获得充分的信息增量\n   - 字数示例："OpenAI发布了GPT-4 Turbo模型，支持128K上下文窗口，价格降低60%至每1K token输入0.01美元。该模型在MMLU基准测试中达到86.4%准确率，相比GPT-4的86.3%略有提升。新模型还支持函数调用和可复现输出，开发者可通过API立即使用。"（约120字）\n\n3. 3-5个小红书风格标签,如 #AI资讯 #个人IP #模型能力\n\n重要:全部内容必须使用中文撰写,专有名词(如产品名、公司名、技术术语)可保留英文原文。\n\n请按以下JSON格式返回:\n{\n  "title": "标题",\n  "summary": "内容总结",\n  "tags": ["#标签1", "#标签2", "#标签3"]\n}',
      summarizeSystem:
        '你是一个专业的科技文章摘要助手。核心原则：摘要必须包含原文中的具体数据、数字、产品名、技术细节、研究发现或实验结论，而非泛泛概括。禁止使用"本文探讨了""文章分析了"等空洞开头，直接告诉读者发生了什么、得出了什么结论。所有输出必须使用中文，专有名词可保留英文。',
      summarizeUser:
        '请提取以下文章的核心信息，用中文撰写摘要（严格控制在120-150字之间，不得少于120字，不得多于150字）。摘要必须包含至少一个原文提及的具体数据、数字、百分比、产品名、模型名、技术细节或实验结论。如果原文确实缺乏具体信息，摘要中必须明确说明"原文未提供具体数据或技术细节"。禁止空泛概括。\n\n标题：{title}\n\n内容：{content}',
      releaseSystem:
        '你是一个专业的技术文档摘要助手，擅长提炼软件更新的核心内容。所有输出必须使用中文，专有名词可保留英文。摘要必须包含至少一个具体的新功能名称、新工具、新API或实质性的改进参数，避免使用"性能提升""修复了一些问题"等模糊表述。',
      releaseUser:
        '请分析以下 GitHub Release 的更新内容，生成一个简洁的中文摘要。\n\n版本：{version}\n发布时间：{publishedAt}\n链接：{link}\n\n更新内容：\n{content}\n\n要求：\n1. 排除所有 fix/修复、test/测试 相关的内容，不要在摘要中提及\n2. 总结主要的新功能、新特性、重要改进，必须提及至少一个具体的新功能名称或实质改进内容（如新API、新配置项、新工具），禁止用"多项改进"等模糊表述\n3. 如果有特别重要的更新（如新功能、重大改进），用 **加粗** 标记\n4. 摘要严格控制在 120-150 字之间，不得少于120字，不得多于150字\n5. 如果内容全部是修复或测试相关，返回 "无重要更新"\n\n重要：全部内容必须使用中文撰写，专有名词（如产品名、技术术语、函数名等）可保留英文原文。\n\n请直接返回摘要内容，不要包含版本号和发布时间。',
    },
  },

  rss: {
    fetchTimeout: 30000,
    defaultDays: 1,
    targetCount: {
      weekday: 20,
      weekend: 40,
      maxTotal: 100,
    },
    sources: [
      { name: 'OpenAI', url: 'https://openai.com/news/rss.xml', priority: 'high' as const, category: 'AI核心' },
      { name: 'Stratechery', url: 'https://stratechery.com/feed/', priority: 'high' as const, category: '商业分析' },
      { name: 'One Useful Thing', url: 'https://www.oneusefulthing.org/feed', priority: 'high' as const, category: '范式解读' },
      { name: "Lenny's Newsletter", url: 'https://www.lennysnewsletter.com/feed', priority: 'medium' as const, category: '产品/增长/商业' },
      { name: 'MIT Tech Review - AI', url: 'https://www.technologyreview.com/topic/artificial-intelligence/feed/', priority: 'medium' as const, category: '科技媒体' },
      { name: '阮一峰', url: 'https://www.ruanyifeng.com/blog/atom.xml', priority: 'medium' as const, category: '技术博客' },
      { name: 'Simon Willison', url: 'https://simonwillison.net/atom/everything/', priority: 'medium' as const, category: '技术博客' },
      { name: 'n8n Production AI Playbook', url: 'https://blog.n8n.io/tag/production-ai-playbook/rss/', priority: 'medium' as const, category: 'AI应用' },
      { name: 'Google DeepMind', url: 'https://deepmind.google/blog/rss.xml', priority: 'high' as const, category: 'AI核心' },
      { name: 'Ars Technica AI', url: 'https://arstechnica.com/ai/feed/', priority: 'medium' as const, category: '科技媒体' },
      { name: 'The Verge AI', url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml', priority: 'medium' as const, category: '科技媒体' },
      { name: 'Nature Machine Intelligence', url: 'https://www.nature.com/natmachintell.rss', priority: 'medium' as const, category: '学术研究' },
    ] as RSSFeedSource[],
  },

  github: {
    fetchTimeout: 30000,
    sources: [] as GitHubReleaseSource[],
  },

  email: {
    smtp: {
      host: 'smtp.qq.com',
      port: 465,
      secure: true,
      user: '',
      pass: '',
    },
    senderName: 'SignalFeed',
    subjectPrefix: 'SignalFeed',
  },

  branding: {
    email: {
      primary: '#667eea',
      primaryLight: '#e8eaf6',
      primaryDark: '#5c6bc0',
      surface: '#f5f5f5',
      headerEmoji: '📡',
    },
    card: {
      primary: '#4A9B6D',
      primaryLight: '#E6F4EC',
      primaryDark: '#357A52',
      surface: '#F8FAF8',
      border: '#E2E8E6',
      borderLight: '#EEF1EF',
      textPrimary: '#1E293B',
      textSecondary: '#64748B',
      textDisabled: '#94A3B8',
    },
  },

  database: {
    path: path.resolve(PROJECT_ROOT, 'data/signalfeed.db'),
  },
};

export interface RSSFeedSource {
  name: string;
  url: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
  reason?: string;
}

export interface GitHubReleaseSource {
  name: string;
  owner: string;
  repo: string;
  url?: string;
}
