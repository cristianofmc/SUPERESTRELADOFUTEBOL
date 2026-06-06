import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  integer,
} from "drizzle-orm/pg-core";
import { phases } from "./phases";
import { groups } from "./groups";
import { teams } from "./teams";

export const matches = pgTable("matches", {
  id: uuid("id").primaryKey().defaultRandom(),
  phaseId: uuid("phase_id")
    .notNull()
    .references(() => phases.id, { onDelete: "cascade" }),
  groupId: uuid("group_id").references(() => groups.id, {
    onDelete: "set null",
  }),
  homeTeamId: uuid("home_team_id").references(() => teams.id, {
    onDelete: "set null",
  }),
  awayTeamId: uuid("away_team_id").references(() => teams.id, {
    onDelete: "set null",
  }),
  roundNumber: integer("round_number"),
  homeScore: integer("home_score"),
  awayScore: integer("away_score"),
  homeScoreEt: integer("home_score_et"),
  awayScoreEt: integer("away_score_et"),
  homeScorePen: integer("home_score_pen"),
  awayScorePen: integer("away_score_pen"),
  bracketCode: varchar("bracket_code", { length: 20 }),
  status: varchar("status", { length: 20 }).notNull().default("SCHEDULED"),
  matchDate: timestamp("match_date", { withTimezone: true, mode: "date" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull(),
});
