import type { Request as RequestRecord } from '../../generated/prisma/client.js';
import type { RequestStatus, RequestType } from '../../generated/prisma/enums.js';
import type { RequestStatusLabel, RequestTypeLabel } from './schemas.js';

/** A request as returned by the API. */
export interface RequestDto {
  id: string;
  title: string;
  description: string;
  type: RequestTypeLabel;
  status: RequestStatusLabel;
  createdAt: string;
  updatedAt: string;
}

const statusLabels: Record<RequestStatus, RequestStatusLabel> = {
  NEW: 'New',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
};

const statusValues: Record<RequestStatusLabel, RequestStatus> = {
  New: 'NEW',
  'In Progress': 'IN_PROGRESS',
  Completed: 'COMPLETED',
};

const typeLabels: Record<RequestType, RequestTypeLabel> = {
  IT: 'IT',
  FACILITIES: 'Facilities',
  HR: 'HR',
  OTHER: 'Other',
};

const typeValues: Record<RequestTypeLabel, RequestType> = {
  IT: 'IT',
  Facilities: 'FACILITIES',
  HR: 'HR',
  Other: 'OTHER',
};

export function toRequestDto(record: RequestRecord): RequestDto {
  return {
    id: record.id,
    title: record.title,
    description: record.description,
    type: typeLabels[record.type],
    status: statusLabels[record.status],
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export function toPrismaStatus(label: RequestStatusLabel): RequestStatus {
  return statusValues[label];
}

export function toPrismaType(label: RequestTypeLabel): RequestType {
  return typeValues[label];
}
