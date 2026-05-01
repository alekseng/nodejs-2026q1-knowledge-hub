import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

export interface GeminiMessage {
  role: 'user' | 'model';
  parts: [{ text: string }];
}

const MAX_MESSAGES = 20;
const SESSION_TTL_MS = 30 * 60 * 1000;

interface Session {
  messages: GeminiMessage[];
  lastActivityAt: number;
}

@Injectable()
export class ConversationService {
  private readonly sessions = new Map<string, Session>();

  createSessionId(): string {
    return randomUUID();
  }

  getHistory(sessionId: string): GeminiMessage[] {
    const session = this.sessions.get(sessionId);
    if (!session) return [];
    if (Date.now() - session.lastActivityAt > SESSION_TTL_MS) {
      this.sessions.delete(sessionId);
      return [];
    }
    return session.messages;
  }

  addMessages(sessionId: string, userText: string, modelText: string): void {
    const existing = this.sessions.get(sessionId);
    const messages: GeminiMessage[] = existing?.messages ?? [];

    messages.push({ role: 'user', parts: [{ text: userText }] });
    messages.push({ role: 'model', parts: [{ text: modelText }] });

    this.sessions.set(sessionId, {
      messages: messages.slice(-MAX_MESSAGES),
      lastActivityAt: Date.now(),
    });
  }

  clearSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }
}
