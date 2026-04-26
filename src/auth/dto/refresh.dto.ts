import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RefreshDto {
  @ApiProperty({ description: 'Refresh token' })
  @IsString()
  @IsOptional()
  refreshToken?: string;
}
