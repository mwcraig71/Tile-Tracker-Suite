import { useParams } from "wouter";
import {
  useGetEquipment, getGetEquipmentQueryKey,
  useTileHistory, getTileHistoryQueryKey,
  useGetTiles, getGetTilesQueryKey
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, MapPin, HardDrive, Clock, Tag, FileText, ArrowLeft } from "lucide-react";
import { TileStatusBadge } from "@/components/TileStatusBadge";
import { EquipmentFormDialog } from "@/components/EquipmentFormDialog";
import { MapContainer, TileLayer, Marker, Polyline } from "react-leaflet";
import { getTileIcon, getHistoryPointIcon } from "@/lib/map-icons";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function EquipmentDetail() {
  const { id } = useParams<{ id: string }>();
  const equipmentId = parseInt(id || "0", 10);

  const { data: equipment, isLoading: loadingEq, isError: errEq } = useGetEquipment(equipmentId, {
    query: { queryKey: getGetEquipmentQueryKey(equipmentId), enabled: !isNaN(equipmentId) }
  });

  const { data: tiles } = useGetTiles({ query: { queryKey: getGetTilesQueryKey() } });
  const tile = tiles?.find(t => t.uuid === equipment?.tileUuid);

  const { data: history, isLoading: loadingHist } = useTileHistory(equipment?.tileUuid || "", {
    query: { queryKey: getTileHistoryQueryKey(equipment?.tileUuid || ""), enabled: !!equipment?.tileUuid }
  });

  if (loadingEq) {
    return (
      <div className="p-4 md:p-6 space-y-4 md:space-y-6 max-w-5xl mx-auto w-full">
        <Skeleton className="h-8 w-48 bg-card rounded-none" />
        <Skeleton className="h-64 md:h-96 w-full bg-card rounded-none" />
        <Skeleton className="h-48 w-full bg-card rounded-none" />
      </div>
    );
  }

  if (errEq || !equipment) {
    return (
      <div className="p-4 md:p-6 flex flex-col items-center justify-center h-full space-y-4">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <h2 className="text-xl font-mono text-destructive uppercase tracking-widest">Record Not Found</h2>
        <Link href="/equipment">
          <Button variant="outline" className="font-mono rounded-none">Return to Registry</Button>
        </Link>
      </div>
    );
  }

  const hasLocation = tile && tile.latitude && tile.longitude;
  const historyPoints = history
    ?.filter(h => h.latitude && h.longitude)
    .map(h => [h.latitude, h.longitude] as [number, number]) || [];

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <header className="border-b border-border pb-3 md:pb-4 space-y-2">
        <Link
          href="/equipment"
          className="text-muted-foreground hover:text-primary font-mono text-xs flex items-center gap-1 transition-colors uppercase tracking-wider"
          data-testid="link-back-to-registry"
        >
          <ArrowLeft className="h-3 w-3" /> Back to Registry
        </Link>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl md:text-3xl font-bold font-mono text-foreground uppercase tracking-wider truncate">
                {equipment.label}
              </h1>
              {tile && <TileStatusBadge tile={tile} />}
            </div>
            <p className="text-xs md:text-sm font-mono text-muted-foreground flex items-center gap-2 flex-wrap">
              <Tag className="h-3 w-3" /> {equipment.category}
              {equipment.serialNumber && (
                <><span className="text-border">|</span> <HardDrive className="h-3 w-3" /> SN: {equipment.serialNumber}</>
              )}
            </p>
          </div>
          <div className="flex-shrink-0">
            <EquipmentFormDialog tileUuid={equipment.tileUuid} existingEquipment={equipment} />
          </div>
        </div>
      </header>

      {/* On mobile: stacked. On desktop: 3-col grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Metadata card */}
        <Card className="border-primary/20 bg-card rounded-none lg:col-span-1">
          <CardHeader className="border-b border-border bg-muted/30 py-3 px-4">
            <CardTitle className="font-mono text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" /> Asset Metadata
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3 font-mono text-sm">
            {[
              { label: "Label", value: equipment.label },
              { label: "Category", value: equipment.category, highlight: true },
              { label: "Serial #", value: equipment.serialNumber || 'N/A' },
              { label: "Tile Name", value: tile?.name || 'Unknown' },
              { label: "UUID", value: equipment.tileUuid, truncate: true },
            ].map(row => (
              <div key={row.label} className="flex justify-between gap-2 py-1.5 border-b border-border/50 last:border-0">
                <span className="text-muted-foreground text-xs flex-shrink-0">{row.label}</span>
                <span
                  className={`text-right text-xs ${row.highlight ? 'text-primary' : 'text-foreground'} ${row.truncate ? 'truncate max-w-[120px]' : ''}`}
                  title={row.truncate ? String(row.value) : undefined}
                >
                  {String(row.value)}
                </span>
              </div>
            ))}

            {equipment.description && (
              <div className="pt-1 space-y-1">
                <span className="text-muted-foreground text-xs block">Description:</span>
                <p className="text-foreground whitespace-pre-wrap text-xs bg-muted/20 p-2 border border-border/50">
                  {equipment.description}
                </p>
              </div>
            )}

            {equipment.notes && (
              <div className="pt-1 space-y-1">
                <span className="text-muted-foreground text-xs block">Field Notes:</span>
                <p className="text-foreground whitespace-pre-wrap text-xs bg-muted/20 p-2 border border-border/50 min-h-[48px]">
                  {equipment.notes}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Map + history column */}
        <div className="lg:col-span-2 space-y-4 md:space-y-6">
          {/* Map */}
          <Card className="border-primary/20 bg-card rounded-none">
            <CardHeader className="border-b border-border bg-muted/30 py-3 px-4 flex flex-row items-center justify-between">
              <CardTitle className="font-mono text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" /> Telemetry & Location
              </CardTitle>
              {hasLocation && (
                <div className="font-mono text-xs text-muted-foreground hidden sm:block">
                  {tile.lastSeen ? new Date(tile.lastSeen).toLocaleDateString() : 'N/A'}
                </div>
              )}
            </CardHeader>
            <CardContent className="p-0 relative bg-[#1a1c23]" style={{ height: "280px" }}>
              {hasLocation ? (
                <MapContainer
                  center={[tile.latitude!, tile.longitude!]}
                  zoom={14}
                  className="absolute inset-0 h-full w-full z-0"
                  zoomControl={true}
                >
                  <TileLayer
                    attribution='&copy; OpenStreetMap'
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                  />

                  {historyPoints.length > 1 && (
                    <Polyline
                      positions={historyPoints}
                      color="hsl(var(--primary))"
                      weight={2}
                      dashArray="4"
                      opacity={0.5}
                    />
                  )}

                  {history?.map((pt, i) => (
                    pt.latitude && pt.longitude && (
                      <Marker
                        key={i}
                        position={[pt.latitude, pt.longitude]}
                        icon={getHistoryPointIcon()}
                      />
                    )
                  ))}

                  <Marker
                    position={[tile.latitude!, tile.longitude!]}
                    icon={getTileIcon(tile)}
                  />
                </MapContainer>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground font-mono text-sm">
                  <MapPin className="h-4 w-4 mr-2" /> NO GPS SIGNAL
                </div>
              )}
            </CardContent>
          </Card>

          {/* History */}
          <Card className="border-border bg-card rounded-none">
            <CardHeader className="border-b border-border bg-muted/30 py-3 px-4">
              <CardTitle className="font-mono text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" /> Location History (Last 7 Days)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-y-auto max-h-56">
              {loadingHist ? (
                <div className="p-4 space-y-2">
                  <Skeleton className="h-8 w-full bg-card" />
                  <Skeleton className="h-8 w-full bg-card" />
                </div>
              ) : history && history.length > 0 ? (
                <div className="divide-y divide-border">
                  {history.map((pt, i) => (
                    <div key={i} className="p-3 px-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 hover:bg-muted/20 text-xs font-mono">
                      <div className="text-foreground">{new Date(pt.timestamp).toLocaleString()}</div>
                      <div className="text-muted-foreground flex gap-3">
                        <span>LAT: {pt.latitude?.toFixed(5)}</span>
                        <span>LNG: {pt.longitude?.toFixed(5)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground font-mono text-sm">
                  No historical telemetry data available.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
