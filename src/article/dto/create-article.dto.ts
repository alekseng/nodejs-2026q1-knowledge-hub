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
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsEnum(ArticleStatus)
  @IsOptional()
  status?: ArticleStatus = ArticleStatus.DRAFT;

  @IsUUID('4')
  @IsOptional()
  authorId?: string | null = null;

  @IsUUID('4')
  @IsOptional()
  categoryId?: string | null = null;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[] = [];
}
