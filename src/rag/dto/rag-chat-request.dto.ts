import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RagChatRequestDto {
  @IsString()
  @IsNotEmpty()
  question: string;

  @IsOptional()
  @IsString()
  conversationId?: string;
}
