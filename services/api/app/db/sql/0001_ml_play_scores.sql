-- Score cache (ADR-0001 cache identity: team_id + model_version + payload_hash).
-- Applied idempotently at startup by app.scoring.cache.ensure_schema when a
-- DATABASE_URL is configured. No migration tool is in the repo yet; this is the
-- canonical DDL and the runtime CREATE source.
CREATE SCHEMA IF NOT EXISTS ml;

CREATE TABLE IF NOT EXISTS ml.play_scores (
    team_id       uuid              NOT NULL,
    model_version text              NOT NULL,
    payload_hash  text              NOT NULL,
    play_id       text              NOT NULL,  -- provenance only, never part of identity
    dci           double precision,
    dis           double precision,
    score_status  text              NOT NULL DEFAULT 'scored',
    frame_scores  jsonb             NOT NULL DEFAULT '[]'::jsonb,
    created_at    timestamptz       NOT NULL DEFAULT now(),
    PRIMARY KEY (team_id, model_version, payload_hash)
);

-- Tenancy is enforced in the database, not just the application WHERE clause.
-- Every connection sets app.current_team_id (see DatabaseSessionManager.scoped_connection);
-- FORCE makes the policy apply even to the table owner. `true` on current_setting means
-- "no team context -> no rows" (fail closed) rather than erroring.
ALTER TABLE ml.play_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml.play_scores FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS play_scores_team_isolation ON ml.play_scores;
CREATE POLICY play_scores_team_isolation ON ml.play_scores
    USING (team_id = current_setting('app.current_team_id', true)::uuid)
    WITH CHECK (team_id = current_setting('app.current_team_id', true)::uuid);
