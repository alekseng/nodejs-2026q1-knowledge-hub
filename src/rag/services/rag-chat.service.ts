import { Injectable } from '@nestjs/common';
import { GeminiService } from '../../ai/services/gemini.service';
import { RagChatRequestDto } from '../dto/rag-chat-request.dto';
import { RagChatResponseDto } from '../dto/rag-chat-response.dto';
import { ChunkPayload, QdrantService } from './qdrant.service';
import { RagConversationService } from './rag-conversation.service';

const RETRIEVAL_LIMIT = 5;

function buildPrompt(
  question: string,
  chunks: ChunkPayload[],
  history: { role: string; text: string }[],
): string {
  const context = chunks
    .map((c) => `[Article: "${c.articleTitle}"]\n${c.chunk}`)
    .join('\n\n---\n\n');

  const historyText = history
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`)
    .join('\n');

  return `You are a helpful assistant that answers questions using only the provided knowledge base articles.

Context from knowledge base:
---
${context}
---
${historyText ? `\nConversation history:\n${historyText}\n` : ''}
User: ${question}

Answer based solely on the context above. If the context does not contain enough information, clearly say so. Cite relevant article titles in your answer.`;
}

@Injectable()
export class RagChatService {
  constructor(
    private readonly gemini: GeminiService,
    private readonly qdrant: QdrantService,
    private readonly conversation: RagConversationService,
  ) {}

  async chat(dto: RagChatRequestDto): Promise<RagChatResponseDto> {
    const conversationId = dto.conversationId ?? this.conversation.createId();
    const history = this.conversation.getHistory(conversationId);

    const vector = await this.gemini.generateEmbedding(dto.question);
    const searchResults = await this.qdrant.search(vector, RETRIEVAL_LIMIT);

    const chunks = searchResults.map((r) => r.payload);
    const prompt = buildPrompt(dto.question, chunks, history);

    const { text: answer } = await this.gemini.generate(prompt);

    this.conversation.addMessages(conversationId, dto.question, answer);

    const sources = chunks.map((c) => ({
      articleId: c.articleId,
      articleTitle: c.articleTitle,
      relevantChunk: c.chunk,
    }));

    return { answer, sources, conversationId };
  }
}
