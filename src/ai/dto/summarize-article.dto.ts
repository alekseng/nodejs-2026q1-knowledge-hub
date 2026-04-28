import { IsEnum, IsOptional } from 'class-validator';

export class SummarizeArticleDto {
  @IsOptional()
  @IsEnum(['short', 'medium', 'detailed'])
  maxLength?: 'short' | 'medium' | 'detailed';
}
