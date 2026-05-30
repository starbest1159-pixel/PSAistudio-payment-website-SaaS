import { pgTable, uuid, varchar, timestamp, text, pgEnum } from 'drizzle-orm/pg-core';

export const botMessageTypeEnum = pgEnum('bot_message_type', ['pain001', 'pacs008', 'pacs009', 'other']);
export const botMessageDirectionEnum = pgEnum('bot_message_direction', ['inbound', 'outbound']);
export const botMessageStatusEnum = pgEnum('bot_message_status', ['pending', 'sent', 'acknowledged', 'rejected']);

export const botMessages = pgTable('bot_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  messageType: botMessageTypeEnum('message_type').notNull(),
  direction: botMessageDirectionEnum('direction').notNull(),
  correlationId: varchar('correlation_id', { length: 100 }),
  payload: text('payload'),
  status: botMessageStatusEnum('status').default('pending').notNull(),
  senderBic: varchar('sender_bic', { length: 11 }),
  receiverBic: varchar('receiver_bic', { length: 11 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  processedAt: timestamp('processed_at'),
});
