import { Test, TestingModule } from '@nestjs/testing';
import { TicketsService } from './tickets.service';
import { PrismaService } from '@/database/prisma.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { TicketStatus, TicketPriority } from '@prisma/client';

const mockTicket = {
  id: 'ticket-id',
  title: 'Test Ticket',
  description: 'Test description for ticket',
  priority: TicketPriority.MEDIUM,
  status: TicketStatus.OPEN,
  category: null,
  organizationId: 'org-id',
  reporterId: 'user-id',
  assigneeId: null,
  resolvedAt: null,
  closedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPrisma = {
  ticket: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  ticketHistory: {
    createMany: jest.fn(),
    findMany: jest.fn(),
  },
  organizationMember: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
  },
  auditLog: { create: jest.fn() },
  notification: { create: jest.fn() },
};

describe('TicketsService', () => {
  let service: TicketsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<TicketsService>(TicketsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a ticket', async () => {
      mockPrisma.organizationMember.findFirst.mockResolvedValue({ id: 'm1' });
      mockPrisma.ticket.create.mockResolvedValue({ ...mockTicket, reporter: {}, organization: {} });
      mockPrisma.auditLog.create.mockResolvedValue({});

      const result = await service.create('user-id', {
        title: 'Test Ticket',
        description: 'Test description for ticket',
        organizationId: 'org-id',
      });

      expect(result.title).toBe('Test Ticket');
      expect(mockPrisma.ticket.create).toHaveBeenCalledTimes(1);
    });

    it('should throw ForbiddenException if not org member', async () => {
      mockPrisma.organizationMember.findFirst.mockResolvedValue(null);

      await expect(
        service.create('user-id', {
          title: 'Test Ticket',
          description: 'Test description',
          organizationId: 'org-id',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findOne', () => {
    it('should return ticket with history', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue({
        ...mockTicket,
        reporter: {},
        assignee: null,
        organization: {},
        history: [],
      });
      mockPrisma.organizationMember.findFirst.mockResolvedValue({ id: 'm1' });

      const result = await service.findOne('ticket-id', 'user-id');
      expect(result.id).toBe('ticket-id');
    });

    it('should throw NotFoundException for unknown ticket', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(null);
      await expect(service.findOne('bad-id', 'user-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update ticket and create history', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(mockTicket);
      mockPrisma.organizationMember.findFirst.mockResolvedValue({ id: 'm1', role: { name: 'AGENT' } });
      mockPrisma.ticket.update.mockResolvedValue({
        ...mockTicket,
        status: TicketStatus.IN_PROGRESS,
        reporter: {},
        organization: {},
      });
      mockPrisma.ticketHistory.createMany.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});

      const result = await service.update('ticket-id', 'user-id', {
        status: TicketStatus.IN_PROGRESS,
      });

      expect(result.status).toBe(TicketStatus.IN_PROGRESS);
      expect(mockPrisma.ticketHistory.createMany).toHaveBeenCalledTimes(1);
    });

    it('should set resolvedAt when status changes to RESOLVED', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(mockTicket);
      mockPrisma.organizationMember.findFirst.mockResolvedValue({ id: 'm1', role: { name: 'AGENT' } });
      mockPrisma.ticket.update.mockResolvedValue({
        ...mockTicket,
        status: TicketStatus.RESOLVED,
        resolvedAt: new Date(),
        reporter: {},
        organization: {},
      });
      mockPrisma.ticketHistory.createMany.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});
      mockPrisma.notification.create.mockResolvedValue({});

      const updateCall = mockPrisma.ticket.update.mock;
      await service.update('ticket-id', 'user-id', { status: TicketStatus.RESOLVED });

      const dataArg = mockPrisma.ticket.update.mock.calls[0][0].data;
      expect(dataArg.resolvedAt).toBeDefined();
    });
  });

  describe('remove', () => {
    it('should delete ticket by reporter', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(mockTicket);
      mockPrisma.organizationMember.findFirst.mockResolvedValue(null);
      mockPrisma.ticket.delete.mockResolvedValue(mockTicket);
      mockPrisma.auditLog.create.mockResolvedValue({});

      const result = await service.remove('ticket-id', 'user-id');
      expect(result.message).toBe('Ticket deleted');
    });

    it('should throw ForbiddenException if not reporter or admin', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue({ ...mockTicket, reporterId: 'other-user' });
      mockPrisma.organizationMember.findFirst.mockResolvedValue(null);

      await expect(service.remove('ticket-id', 'user-id')).rejects.toThrow(ForbiddenException);
    });
  });
});
