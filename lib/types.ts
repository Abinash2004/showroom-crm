import type { ActivityAction, ActivityEntity, LeadStatus } from "@/lib/constants";

export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

/** Authenticated principal derived from the session on every request. */
export interface Actor {
  id: string;
  name: string;
  isAdmin: boolean;
  branchIds: string[];
}

export interface BranchDTO {
  id: string;
  code: string;
  name: string;
  location: string;
  phone: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserDTO {
  id: string;
  code: string;
  name: string;
  phone: string;
  branchIds: string[];
  isAdmin: boolean;
  isActive: boolean;
  hasPassword: boolean;
  isLocked: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface LeadDTO {
  id: string;
  visitDate: string;
  branchId: string;
  branchName: string;
  customerName: string;
  customerPhone: string;
  alternativePhone: string | null;
  customerLocation: string | null;
  vehicleDetails: string | null;
  status: LeadStatus;
  createdAt: string;
  updatedAt: string;
}

export interface InteractionDTO {
  id: string;
  leadId: string;
  outcome: string;
  date: string;
  actionBy: string;
  actionByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface InteractionReportRow extends InteractionDTO {
  customerName: string;
  branchId: string;
  branchName: string;
}

export interface ActivityDTO {
  id: string;
  entity: ActivityEntity;
  entityId: string;
  action: ActivityAction;
  changes: Record<string, { from: Json; to: Json }>;
  actionBy: string;
  actionByName: string;
  actionIP: string;
  createdAt: string;
}

export interface ActiveSessionDTO {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  userIp: string;
  userAgent: string;
  createdAt: string;
  lastActiveAt: string;
  expiresAt: string;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
