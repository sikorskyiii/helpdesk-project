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
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { QueryOrganizationDto } from './dto/query-organization.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { RequestUser } from '@/common/interfaces/jwt-payload.interface';
import { RoleName } from '@prisma/client';

@ApiTags('organizations')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly orgsService: OrganizationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new organization' })
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateOrganizationDto) {
    return this.orgsService.create(user.id, dto);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: 'List all organizations (super admin)' })
  findAll(@Query() query: QueryOrganizationDto) {
    return this.orgsService.findAll(query);
  }

  @Get('mine')
  @ApiOperation({ summary: 'Get my organizations' })
  findMine(@CurrentUser() user: RequestUser) {
    return this.orgsService.findMine(user.id);
  }

  @Get('roles')
  @ApiOperation({ summary: 'Get available roles' })
  getRoles() {
    return this.orgsService.getRoles();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get organization by ID or slug' })
  findOne(@Param('id') id: string) {
    return this.orgsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update organization (admin only)' })
  update(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.orgsService.update(id, user.id, dto);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get organization statistics' })
  getStats(@Param('id') id: string) {
    return this.orgsService.getStats(id);
  }

  // ─── Members ──────────────────────────────────────────────────────────────

  @Get(':id/members')
  @ApiOperation({ summary: 'List organization members' })
  getMembers(@Param('id') id: string) {
    return this.orgsService.getMembers(id);
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Invite a member to organization' })
  inviteMember(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: InviteMemberDto,
  ) {
    return this.orgsService.inviteMember(id, user.id, dto);
  }

  @Patch(':id/members/:memberId/role')
  @ApiOperation({ summary: 'Update member role' })
  updateMemberRole(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.orgsService.updateMemberRole(id, memberId, user.id, dto);
  }

  @Delete(':id/members/:memberId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove member from organization' })
  removeMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.orgsService.removeMember(id, memberId, user.id);
  }
}
