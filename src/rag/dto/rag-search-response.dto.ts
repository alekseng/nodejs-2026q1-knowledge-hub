export class RagSearchResultDto {
  articleId: string;
  articleTitle: string;
  chunk: string;
  similarity: number;
}

export class RagSearchResponseDto {
  results: RagSearchResultDto[];
}
