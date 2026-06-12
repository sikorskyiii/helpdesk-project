import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsUUID } from 'class-validator';
import { TicketPriority, TicketStatus } from '@prisma/client';
import { PaginationDto } from '@/common/dto/pagination.dto';

export class QueryTicketDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: TicketStatus })
  @IsEnum(TicketStatus)
  @IsOptional()
  status?: TicketStatus;

  @ApiPropertyOptional({ enum: TicketPriority })
  @IsEnum(TicketPriority)
  @IsOptional()
  priority?: TicketPriority;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  organizationId?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  assigneeId?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  reporterId?: string;

  @ApiPropertyOptional({ example: 'createdAt', default: 'createdAt' })
  @IsString()
  @IsOptional()
  sortBy?: string;

  @ApiPropertyOptional({ example: 'desc', default: 'desc' })
  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc';
}
