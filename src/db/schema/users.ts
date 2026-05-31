import { pgTable, uuid, varchar, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),

  username: varchar("username", { length: 30 }).notNull().unique(),

  email: varchar("email", { length: 254 }).notNull().unique(),

  password: varchar("password", { length: 255 }).notNull(),

  features: varchar("features", { length: 255 }).array().notNull().default([]),

  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull(),

  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull(),
});
