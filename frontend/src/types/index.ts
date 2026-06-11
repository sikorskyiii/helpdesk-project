export type RoleName = 'SUPER_ADMIN' | 'ORG_ADMIN' | 'AGENT' | 'CUSTOMER';

export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type TicketStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'WAITING_CUSTOMER'
  | 'RESOLVED'
  | 'CLOSED';

export type NotificationType =
  | 'TICKET_ASSIGNED'
  | 'STATUS_CHANGED'
  | 'NEW_COMMENT'
  | 'MENTIONED'
  | 'TICKET_CREATED'
  | 'MEMBER_INVITED';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  isEmailVerified: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  isActive: boolean;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  roleId: string;
  joinedAt: string;
  isActive: boolean;
  user: User;
  role: { id: string; name: RoleName };
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  category?: string;
  organizationId: string;
  reporterId: string;
  assigneeId?: string;
  reporter: User;
  assignee?: User;
  resolvedAt?: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  content: string;
  isInternal: boolean;
  ticketId: string;
  authorId: string;
  parentId?: string;
  isEdited: boolean;
  editedAt?: string;
  author: User;
  replies?: Comment[];
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  isRead: boolean;
  userId: string;
  ticketId?: string;
  readAt?: string;
  createdAt: string;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}
