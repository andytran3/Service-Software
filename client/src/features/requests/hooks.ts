import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { requestsApi } from './api';
import { selectOpenRequests } from './openRequests';
import type { CreateRequestInput, RequestStatus } from './types';

export const requestKeys = {
  all: ['requests'] as const,
  /** Prefix of every list query, used to refresh all of them after a change. */
  lists: () => [...requestKeys.all, 'list'] as const,
  list: (params: RequestListParams = {}) =>
    [...requestKeys.lists(), { q: params.q ?? '' }] as const,
  detail: (id: string) => [...requestKeys.all, 'detail', id] as const,
};

export interface RequestListParams {
  /** Search text; omitted or empty means every request. */
  q?: string;
}

export function useRequests(params: RequestListParams = {}) {
  return useQuery({
    queryKey: requestKeys.list(params),
    queryFn: () => requestsApi.list(params),
  });
}

/**
 * The open requests for the landing page. Reads the same cached list as the request list page
 * (no search) and selects from it, so both pages share one request and stay in sync.
 */
export function useOpenRequests() {
  return useQuery({
    queryKey: requestKeys.list(),
    queryFn: () => requestsApi.list(),
    select: selectOpenRequests,
  });
}

export function useRequest(id: string) {
  return useQuery({ queryKey: requestKeys.detail(id), queryFn: () => requestsApi.get(id) });
}

export function useCreateRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRequestInput) => requestsApi.create(input),
    onSuccess: async (created) => {
      queryClient.setQueryData(requestKeys.detail(created.id), created);
      await queryClient.invalidateQueries({ queryKey: requestKeys.lists() });
    },
  });
}

export function useUpdateRequestStatus(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (status: RequestStatus) => requestsApi.updateStatus(id, status),
    onSuccess: async (updated) => {
      queryClient.setQueryData(requestKeys.detail(id), updated);
      await queryClient.invalidateQueries({ queryKey: requestKeys.lists() });
    },
  });
}
