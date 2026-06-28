import { useEffect, useState } from "react";
import { useGetTiles, getGetTilesQueryKey } from "@workspace/api-client-react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import type { LatLngBounds, LatLngTuple } from "leaflet";
import { Skeleton } from "@/components/ui/skeleton";
import { getTileIcon } from "@/lib/map-icons";
import { TileStatusBadge } from "@/components/TileStatusBadge";
import { Link } from "wouter";

function MapController({ bounds }: { bounds: LatLngBounds | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [bounds, map]);
  return null;
}

export default function MapPage() {
  const { data: tiles, isLoading } = useGetTiles({
    query: { queryKey: getGetTilesQueryKey() }
  });

  const [bounds, setBounds] = useState<LatLngBounds | null>(null);

  useEffect(() => {
    if (tiles && tiles.length > 0) {
      import("leaflet").then((L) => {
        const points = tiles
          .filter(t => t.latitude != null && t.longitude != null)
          .map(t => [t.latitude!, t.longitude!] as LatLngTuple);

        if (points.length > 0) {
          setBounds(L.latLngBounds(points));
        }
      });
    }
  }, [tiles]);

  if (isLoading) {
    return <div className="h-full w-full p-4"><Skeleton className="h-full w-full bg-card rounded-none" /></div>;
  }

  return (
    <div className="h-full w-full flex flex-col relative">
      {/* Legend — top-left on desktop, top-left on mobile with smaller offset */}
      <div className="absolute top-3 left-3 md:top-4 md:left-4 z-[1000] pointer-events-none">
        <div className="bg-background/90 backdrop-blur border border-border p-2 md:p-3 shadow-lg pointer-events-auto flex flex-col gap-1.5 md:gap-2">
          <h2 className="font-mono text-xs uppercase tracking-wider text-primary font-bold border-b border-border pb-1.5 mb-0.5">
            Signal Status
          </h2>
          <div className="flex items-center gap-2 font-mono text-xs text-foreground">
            <div className="w-2.5 h-2.5 md:w-3 md:h-3 bg-green-500 border border-green-700 rounded-full flex-shrink-0" /> Active
          </div>
          <div className="flex items-center gap-2 font-mono text-xs text-foreground">
            <div className="w-2.5 h-2.5 md:w-3 md:h-3 bg-red-500 border border-red-700 rounded-full flex-shrink-0" /> Lost
          </div>
          <div className="flex items-center gap-2 font-mono text-xs text-foreground">
            <div className="w-2.5 h-2.5 md:w-3 md:h-3 bg-gray-500 border border-gray-700 rounded-full flex-shrink-0" /> Dead
          </div>
        </div>
      </div>

      <MapContainer
        center={[39.8283, -98.5795]}
        zoom={4}
        className="flex-1 w-full bg-[#1a1c23]"
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <MapController bounds={bounds} />

        {tiles?.filter(t => t.latitude != null && t.longitude != null).map((tile) => (
          <Marker
            key={tile.uuid}
            position={[tile.latitude!, tile.longitude!]}
            icon={getTileIcon(tile)}
          >
            <Popup>
              <div className="font-mono text-xs space-y-2 p-1 min-w-[180px]">
                <div className="font-bold text-sm text-foreground flex items-center justify-between border-b border-border pb-1 gap-2">
                  <span className="truncate">{tile.equipment?.label || tile.name}</span>
                  <TileStatusBadge tile={tile} />
                </div>

                {tile.equipment?.category && (
                  <div className="text-muted-foreground">
                    TYPE: <span className="text-foreground">{tile.equipment.category}</span>
                  </div>
                )}

                <div className="text-muted-foreground">
                  LAST SEEN: <span className="text-foreground">
                    {tile.lastSeen ? new Date(tile.lastSeen).toLocaleDateString() : 'N/A'}
                  </span>
                </div>

                <div className="pt-1">
                  <Link
                    href={tile.equipment ? `/equipment/${tile.equipment.id}` : `/equipment`}
                    className="text-primary hover:text-primary/80 uppercase tracking-wider font-bold flex items-center gap-1"
                  >
                    View Details &rsaquo;
                  </Link>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
