import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class CommentPaginationDto extends PaginationDto {
  @ApiProperty({
    description: 'ID of the article the comment belongs to',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  @IsUUID('4')
  articleId: string;
}
