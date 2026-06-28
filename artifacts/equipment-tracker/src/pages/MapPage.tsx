import { useEffect, useState } from "react";
import { useGetTiles, getGetTilesQueryKey } from "@workspace/api-client-react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { Skeleton } from "@/components/ui/skeleton";
import { getTileIcon } from "@/lib/map-icons";
import { TileStatusBadge } from "@/components/TileStatusBadge";
import { Link } from "wouter";

// Component to recenter map when bounds change
function MapController({ bounds }: { bounds: L.LatLngBounds | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [bounds, map]);
  return null;
}

export default function MapPage() {
  const { data: tiles, isLoading } = useGetTiles({
    query: { queryKey: getGetTilesQueryKey() }
  });

  const [bounds, setBounds] = useState<L.LatLngBounds | null>(null);

  useEffect(() => {
    if (tiles && tiles.length > 0) {
      import("leaflet").then((L) => {
        const points = tiles
          .filter(t => t.latitude != null && t.longitude != null)
          .map(t => [t.latitude!, t.longitude!] as L.LatLngTuple);
        
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
      <div className="absolute top-4 left-16 z-[1000] pointer-events-none">
        <div className="bg-background/90 backdrop-blur border border-border p-3 shadow-lg pointer-events-auto flex flex-col gap-2">
          <h2 className="font-mono text-sm uppercase tracking-wider text-primary font-bold border-b border-border pb-2 mb-1">Global Position</h2>
          <div className="flex items-center gap-2 font-mono text-xs text-foreground">
            <div className="w-3 h-3 bg-green-500 border border-green-700 rounded-full" /> Active
          </div>
          <div className="flex items-center gap-2 font-mono text-xs text-foreground">
            <div className="w-3 h-3 bg-red-500 border border-red-700 rounded-full" /> Lost
          </div>
          <div className="flex items-center gap-2 font-mono text-xs text-foreground">
            <div className="w-3 h-3 bg-gray-500 border border-gray-700 rounded-full" /> Dead
          </div>
        </div>
      </div>

      <MapContainer 
        center={[39.8283, -98.5795]} 
        zoom={4} 
        className="flex-1 w-full bg-[#1a1c23]" // Map background match tactical dark
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" // Dark theme tiles
        />
        <MapController bounds={bounds} />

        {tiles?.filter(t => t.latitude != null && t.longitude != null).map((tile) => (
          <Marker 
            key={tile.uuid} 
            position={[tile.latitude!, tile.longitude!]}
            icon={getTileIcon(tile)}
          >
            <Popup className="tactical-popup">
              <div className="font-mono text-xs space-y-2 p-1 min-w-[200px]">
                <div className="font-bold text-sm text-foreground flex items-center justify-between border-b border-border pb-1">
                  {tile.equipment?.label || tile.name}
                  <TileStatusBadge tile={tile} />
                </div>
                
                {tile.equipment?.category && (
                  <div className="text-muted-foreground">TYPE: <span className="text-foreground">{tile.equipment.category}</span></div>
                )}
                
                <div className="text-muted-foreground">LAST SEEN: <span className="text-foreground">{tile.lastSeen ? new Date(tile.lastSeen).toLocaleString() : 'N/A'}</span></div>
                
                <div className="pt-2">
                  <Link href={tile.equipment ? `/equipment/${tile.equipment.id}` : `/equipment`} className="text-primary hover:text-primary/80 uppercase tracking-wider flex items-center gap-1 font-bold">
                    View Details {">"}
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
