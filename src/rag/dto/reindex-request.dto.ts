import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

export class ReindexRequestDto {
  @IsOptional()
  @IsBoolean()
  onlyPublished?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  articleIds?: string[];
}
