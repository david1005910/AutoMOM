import Bull from 'bull';
import { config } from '../config';

export const transcribeQueue = new Bull('transcribe', {
  redis: config.REDIS_URL,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

export const summarizeQueue = new Bull('summarize', {
  redis: config.REDIS_URL,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});
