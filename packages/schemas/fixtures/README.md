# Fixture Assets

This directory now contains two kinds of non-production fixture assets:

- `manifests/`: sample dataset manifests matching the schema and lake-layout contracts.
- `datasets/bigdatabowl_2023/`: curated proof-of-concept data derived from the Big Data Bowl research workspace.

The curated 2023 fixture includes:

- `games.csv`: team-scoped recent game summaries for the active Project Edge team context.
- `plays.csv`: real play-level DCI/DIS rows with offense and defense team labels.
- `player_resilience.csv`: derived defender stress-resilience rankings.
- `motion/*.csv`: replay-ready player movement samples with per-frame stress, DCI, and DIS proxies.
- `manifest.json`: provenance, dataset version, team mappings, and sample inventory.

The default API runtime uses this curated fixture through the `bigdatabowl` analytics backend so the dashboard, catalog, and play movement proof of concept all render against real 2023 data instead of the earlier hand-authored bridge corpus.
