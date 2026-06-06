import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  integer,
} from "drizzle-orm/pg-core";
import { competitions } from "./competitions";

export const phases = pgTable("phases", {
  id: uuid("id").primaryKey().defaultRandom(),
  competitionId: uuid("competition_id")
    .notNull()
    .references(() => competitions.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  orderIndex: integer("order_index").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull(),
});
