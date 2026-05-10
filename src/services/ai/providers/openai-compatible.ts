import OpenAI from 'openai';
import { config } from '../../../config';
import { AIProvider, ChatMessage, ChatOptions } from '../types';

export class OpenAICompatibleProvider implements AIProvider {
  private client: OpenAI;
  private model: string;

  constructor(baseUrl: string, apiKey: string, model: string) {
    this.client = new OpenAI({
      apiKey,
      baseURL: baseUrl,
    });
    this.model = model;
  }

  async chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: options.temperature ?? config.ai.temperature,
      max_tokens: options.maxTokens ?? config.ai.maxTokens,
    });

    return response.choices[0]?.message?.content || '';
  }
}
