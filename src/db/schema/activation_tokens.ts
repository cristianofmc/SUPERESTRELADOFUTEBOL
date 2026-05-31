import { pgTable, uuid, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";

export const activationTokens = pgTable("user_activation_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),

  usedAt: timestamp("used_at", { withTimezone: true }),

  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),

  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
