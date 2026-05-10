import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { ArticleStatus } from '../article.interface';

export class CreateArticleDto {
  @ApiProperty({
    description: 'Article title',
    example: 'Introduction to Nest.js',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Article content',
    example: 'Long article content here...',
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({
    description: 'Article status',
    enum: ArticleStatus,
    default: ArticleStatus.DRAFT,
  })
  @IsEnum(ArticleStatus)
  @IsOptional()
  status?: ArticleStatus = ArticleStatus.DRAFT;

  @ApiPropertyOptional({
    description: 'ID of the user who created the article',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID('4')
  @IsOptional()
  authorId?: string | null = null;

  @ApiPropertyOptional({
    description: 'ID of the category the article belongs to',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsUUID('4')
  @IsOptional()
  categoryId?: string | null = null;

  @ApiPropertyOptional({
    description: 'List of tags for the article',
    example: ['nestjs', 'typescript', 'backend'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[] = [];
}
