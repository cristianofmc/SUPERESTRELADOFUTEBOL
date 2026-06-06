import { pgTable, uuid, varchar, timestamp } from "drizzle-orm/pg-core";

export const competitions = pgTable("competitions", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  rulesKey: varchar("rules_key", { length: 100 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("UPCOMING"),
  teamIds: uuid("team_ids").array().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull(),
});
