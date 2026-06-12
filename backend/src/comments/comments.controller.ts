import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { RequestUser } from '@/common/interfaces/jwt-payload.interface';

@ApiTags('comments')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('tickets/:ticketId/comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all comments for a ticket' })
  findByTicket(
    @Param('ticketId') ticketId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.commentsService.findByTicket(ticketId, user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Add a comment to a ticket' })
  create(
    @Param('ticketId') ticketId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateCommentDto,
  ) {
    return this.commentsService.create(ticketId, user.id, dto);
  }

  @Patch(':commentId')
  @ApiOperation({ summary: 'Edit own comment' })
  update(
    @Param('commentId') commentId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateCommentDto,
  ) {
    return this.commentsService.update(commentId, user.id, dto);
  }

  @Delete(':commentId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a comment' })
  remove(
    @Param('commentId') commentId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.commentsService.remove(commentId, user.id);
  }
}
