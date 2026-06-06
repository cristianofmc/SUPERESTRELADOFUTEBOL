import { pgTable, uuid, varchar, timestamp } from "drizzle-orm/pg-core";
import { phases } from "./phases";

export const groups = pgTable("groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  phaseId: uuid("phase_id")
    .notNull()
    .references(() => phases.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 10 }).notNull(),
  teamIds: uuid("team_ids").array().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull(),
});
