export class RagChatSourceDto {
  articleId: string;
  articleTitle: string;
  relevantChunk: string;
}

export class RagChatResponseDto {
  answer: string;
  sources: RagChatSourceDto[];
  conversationId: string;
}
