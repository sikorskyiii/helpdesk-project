import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength, IsOptional, IsUUID, IsEnum } from 'class-validator';
import { TicketPriority, TicketStatus } from '@prisma/client';

export class UpdateTicketDto {
  @ApiPropertyOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  @IsOptional()
  title?: string;

  @ApiPropertyOptional()
  @IsString()
  @MinLength(10)
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ enum: TicketPriority })
  @IsEnum(TicketPriority)
  @IsOptional()
  priority?: TicketPriority;

  @ApiPropertyOptional({ enum: TicketStatus })
  @IsEnum(TicketStatus)
  @IsOptional()
  status?: TicketStatus;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(100)
  @IsOptional()
  category?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  assigneeId?: string | null;
}
