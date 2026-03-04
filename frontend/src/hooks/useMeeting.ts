import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { meetingsApi } from '@/api/meetings';
import type { CreateMeetingInput, ListMeetingsParams, Meeting } from '@/types/meeting';

export function useMeetings(params?: ListMeetingsParams) {
  return useQuery({
    queryKey: ['meetings', params],
    queryFn: () => meetingsApi.list(params).then((r) => r.data),
  });
}

export function useMeeting(id: string) {
  return useQuery({
    queryKey: ['meeting', id],
    queryFn: () => meetingsApi.get(id).then((r) => r.data.data.meeting),
    enabled: !!id,
  });
}

export function useCreateMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMeetingInput) =>
      meetingsApi.create(input).then((r) => r.data.data.meeting),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meetings'] }),
  });
}

export function useUpdateMeeting(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Meeting>) =>
      meetingsApi.update(id, data).then((r) => r.data.data.meeting),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meeting', id] });
      qc.invalidateQueries({ queryKey: ['meetings'] });
    },
  });
}

export function useDeleteMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => meetingsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meetings'] }),
  });
}

export function useUploadUrl(id: string) {
  return useMutation({
    mutationFn: (body: { filename: string; contentType: string; fileSize: number }) =>
      meetingsApi.getUploadUrl(id, body).then((r) => r.data.data),
  });
}

export function useTranscribe(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (fileKey: string) => meetingsApi.transcribe(id, fileKey),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meeting', id] }),
  });
}

export function useSharedMeeting(token: string) {
  return useQuery({
    queryKey: ['shared', token],
    queryFn: () => meetingsApi.getShared(token).then((r) => r.data.data.meeting),
    enabled: !!token,
  });
}
