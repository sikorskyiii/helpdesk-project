import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { QueryNotificationDto } from './dto/query-notification.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { RequestUser } from '@/common/interfaces/jwt-payload.interface';
import { RoleName } from '@prisma/client';

@ApiTags('notifications')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get my notifications' })
  findAll(@CurrentUser() user: RequestUser, @Query() query: QueryNotificationDto) {
    return this.notificationsService.findForUser(user.id, query);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  getUnreadCount(@CurrentUser() user: RequestUser) {
    return this.notificationsService.getUnreadCount(user.id);
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  markAllAsRead(@CurrentUser() user: RequestUser) {
    return this.notificationsService.markAllAsRead(user.id);
  }

  @Delete('clear')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete all read notifications' })
  clearAll(@CurrentUser() user: RequestUser) {
    return this.notificationsService.clearAll(user.id);
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a single notification as read' })
  markAsRead(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.notificationsService.markAsRead(id, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a notification' })
  remove(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.notificationsService.remove(id, user.id);
  }

  @Get('queue-stats')
  @UseGuards(RolesGuard)
  @Roles(RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get BullMQ queue statistics (super admin)' })
  getQueueStats() {
    return this.notificationsService.getQueueStats();
  }
}
