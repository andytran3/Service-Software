import { Prisma, type PrismaClient } from '../../generated/prisma/client.js';
import { toPrismaStatus, toPrismaType, toRequestDto, type RequestDto } from './mappers.js';
import type { CreateRequestInput, ListRequestsQuery, RequestStatusLabel } from './schemas.js';

export interface RequestsService {
  create(input: CreateRequestInput): Promise<RequestDto>;
  /**
   * Newest first. With `q`, only requests whose title or description contains it (any case), or
   * whose ID starts with it when `q` looks like an ID (see idPrefixRange).
   */
  list(query?: Partial<ListRequestsQuery>): Promise<RequestDto[]>;
  /** Returns null when no request has this id. */
  getById(id: string): Promise<RequestDto | null>;
  /** Returns null when no request has this id. */
  updateStatus(id: string, status: RequestStatusLabel): Promise<RequestDto | null>;
}

/** The fewest hex digits that count as an ID search: the short ID shown in the UI. */
export const ID_SEARCH_MIN_DIGITS = 8;
const UUID_HEX_DIGITS = 32;

function toUuid(hex: string): string {
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join('-');
}

/**
 * The range of IDs that start with `q`, when `q` is 8 to 32 hex digits (dashes and a leading
 * "#" ignored, any case); otherwise undefined. Prisma cannot run `contains` on a uuid column,
 * but PostgreSQL compares uuids byte by byte, so a prefix is the range from the prefix padded
 * with 0s to the prefix padded with fs, which also uses the primary key index. Shorter text is
 * not treated as an ID, so words made of hex letters ("bad", "cafe") do not match IDs.
 */
export function idPrefixRange(q: string): { gte: string; lte: string } | undefined {
  const hex = q.replace(/^#/, '').replaceAll('-', '').toLowerCase();
  if (hex.length < ID_SEARCH_MIN_DIGITS || hex.length > UUID_HEX_DIGITS) return undefined;
  if (!/^[0-9a-f]+$/.test(hex)) return undefined;
  return {
    gte: toUuid(hex.padEnd(UUID_HEX_DIGITS, '0')),
    lte: toUuid(hex.padEnd(UUID_HEX_DIGITS, 'f')),
  };
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

    async list({ q } = {}) {
      // Prisma escapes % and _ in `contains`, but not the backslash, which PostgreSQL LIKE
      // treats as its escape character. Doubling it makes every character match literally.
      const term = q?.replaceAll('\\', '\\\\');
      const idRange = q ? idPrefixRange(q) : undefined;
      const records = await prisma.request.findMany({
        where: term
          ? {
              OR: [
                { title: { contains: term, mode: 'insensitive' } },
                { description: { contains: term, mode: 'insensitive' } },
                ...(idRange ? [{ id: idRange }] : []),
              ],
            }
          : undefined,
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
