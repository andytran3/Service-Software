import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { requestsApi } from './api';
import type { CreateRequestInput, RequestStatus } from './types';

export const requestKeys = {
  all: ['requests'] as const,
  list: () => [...requestKeys.all, 'list'] as const,
  detail: (id: string) => [...requestKeys.all, 'detail', id] as const,
};

export function useRequests() {
  return useQuery({ queryKey: requestKeys.list(), queryFn: requestsApi.list });
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
      await queryClient.invalidateQueries({ queryKey: requestKeys.list() });
    },
  });
}

export function useUpdateRequestStatus(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (status: RequestStatus) => requestsApi.updateStatus(id, status),
    onSuccess: async (updated) => {
      queryClient.setQueryData(requestKeys.detail(id), updated);
      await queryClient.invalidateQueries({ queryKey: requestKeys.list() });
    },
  });
}
