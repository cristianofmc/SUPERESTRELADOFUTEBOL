import { pgTable, uuid, varchar, timestamp } from "drizzle-orm/pg-core";

export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  crestUrl: varchar("crest_url", { length: 500 }),
  country: varchar("country", { length: 100 }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull(),
});
