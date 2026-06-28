import { useParams } from "wouter";
import { useGetEquipment, getGetEquipmentQueryKey, useTileHistory, getTileHistoryQueryKey, useGetTiles, getGetTilesQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, MapPin, HardDrive, Clock, Tag, FileText, Settings, ArrowLeft } from "lucide-react";
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
      <div className="p-6 space-y-6 max-w-5xl mx-auto w-full">
        <Skeleton className="h-10 w-48 bg-card rounded-none" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="col-span-1 md:col-span-2 h-96 bg-card rounded-none" />
          <Skeleton className="col-span-1 h-96 bg-card rounded-none" />
        </div>
      </div>
    );
  }

  if (errEq || !equipment) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-full space-y-4">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <h2 className="text-xl font-mono text-destructive uppercase tracking-widest">Record Not Found</h2>
        <Link href="/equipment"><Button variant="outline" className="font-mono rounded-none">Return to Registry</Button></Link>
      </div>
    );
  }

  const hasLocation = tile && tile.latitude && tile.longitude;
  const historyPoints = history?.filter(h => h.latitude && h.longitude).map(h => [h.latitude, h.longitude] as [number, number]) || [];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto w-full flex flex-col h-full overflow-y-auto">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="space-y-1">
          <Link href="/equipment" className="text-muted-foreground hover:text-primary font-mono text-xs flex items-center gap-1 mb-2 transition-colors uppercase tracking-wider">
            <ArrowLeft className="h-3 w-3" /> Back to Registry
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold font-mono text-foreground uppercase tracking-wider">
              {equipment.label}
            </h1>
            {tile && <TileStatusBadge tile={tile} />}
          </div>
          <p className="text-sm font-mono text-muted-foreground flex items-center gap-2">
            <Tag className="h-3 w-3" /> {equipment.category}
            {equipment.serialNumber && <><span className="text-border">|</span> <HardDrive className="h-3 w-3" /> SN: {equipment.serialNumber}</>}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <EquipmentFormDialog tileUuid={equipment.tileUuid} existingEquipment={equipment} />
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
        {/* Left Column: Metadata & Details */}
        <div className="space-y-6 flex flex-col">
          <Card className="border-primary/20 bg-card rounded-none">
            <CardHeader className="border-b border-border bg-muted/30 pb-3">
              <CardTitle className="font-mono text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" /> Asset Metadata
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4 font-mono text-sm">
              <div className="grid grid-cols-3 gap-2 py-2 border-b border-border/50">
                <span className="text-muted-foreground col-span-1">Label:</span>
                <span className="text-foreground col-span-2">{equipment.label}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 py-2 border-b border-border/50">
                <span className="text-muted-foreground col-span-1">Category:</span>
                <span className="text-primary col-span-2">{equipment.category}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 py-2 border-b border-border/50">
                <span className="text-muted-foreground col-span-1">Serial Num:</span>
                <span className="text-foreground col-span-2">{equipment.serialNumber || 'N/A'}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 py-2 border-b border-border/50">
                <span className="text-muted-foreground col-span-1">Tile Name:</span>
                <span className="text-foreground col-span-2">{tile?.name || 'Unknown'}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 py-2 border-b border-border/50">
                <span className="text-muted-foreground col-span-1">Tile UUID:</span>
                <span className="text-foreground col-span-2 truncate" title={equipment.tileUuid}>{equipment.tileUuid}</span>
              </div>
              <div className="pt-2 space-y-2">
                <span className="text-muted-foreground block">Description:</span>
                <p className="text-foreground whitespace-pre-wrap text-xs bg-muted/20 p-2 border border-border/50">
                  {equipment.description || 'No description provided.'}
                </p>
              </div>
              <div className="pt-2 space-y-2">
                <span className="text-muted-foreground block">Field Notes:</span>
                <p className="text-foreground whitespace-pre-wrap text-xs bg-muted/20 p-2 border border-border/50 min-h-[60px]">
                  {equipment.notes || 'No field notes.'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Map & History */}
        <div className="col-span-1 lg:col-span-2 space-y-6 flex flex-col">
          <Card className="border-primary/20 bg-card rounded-none flex-1 flex flex-col min-h-[400px]">
            <CardHeader className="border-b border-border bg-muted/30 pb-3 flex flex-row items-center justify-between">
              <CardTitle className="font-mono text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" /> Telemetry & Location
              </CardTitle>
              {hasLocation && (
                <div className="font-mono text-xs text-muted-foreground flex items-center gap-1">
                  LAST FIX: <span className="text-foreground">{tile.lastSeen ? new Date(tile.lastSeen).toLocaleString() : 'N/A'}</span>
                </div>
              )}
            </CardHeader>
            <CardContent className="p-0 flex-1 relative bg-[#1a1c23]">
              {hasLocation ? (
                <MapContainer 
                  center={[tile.latitude!, tile.longitude!]} 
                  zoom={15} 
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
                  <MapPin className="h-4 w-4 mr-2" /> NO GPS SIGNAL DETECTED
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border bg-card rounded-none h-64 flex flex-col">
             <CardHeader className="border-b border-border bg-muted/30 pb-3">
              <CardTitle className="font-mono text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" /> Location History (Last 7 Days)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-y-auto flex-1">
              {loadingHist ? (
                <div className="p-4 space-y-2">
                  <Skeleton className="h-8 w-full bg-card" />
                  <Skeleton className="h-8 w-full bg-card" />
                </div>
              ) : history && history.length > 0 ? (
                <div className="divide-y divide-border">
                  {history.map((pt, i) => (
                    <div key={i} className="p-3 px-4 flex items-center justify-between hover:bg-muted/20 text-xs font-mono">
                      <div className="text-foreground">{new Date(pt.timestamp).toLocaleString()}</div>
                      <div className="text-muted-foreground flex gap-4">
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
