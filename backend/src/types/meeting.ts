import { z } from 'zod';

export const MinutesSchema = z.object({
  title: z.string(),
  date: z.string(),
  location: z.string().nullable(),
  attendees: z.array(z.object({ name: z.string(), role: z.string() })),
  agenda: z.array(z.string()),
  discussions: z.array(
    z.object({
      topic: z.string(),
      summary: z.string(),
      key_points: z.array(z.string()),
    })
  ),
  decisions: z.array(z.object({ item: z.string(), owner: z.string() })),
  action_items: z.array(
    z.object({
      task: z.string(),
      owner: z.string(),
      due_date: z.string().nullable(),
      priority: z.enum(['high', 'medium', 'low']),
    })
  ),
  next_meeting: z.string().nullable(),
  summary: z.string(),
});

export type MinutesJSON = z.infer<typeof MinutesSchema>;
