import { useEffect, useRef, useState, useCallback } from "react";
import { useGetTiles, getGetTilesQueryKey } from "@workspace/api-client-react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import type { LatLngBounds, LatLngTuple } from "leaflet";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { getTileIcon } from "@/lib/map-icons";
import { TileStatusBadge } from "@/components/TileStatusBadge";
import { Link, useSearch } from "wouter";
import {
  X, MapPin, Clock, Tag, Hash, CalendarCheck, FileText, ExternalLink, Wifi
} from "lucide-react";
import { EquipmentFormDialog } from "@/components/EquipmentFormDialog";

type TileDevice = NonNullable<ReturnType<typeof useGetTiles>["data"]>[number];

function MapController({ bounds }: { bounds: LatLngBounds | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [bounds, map]);
  return null;
}

function FlyToTile({ tile }: { tile: TileDevice | null }) {
  const map = useMap();
  const flyDoneRef = useRef(false);
  useEffect(() => {
    if (tile && tile.latitude != null && tile.longitude != null && !flyDoneRef.current) {
      flyDoneRef.current = true;
      map.flyTo([tile.latitude, tile.longitude], 14, { duration: 1.2 });
    }
  }, [tile, map]);
  return null;
}

function getCategoryStyle(category: string) {
  switch (category) {
    case "Drone":          return "bg-blue-500/20 text-blue-300 border-blue-500/30";
    case "NDT":            return "bg-purple-500/20 text-purple-300 border-purple-500/30";
    case "Rope Access":    return "bg-orange-500/20 text-orange-300 border-orange-500/30";
    case "Laser Measurer": return "bg-cyan-500/20 text-cyan-300 border-cyan-500/30";
    case "Boat":           return "bg-teal-500/20 text-teal-300 border-teal-500/30";
    default:               return "bg-muted/40 text-muted-foreground border-border";
  }
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border/50 last:border-0">
      <div className="text-muted-foreground mt-0.5 flex-shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">{label}</div>
        <div className="font-mono text-sm text-foreground break-words">{value}</div>
      </div>
    </div>
  );
}

function MarkerLayer({
  tiles,
  onSelect,
  selectedUuid,
}: {
  tiles: TileDevice[];
  onSelect: (tile: TileDevice) => void;
  selectedUuid: string | null;
}) {
  return (
    <>
      {tiles.filter(t => t.latitude != null && t.longitude != null).map((tile) => (
        <Marker
          key={tile.uuid}
          position={[tile.latitude!, tile.longitude!]}
          icon={getTileIcon(tile)}
          eventHandlers={{ click: () => onSelect(tile) }}
          zIndexOffset={tile.uuid === selectedUuid ? 1000 : 0}
        />
      ))}
    </>
  );
}

export default function MapPage() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const targetUuid = params.get("tile");

  const { data: tiles, isLoading } = useGetTiles({
    query: { queryKey: getGetTilesQueryKey() }
  });

  const [bounds, setBounds] = useState<LatLngBounds | null>(null);
  const [selected, setSelected] = useState<TileDevice | null>(null);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const didAutoSelect = useRef(false);

  // Set initial bounds from all tiles (only when no target UUID)
  useEffect(() => {
    if (tiles && tiles.length > 0 && !targetUuid) {
      import("leaflet").then((L) => {
        const points = tiles
          .filter(t => t.latitude != null && t.longitude != null)
          .map(t => [t.latitude!, t.longitude!] as LatLngTuple);
        if (points.length > 0) setBounds(L.latLngBounds(points));
      });
    }
  }, [tiles, targetUuid]);

  // Auto-select the target tile from URL param
  useEffect(() => {
    if (targetUuid && tiles && !didAutoSelect.current) {
      const tile = tiles.find(t => t.uuid === targetUuid);
      if (tile) {
        didAutoSelect.current = true;
        setSelected(tile);
      }
    }
  }, [targetUuid, tiles]);

  // Close panel on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const eq = selected?.equipment ?? null;
  const displayName = eq?.label || selected?.name || "—";

  if (isLoading) {
    return <div className="h-full w-full p-4"><Skeleton className="h-full w-full bg-card rounded-none" /></div>;
  }

  return (
    <div className="h-full w-full flex flex-col relative overflow-hidden">

      {/* Legend */}
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

      {/* Map */}
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
        {!targetUuid && <MapController bounds={bounds} />}
        <FlyToTile tile={selected} />
        <MarkerLayer
          tiles={tiles ?? []}
          onSelect={setSelected}
          selectedUuid={selected?.uuid ?? null}
        />
      </MapContainer>

      {/* Detail panel — slides up from bottom on mobile, in from right on desktop */}
      <div
        className={`
          absolute z-[2000] bg-background border-border shadow-2xl
          transition-transform duration-300 ease-in-out
          bottom-0 left-0 right-0 border-t max-h-[70vh] overflow-y-auto
          md:top-0 md:bottom-0 md:left-auto md:right-0 md:w-80 md:max-h-full
          md:border-t-0 md:border-l
          ${selected
            ? "translate-y-0 md:translate-x-0"
            : "translate-y-full md:translate-x-full md:translate-y-0"
          }
        `}
      >
        {selected && (
          <div className="flex flex-col h-full">
            {/* Panel header */}
            <div className="flex items-start justify-between gap-3 p-4 border-b border-border bg-muted/30 flex-shrink-0">
              <div className="min-w-0 flex-1">
                <div className="font-mono font-bold text-base text-foreground leading-tight truncate">
                  {displayName}
                </div>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <TileStatusBadge tile={selected} />
                  {eq?.category && (
                    <span className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 border ${getCategoryStyle(eq.category)}`}>
                      {eq.category}
                    </span>
                  )}
                  {!eq && (
                    <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 border border-border text-muted-foreground">
                      Unlinked
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 mt-0.5"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Detail rows */}
            <div className="flex-1 overflow-y-auto px-4 py-2">
              {eq?.serialNumber && (
                <DetailRow
                  icon={<Hash className="h-3.5 w-3.5" />}
                  label="Serial #"
                  value={eq.serialNumber}
                />
              )}

              <DetailRow
                icon={<Wifi className="h-3.5 w-3.5" />}
                label="Tile Name"
                value={selected.name}
              />

              <DetailRow
                icon={<Clock className="h-3.5 w-3.5" />}
                label="Last Seen"
                value={selected.lastSeen
                  ? new Date(selected.lastSeen).toLocaleString()
                  : "Unknown"
                }
              />

              <DetailRow
                icon={<MapPin className="h-3.5 w-3.5" />}
                label="Coordinates"
                value={`${selected.latitude?.toFixed(5)}, ${selected.longitude?.toFixed(5)}`}
              />

              {eq?.inServiceDate && (
                <DetailRow
                  icon={<CalendarCheck className="h-3.5 w-3.5" />}
                  label="In Service"
                  value={new Date(eq.inServiceDate).toLocaleDateString()}
                />
              )}

              {eq?.outOfServiceDate && (
                <DetailRow
                  icon={<CalendarCheck className="h-3.5 w-3.5" />}
                  label="Out of Service"
                  value={new Date(eq.outOfServiceDate).toLocaleDateString()}
                />
              )}

              {eq?.customQrCode && (
                <DetailRow
                  icon={<Tag className="h-3.5 w-3.5" />}
                  label="Asset Tag"
                  value={eq.customQrCode}
                />
              )}

              {eq?.notes && (
                <DetailRow
                  icon={<FileText className="h-3.5 w-3.5" />}
                  label="Notes"
                  value={<span className="text-muted-foreground">{eq.notes}</span>}
                />
              )}

              {!eq && (
                <div className="py-4 text-center font-mono text-xs text-muted-foreground border border-dashed border-border mt-2">
                  No equipment linked to this tracker.
                </div>
              )}
            </div>

            {/* Footer action */}
            <div className="flex-shrink-0 p-4 border-t border-border bg-muted/10">
              {eq ? (
                <Link href={`/equipment/${eq.id}`}>
                  <Button
                    className="w-full font-mono uppercase tracking-wider rounded-none gap-2"
                    onClick={() => setSelected(null)}
                  >
                    <ExternalLink className="h-4 w-4" />
                    View Full Details
                  </Button>
                </Link>
              ) : (
                <Button
                  variant="outline"
                  className="w-full font-mono uppercase tracking-wider rounded-none gap-2"
                  onClick={(e) => { e.stopPropagation(); e.preventDefault(); setTimeout(() => setLinkDialogOpen(true), 0); }}
                >
                  Link Equipment
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Backdrop for mobile — tap outside to close */}
      {selected && (
        <div
          className="absolute inset-0 z-[1999] md:hidden"
          onClick={() => setSelected(null)}
        />
      )}

      {/* Link Equipment dialog — rendered at root to avoid Leaflet event conflicts */}
      {selected && !selected.equipment && (
        <EquipmentFormDialog
          tileUuid={selected.uuid}
          open={linkDialogOpen}
          onOpenChange={(v) => { setLinkDialogOpen(v); }}
        />
      )}
    </div>
  );
}
