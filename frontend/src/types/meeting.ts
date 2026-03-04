export type MeetingStatus = 'pending' | 'processing' | 'done' | 'failed';

export interface Attendee {
  name: string;
  role?: string;
}

export interface ActionItem {
  task: string;
  owner: string;
  due_date: string | null;
  priority: 'high' | 'medium' | 'low';
}

export interface Discussion {
  topic: string;
  summary: string;
  key_points: string[];
}

export interface MinutesJSON {
  title: string;
  date: string;
  location: string | null;
  attendees: { name: string; role: string }[];
  agenda: string[];
  discussions: Discussion[];
  decisions: { item: string; owner: string }[];
  action_items: ActionItem[];
  next_meeting: string | null;
  summary: string;
}

export interface Meeting {
  id: string;
  userId?: string;
  title: string;
  metAt: string;
  status: MeetingStatus;
  transcriptRaw?: string | null;
  minutes?: MinutesJSON | null;
  attendees: Attendee[];
  agenda?: string | null;
  fileKey?: string | null;
  shareToken?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateMeetingInput {
  title: string;
  metAt: string;
  attendees?: Attendee[];
  agenda?: string;
}

export interface ListMeetingsParams {
  page?: number;
  limit?: number;
  search?: string;
  from?: string;
  to?: string;
  status?: MeetingStatus;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
