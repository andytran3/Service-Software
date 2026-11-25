import { Prisma, type PrismaClient } from '../../generated/prisma/client.js';
import { toPrismaStatus, toPrismaType, toRequestDto, type RequestDto } from './mappers.js';
import type { CreateRequestInput, RequestStatusLabel } from './schemas.js';

export interface RequestsService {
  create(input: CreateRequestInput): Promise<RequestDto>;
  list(): Promise<RequestDto[]>;
  /** Returns null when no request has this id. */
  getById(id: string): Promise<RequestDto | null>;
  /** Returns null when no request has this id. */
  updateStatus(id: string, status: RequestStatusLabel): Promise<RequestDto | null>;
}

/** Prisma's "record required for the operation was not found" error. */
function isRecordNotFound(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025';
}

export function createRequestsService(prisma: PrismaClient): RequestsService {
  return {
    async create({ title, description, type }) {
      // Status is not accepted from clients; the database default sets it to New.
      const record = await prisma.request.create({
        data: { title, description, type: toPrismaType(type) },
      });
      return toRequestDto(record);
    },

    async list() {
      const records = await prisma.request.findMany({
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      });
      return records.map(toRequestDto);
    },

    async getById(id) {
      const record = await prisma.request.findUnique({ where: { id } });
      return record ? toRequestDto(record) : null;
    },

    async updateStatus(id, status) {
      // A single update (no prior lookup) avoids a race; a missing row surfaces as P2025.
      try {
        const record = await prisma.request.update({
          where: { id },
          data: { status: toPrismaStatus(status) },
        });
        return toRequestDto(record);
      } catch (error) {
        if (isRecordNotFound(error)) return null;
        throw error;
      }
    },
  };
}
