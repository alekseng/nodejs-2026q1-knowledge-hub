import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GenerateDto {
  @IsString()
  @IsNotEmpty()
  prompt!: string;

  @IsOptional()
  @IsString()
  sessionId?: string;
}
