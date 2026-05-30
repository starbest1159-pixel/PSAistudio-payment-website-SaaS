import { pgTable, uuid, varchar, text, timestamp, jsonb, integer } from 'drizzle-orm/pg-core';

export const botJobs = pgTable('bot_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  botId: varchar('bot_id', { length: 50 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  status: varchar('status', { length: 20 }).default('idle'),
  payload: jsonb('payload'),
  result: jsonb('result'),
  retries: integer('retries').default(0),
  errorMessage: text('error_message'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow(),
});
