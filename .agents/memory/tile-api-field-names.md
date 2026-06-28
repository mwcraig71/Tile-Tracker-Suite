---
name: Tile API Field Names
description: Actual field names returned by the Tile production API, which differ from the documented/intuitive names
---

## Rule

The Tile production API (`production.tile-api.com/api/v1`) uses `tile_uuid` (not `uuid`) as the unique identifier field in the `/tiles/{id}` detail endpoint response.

**Why:** The interface was initially written with `uuid` based on common API conventions. Debug logging of actual response keys revealed the real field is `tile_uuid`. This caused all TileDevice objects to silently have `uuid: undefined`, which broke equipment linking and caused React key prop warnings.

**How to apply:** In `tile-client.ts`, `TileApiResult.result` must use `tile_uuid: string` (not `uuid: string`), and the mapping must use `uuid: r.tile_uuid`.

Other confirmed field names from the detail endpoint (from debug logging):
- `tile_uuid` — unique tile ID
- `name` — tile display name
- `tile_type` — tile type/kind
- `archetype` — tile archetype (LUGGAGE, etc.)
- `is_dead` — battery dead flag
- `firmware_version`, `hw_version`
- `last_tile_state` — nested location object

From the tile states endpoint (`/tiles/tile_states`):
- `tile_id` — same UUID, different field name in states context
