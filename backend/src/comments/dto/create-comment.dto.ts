import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MinLength, IsOptional, IsBoolean, IsUUID, IsArray } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({ example: 'I can reproduce this issue on Chrome 124.' })
  @IsString()
  @MinLength(1)
  content: string;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  isInternal?: boolean;

  @ApiPropertyOptional({ description: 'Reply to parent comment' })
  @IsUUID()
  @IsOptional()
  parentId?: string;

  @ApiPropertyOptional({ description: 'User IDs mentioned in comment', type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  mentionedUserIds?: string[];
}
