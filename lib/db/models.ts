import "server-only";
import mongoose, { Schema, type Model, type Types } from "mongoose";
import { ACTIVITY_ACTIONS, ACTIVITY_ENTITIES, LEAD_STATUSES } from "@/lib/constants";
import type { ActivityAction, ActivityEntity, LeadStatus } from "@/lib/constants";
import type { Json } from "@/lib/types";

type Id = Types.ObjectId;

export interface BranchDoc {
  code: string;
  name: string;
  location: string;
  isActive: boolean;
  phone: string;
  createdBy?: Id | null;
  updatedBy?: Id | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserDoc {
  code: string;
  name: string;
  phone: string;
  passwordHash?: string | null;
  branchIds: Id[];
  isAdmin: boolean;
  isActive: boolean;
  failedAttempt: number;
  lockedUntil?: Date | null;
  lastLoginAt?: Date | null;
  createdBy?: Id | null;
  updatedBy?: Id | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionDoc {
  userId: Id;
  tokenHash: string;
  userIp: string;
  userAgent: string;
  createdAt: Date;
  lastActiveAt: Date;
  expiresAt: Date;
  revokedAt?: Date | null;
}

export interface RateLimitDoc {
  key: string;
  count: number;
  windowEndsAt: Date;
}

export interface LeadDoc {
  visitDate: Date;
  branchId: Id;
  customerName: string;
  customerPhone: string;
  alternativePhone?: string | null;
  customerLocation?: string | null;
  vehicleDetails?: string | null;
  status: LeadStatus;
  createdBy: Id;
  updatedBy: Id;
  createdAt: Date;
  updatedAt: Date;
}

export interface InteractionDoc {
  leadId: Id;
  outcome: string;
  date: Date;
  actionBy: Id;
  createdBy: Id;
  updatedBy: Id;
  createdAt: Date;
  updatedAt: Date;
}

export interface ActivityLogDoc {
  entity: ActivityEntity;
  entityId: Id;
  action: ActivityAction;
  changes: Record<string, { from: Json; to: Json }>;
  actionBy: Id;
  actionIP: string;
  createdAt: Date;
}

function getModel<T>(name: string, schema: Schema<T>): Model<T> {
  // Dev only: drop the model cached on the global mongoose instance so schema edits (e.g. enum changes) apply after HMR.
  if (process.env.NODE_ENV === "development" && mongoose.models[name]) mongoose.deleteModel(name);
  return (mongoose.models[name] as Model<T> | undefined) ?? mongoose.model<T>(name, schema);
}

const ref = (to: string) => ({ type: Schema.Types.ObjectId, ref: to });

const branchSchema = new Schema<BranchDoc>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true },
    phone: { type: String, required: true, trim: true },
    createdBy: { ...ref("User"), default: null },
    updatedBy: { ...ref("User"), default: null },
  },
  { timestamps: true },
);

const userSchema = new Schema<UserDoc>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    passwordHash: { type: String, default: null, select: false },
    branchIds: { type: [ref("Branch")], default: [] },
    isAdmin: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    failedAttempt: { type: Number, default: 0 },
    lockedUntil: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
    createdBy: { ...ref("User"), default: null },
    updatedBy: { ...ref("User"), default: null },
  },
  { timestamps: true },
);

const sessionSchema = new Schema<SessionDoc>(
  {
    userId: { ...ref("User"), required: true },
    tokenHash: { type: String, required: true, unique: true },
    userIp: { type: String, required: true },
    userAgent: { type: String, default: "" },
    lastActiveAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
sessionSchema.index({ userId: 1, revokedAt: 1, expiresAt: 1 });
sessionSchema.index({ revokedAt: 1, expiresAt: 1 });

const rateLimitSchema = new Schema<RateLimitDoc>(
  {
    key: { type: String, required: true, unique: true },
    count: { type: Number, required: true, default: 0 },
    windowEndsAt: { type: Date, required: true },
  },
  { versionKey: false },
);
rateLimitSchema.index({ windowEndsAt: 1 }, { expireAfterSeconds: 0 });

const leadSchema = new Schema<LeadDoc>(
  {
    visitDate: { type: Date, required: true },
    branchId: { ...ref("Branch"), required: true },
    customerName: { type: String, required: true, trim: true },
    customerPhone: { type: String, required: true, trim: true },
    alternativePhone: { type: String, default: null, trim: true },
    customerLocation: { type: String, default: null, trim: true },
    vehicleDetails: { type: String, default: null, trim: true },
    status: { type: String, enum: LEAD_STATUSES, default: "Opened", required: true },
    createdBy: { ...ref("User"), required: true },
    updatedBy: { ...ref("User"), required: true },
  },
  { timestamps: true },
);
leadSchema.index({ branchId: 1, visitDate: -1, _id: -1 });
leadSchema.index({ branchId: 1, status: 1, visitDate: -1 });
leadSchema.index({ customerPhone: 1 });
leadSchema.index({ alternativePhone: 1 }, { sparse: true });

const interactionSchema = new Schema<InteractionDoc>(
  {
    leadId: { ...ref("Lead"), required: true },
    outcome: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
    actionBy: { ...ref("User"), required: true },
    createdBy: { ...ref("User"), required: true },
    updatedBy: { ...ref("User"), required: true },
  },
  { timestamps: true },
);
interactionSchema.index({ leadId: 1, date: -1, _id: -1 });
interactionSchema.index({ date: -1, _id: -1 });

const activityLogSchema = new Schema<ActivityLogDoc>(
  {
    entity: { type: String, enum: ACTIVITY_ENTITIES, required: true },
    entityId: { type: Schema.Types.ObjectId, required: true },
    action: { type: String, enum: ACTIVITY_ACTIONS, required: true },
    changes: { type: Schema.Types.Mixed, default: {} },
    actionBy: { ...ref("User"), required: true },
    actionIP: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, minimize: false },
);
activityLogSchema.index({ entity: 1, entityId: 1, createdAt: -1 });
activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ entity: 1, createdAt: -1 });

// Activity logs are append-only: block every update/delete path at the model layer.
const immutable = (): never => {
  throw new Error("Activity logs are immutable");
};
activityLogSchema.pre(
  ["updateOne", "updateMany", "findOneAndUpdate", "replaceOne", "deleteOne", "deleteMany", "findOneAndDelete", "findOneAndReplace"],
  immutable,
);
activityLogSchema.pre("save", function () {
  if (!this.isNew) immutable();
});

export const BranchModel = getModel("Branch", branchSchema);
export const UserModel = getModel("User", userSchema);
export const SessionModel = getModel("Session", sessionSchema);
export const RateLimitModel = getModel("RateLimit", rateLimitSchema);
export const LeadModel = getModel("Lead", leadSchema);
export const InteractionModel = getModel("Interaction", interactionSchema);
export const ActivityLogModel = getModel("ActivityLog", activityLogSchema);

export const ALL_MODELS = [
  BranchModel,
  UserModel,
  SessionModel,
  RateLimitModel,
  LeadModel,
  InteractionModel,
  ActivityLogModel,
] as const;
