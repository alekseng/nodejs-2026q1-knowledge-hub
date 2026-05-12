import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';

export interface ConversationMessage {
  role: 'user' | 'assistant';
  text: string;
}

interface Session {
  messages: ConversationMessage[];
  lastActivityAt: number;
}

const SESSION_TTL_MS = 60 * 60 * 1000;

@Injectable()
export class RagConversationService {
  private readonly sessions = new Map<string, Session>();
  private readonly maxMessages: number;

  constructor(private readonly configService: ConfigService) {
    this.maxMessages = Number(
      this.configService.get('RAG_CONVERSATION_MAX_MESSAGES', 20),
    );
  }

  createId(): string {
    return randomUUID();
  }

  getHistory(conversationId: string): ConversationMessage[] {
    const session = this.sessions.get(conversationId);
    if (!session) return [];
    if (Date.now() - session.lastActivityAt > SESSION_TTL_MS) {
      this.sessions.delete(conversationId);
      return [];
    }
    return session.messages;
  }

  addMessages(
    conversationId: string,
    userText: string,
    assistantText: string,
  ): void {
    const existing = this.sessions.get(conversationId);
    const messages: ConversationMessage[] = existing?.messages ?? [];

    messages.push({ role: 'user', text: userText });
    messages.push({ role: 'assistant', text: assistantText });

    this.sessions.set(conversationId, {
      messages: messages.slice(-this.maxMessages),
      lastActivityAt: Date.now(),
    });
  }
}
