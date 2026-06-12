import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength, IsOptional, IsUUID, IsEnum } from 'class-validator';
import { TicketPriority } from '@prisma/client';

export class CreateTicketDto {
  @ApiProperty({ example: 'Cannot login to the system' })
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  title: string;

  @ApiProperty({ example: 'I get a 401 error when trying to login...' })
  @IsString()
  @MinLength(10)
  description: string;

  @ApiPropertyOptional({ enum: TicketPriority, default: 'MEDIUM' })
  @IsEnum(TicketPriority)
  @IsOptional()
  priority?: TicketPriority;

  @ApiPropertyOptional({ example: 'billing' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  category?: string;

  @ApiProperty({ example: 'org-uuid' })
  @IsUUID()
  organizationId: string;

  @ApiPropertyOptional({ example: 'agent-uuid' })
  @IsUUID()
  @IsOptional()
  assigneeId?: string;
}
