import { apiClient } from './client';
import type { Meeting, CreateMeetingInput, ListMeetingsParams, PaginationMeta } from '@/types/meeting';

export const meetingsApi = {
  list: (params?: ListMeetingsParams) =>
    apiClient.get<{ data: Meeting[]; meta: PaginationMeta }>('/meetings', { params }),

  get: (id: string) =>
    apiClient.get<{ data: { meeting: Meeting } }>(`/meetings/${id}`),

  create: (input: CreateMeetingInput) =>
    apiClient.post<{ data: { meeting: Meeting } }>('/meetings', input),

  update: (id: string, data: Partial<Meeting>) =>
    apiClient.patch<{ data: { meeting: Meeting } }>(`/meetings/${id}`, data),

  delete: (id: string) => apiClient.delete(`/meetings/${id}`),

  getUploadUrl: (id: string, body: { filename: string; contentType: string; fileSize: number }) =>
    apiClient.post<{ data: { uploadUrl: string; fileKey: string } }>(`/meetings/${id}/upload`, body),

  transcribe: (id: string, fileKey: string) =>
    apiClient.post(`/meetings/${id}/transcribe`, { fileKey }),

  export: (id: string, format: 'pdf' | 'docx' | 'md') =>
    apiClient.post<{ data: { downloadUrl: string } }>(`/meetings/${id}/export`, { format }),

  share: (id: string, expiresIn: '7d' | '30d' | 'never') =>
    apiClient.post<{ data: { shareToken: string; shareUrl: string } }>(`/meetings/${id}/share`, { expiresIn }),

  getShared: (token: string) =>
    apiClient.get<{ data: { meeting: Meeting } }>(`/shared/${token}`),
};
