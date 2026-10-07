-- First-party product usage counters for the admin Statistics tab. Deliberately no plate/VIN, IP or user id:
-- only what was done (kind), in which UI language, whether it hit, and whether the visitor was signed in.
-- Not re-ingestable, like the rest of the `app` schema.
CREATE TABLE app.usage_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  at timestamptz NOT NULL DEFAULT now(),
  kind text NOT NULL,
  lang text,
  found boolean,
  signed_in boolean NOT NULL DEFAULT false
);

CREATE INDEX usage_events_at_kind_idx ON app.usage_events (at, kind);
