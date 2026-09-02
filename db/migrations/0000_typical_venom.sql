CREATE TABLE "bets" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"market_id" integer NOT NULL,
	"outcome_id" integer NOT NULL,
	"stake" integer NOT NULL,
	"weight_bp" integer DEFAULT 100 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "board_state" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"weekend_closed" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "claims" (
	"id" serial PRIMARY KEY NOT NULL,
	"market_id" integer NOT NULL,
	"claimant_id" integer NOT NULL,
	"outcome_id" integer NOT NULL,
	"quote" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ledger" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"delta" integer NOT NULL,
	"reason" text NOT NULL,
	"ref" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "markets" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"blurb" text DEFAULT '' NOT NULL,
	"category" text NOT NULL,
	"kind" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"locks_at" timestamp with time zone NOT NULL,
	"sealed" boolean DEFAULT false NOT NULL,
	"claimable" boolean DEFAULT false NOT NULL,
	"blocked" text[] DEFAULT '{}' NOT NULL,
	"max_stake" integer NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"resolved_outcome_id" integer,
	"resolution_note" text,
	"resolved_at" timestamp with time zone,
	CONSTRAINT "markets_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "outcomes" (
	"id" serial PRIMARY KEY NOT NULL,
	"market_id" integer NOT NULL,
	"label" text NOT NULL,
	"seed_units" integer DEFAULT 0 NOT NULL,
	"subject_slug" text,
	"sort" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"emoji" text DEFAULT '🎲' NOT NULL,
	"pin_hash" text NOT NULL,
	"is_commissioner" boolean DEFAULT false NOT NULL,
	CONSTRAINT "players_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "bets" ADD CONSTRAINT "bets_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bets" ADD CONSTRAINT "bets_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bets" ADD CONSTRAINT "bets_outcome_id_outcomes_id_fk" FOREIGN KEY ("outcome_id") REFERENCES "public"."outcomes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_claimant_id_players_id_fk" FOREIGN KEY ("claimant_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_outcome_id_outcomes_id_fk" FOREIGN KEY ("outcome_id") REFERENCES "public"."outcomes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger" ADD CONSTRAINT "ledger_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outcomes" ADD CONSTRAINT "outcomes_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bets_market_idx" ON "bets" USING btree ("market_id");--> statement-breakpoint
CREATE INDEX "bets_player_idx" ON "bets" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "claims_market_idx" ON "claims" USING btree ("market_id");--> statement-breakpoint
CREATE INDEX "ledger_player_idx" ON "ledger" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "outcomes_market_idx" ON "outcomes" USING btree ("market_id");