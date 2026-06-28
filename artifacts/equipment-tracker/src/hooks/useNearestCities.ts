import { useEffect, useState } from "react";
import { getNearestCity } from "@/lib/geocoding";

interface TileWithLocation {
  uuid: string;
  latitude?: number | null;
  longitude?: number | null;
}

// Returns a map of tile UUID → nearest city name.
// Updates progressively as geocoding resolves (1/sec due to rate limit).
export function useNearestCities(tiles: TileWithLocation[] | undefined) {
  const [cities, setCities] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (!tiles) return;

    const tilesWithCoords = tiles.filter(
      (t) => t.latitude != null && t.longitude != null
    );

    for (const tile of tilesWithCoords) {
      getNearestCity(tile.latitude!, tile.longitude!).then((city) => {
        setCities((prev) => {
          if (prev.get(tile.uuid) === city) return prev;
          const next = new Map(prev);
          next.set(tile.uuid, city);
          return next;
        });
      });
    }
  }, [tiles]);

  return cities;
}
