import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationsService } from './organizations.service';
import { PrismaService } from '@/database/prisma.service';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { RoleName } from '@prisma/client';

const mockPrisma = {
  organization: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  organizationMember: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  role: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  auditLog: { create: jest.fn() },
  notification: { create: jest.fn() },
  user: { findUnique: jest.fn() },
  ticket: {
    count: jest.fn(),
    groupBy: jest.fn(),
  },
};

describe('OrganizationsService', () => {
  let service: OrganizationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<OrganizationsService>(OrganizationsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create an organization', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(null);
      mockPrisma.role.findUnique.mockResolvedValue({ id: 'role-id', name: RoleName.ORG_ADMIN });
      mockPrisma.organization.create.mockResolvedValue({
        id: 'org-id',
        name: 'Test Org',
        slug: 'test-org',
        ownerId: 'user-id',
        owner: { id: 'user-id', email: 'test@test.com', firstName: 'John', lastName: 'Doe' },
      });
      mockPrisma.auditLog.create.mockResolvedValue({});

      const result = await service.create('user-id', {
        name: 'Test Org',
        slug: 'test-org',
      });

      expect(result.name).toBe('Test Org');
      expect(mockPrisma.organization.create).toHaveBeenCalledTimes(1);
    });

    it('should throw ConflictException if slug is taken', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.create('user-id', { name: 'Test', slug: 'taken-slug' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('removeMember', () => {
    it('should not allow removing the owner', async () => {
      mockPrisma.organizationMember.findFirst
        .mockResolvedValueOnce({ id: 'member-id', userId: 'owner-id', organization: { ownerId: 'owner-id' } }) // removeMember check
        .mockResolvedValue({ role: { name: RoleName.ORG_ADMIN } }); // assertMemberWithRole

      mockPrisma.organizationMember.findFirst.mockImplementation(({ where }) => {
        if (where?.id === 'member-id') {
          return Promise.resolve({ id: 'member-id', userId: 'owner-id', organization: { ownerId: 'owner-id' } });
        }
        return Promise.resolve({ role: { name: RoleName.ORG_ADMIN } });
      });

      await expect(
        service.removeMember('org-id', 'member-id', 'requester-id'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getStats', () => {
    it('should return org statistics', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({ id: 'org-id' });
      mockPrisma.ticket.count
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(3);
      mockPrisma.organizationMember.count.mockResolvedValue(4);
      mockPrisma.ticket.groupBy
        .mockResolvedValueOnce([{ status: 'OPEN', _count: { status: 5 } }])
        .mockResolvedValueOnce([{ priority: 'HIGH', _count: { priority: 3 } }]);

      const result = await service.getStats('org-id');

      expect(result.totalTickets).toBe(10);
      expect(result.openTickets).toBe(5);
      expect(result.totalMembers).toBe(4);
      expect(result.byStatus).toHaveLength(1);
    });

    it('should throw NotFoundException for unknown org', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(null);
      await expect(service.getStats('bad-id')).rejects.toThrow(NotFoundException);
    });
  });
});
