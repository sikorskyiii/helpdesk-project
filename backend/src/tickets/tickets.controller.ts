import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { QueryTicketDto } from './dto/query-ticket.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { RequestUser } from '@/common/interfaces/jwt-payload.interface';

@ApiTags('tickets')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new ticket' })
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateTicketDto) {
    return this.ticketsService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List tickets with filters, search, pagination' })
  findAll(@CurrentUser() user: RequestUser, @Query() query: QueryTicketDto) {
    return this.ticketsService.findAll(user.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get ticket by ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.ticketsService.findOne(id, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update ticket' })
  update(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateTicketDto,
  ) {
    return this.ticketsService.update(id, user.id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete ticket' })
  remove(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.ticketsService.remove(id, user.id);
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Get ticket change history' })
  getHistory(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.ticketsService.getHistory(id, user.id);
  }

  @Patch(':id/assign')
  @ApiOperation({ summary: 'Assign ticket to user (null to unassign)' })
  assign(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @Body('assigneeId') assigneeId: string | null,
  ) {
    return this.ticketsService.assign(id, assigneeId, user.id);
  }
}
