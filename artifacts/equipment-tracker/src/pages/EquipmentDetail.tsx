import { useParams } from "wouter";
import {
  useGetEquipment, getGetEquipmentQueryKey,
  useTileHistory, getTileHistoryQueryKey,
  useGetTiles, getGetTilesQueryKey,
  useListQrScans, getListQrScansQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, MapPin, HardDrive, Clock, Tag, FileText, ArrowLeft, QrCode, Download, ScanLine } from "lucide-react";
import { TileStatusBadge } from "@/components/TileStatusBadge";
import { EquipmentFormDialog } from "@/components/EquipmentFormDialog";
import { MapContainer, TileLayer, Marker, Polyline } from "react-leaflet";
import { getTileIcon, getHistoryPointIcon } from "@/lib/map-icons";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { useRef } from "react";

function buildScanUrl(qrToken: string): string {
  const base = window.location.origin + import.meta.env.BASE_URL.replace(/\/$/, "");
  return `${base}/scan/${qrToken}`;
}

function QrCodeCard({ equipment }: { equipment: { id: number; label: string; qrToken: string } }) {
  const scanUrl = buildScanUrl(equipment.qrToken);
  const svgRef = useRef<SVGSVGElement>(null);

  function downloadQr() {
    const svg = svgRef.current;
    if (!svg) return;
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svg);
    const canvas = document.createElement("canvas");
    const size = 512;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      const a = document.createElement("a");
      a.download = `fieldtrack-qr-${equipment.label.replace(/\s+/g, "-").toLowerCase()}.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgStr)));
  }

  return (
    <Card className="border-primary/20 bg-card rounded-none">
      <CardHeader className="border-b border-border bg-muted/30 py-3 px-4">
        <CardTitle className="font-mono text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <QrCode className="h-4 w-4 text-primary" /> QR Code
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 flex flex-col items-center gap-4">
        <div className="bg-white p-3 inline-block border-2 border-primary/30">
          <QRCodeSVG
            ref={svgRef}
            value={scanUrl}
            size={180}
            level="H"
            includeMargin={false}
            bgColor="#ffffff"
            fgColor="#000000"
          />
        </div>
        <div className="w-full space-y-2">
          <p className="font-mono text-xs text-muted-foreground text-center break-all leading-relaxed">
            {scanUrl}
          </p>
          <Button
            onClick={downloadQr}
            variant="outline"
            size="sm"
            data-testid="button-download-qr"
            className="w-full font-mono text-xs uppercase tracking-wider rounded-none gap-2 border-primary/30 hover:text-primary"
          >
            <Download className="h-3.5 w-3.5" /> Download PNG
          </Button>
        </div>
        <p className="font-mono text-xs text-muted-foreground text-center leading-relaxed">
          Print and attach to equipment. Scanning with any phone camera will record GPS location.
        </p>
      </CardContent>
    </Card>
  );
}

function QrScanHistory({ equipmentId }: { equipmentId: number }) {
  const { data: scans, isLoading } = useListQrScans(equipmentId, {
    query: { queryKey: getListQrScansQueryKey(equipmentId) }
  });

  return (
    <Card className="border-border bg-card rounded-none">
      <CardHeader className="border-b border-border bg-muted/30 py-3 px-4">
        <CardTitle className="font-mono text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <ScanLine className="h-4 w-4 text-primary" /> QR Scan History
          {scans && scans.length > 0 && (
            <span className="ml-auto text-primary font-bold">{scans.length} scans</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 overflow-y-auto max-h-64">
        {isLoading ? (
          <div className="p-4 space-y-2">
            <Skeleton className="h-8 w-full bg-muted" />
            <Skeleton className="h-8 w-full bg-muted" />
          </div>
        ) : scans && scans.length > 0 ? (
          <div className="divide-y divide-border">
            {scans.map((scan) => (
              <div key={scan.id} className="px-4 py-3 hover:bg-muted/20 transition-colors">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 font-mono text-sm">
                    <MapPin className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                    <span className="text-foreground font-medium">{scan.city ?? "Unknown location"}</span>
                  </div>
                  <div className="font-mono text-xs text-muted-foreground">
                    {new Date(scan.scannedAt).toLocaleString()}
                  </div>
                </div>
                <div className="font-mono text-xs text-muted-foreground mt-1 pl-5">
                  {scan.latitude.toFixed(5)}, {scan.longitude.toFixed(5)}
                  {scan.accuracy != null && <span className="ml-2">±{Math.round(scan.accuracy)}m</span>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center space-y-2">
            <ScanLine className="h-8 w-8 text-muted-foreground/40 mx-auto" />
            <p className="font-mono text-sm text-muted-foreground">No QR scans yet.</p>
            <p className="font-mono text-xs text-muted-foreground/70">
              Scan the QR code with a phone to record a location.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

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
      <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto w-full">
        <Skeleton className="h-8 w-48 bg-card rounded-none" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="h-64 w-full bg-card rounded-none" />
          <Skeleton className="col-span-1 lg:col-span-2 h-64 w-full bg-card rounded-none" />
        </div>
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
    <div className="p-4 md:p-6 space-y-4 md:space-y-5 max-w-7xl mx-auto w-full">
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

      {/* Main grid: left col = metadata + QR, right col = map + histories */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5">

        {/* Left column */}
        <div className="space-y-4 lg:col-span-1">
          {/* Metadata */}
          <Card className="border-primary/20 bg-card rounded-none">
            <CardHeader className="border-b border-border bg-muted/30 py-3 px-4">
              <CardTitle className="font-mono text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" /> Asset Metadata
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-0 font-mono text-sm divide-y divide-border/50">
              {[
                { label: "Label", value: equipment.label },
                { label: "Category", value: equipment.category, highlight: true },
                { label: "Serial #", value: equipment.serialNumber || "N/A" },
                { label: "Tile Name", value: tile?.name || "Unknown" },
              ].map(row => (
                <div key={row.label} className="flex justify-between gap-2 py-2">
                  <span className="text-muted-foreground text-xs flex-shrink-0">{row.label}</span>
                  <span className={`text-right text-xs ${row.highlight ? "text-primary" : "text-foreground"}`}>
                    {row.value}
                  </span>
                </div>
              ))}
              {equipment.description && (
                <div className="py-2 space-y-1">
                  <span className="text-muted-foreground text-xs block">Description</span>
                  <p className="text-foreground whitespace-pre-wrap text-xs bg-muted/20 p-2 border border-border/50">
                    {equipment.description}
                  </p>
                </div>
              )}
              {equipment.notes && (
                <div className="py-2 space-y-1">
                  <span className="text-muted-foreground text-xs block">Field Notes</span>
                  <p className="text-foreground whitespace-pre-wrap text-xs bg-muted/20 p-2 border border-border/50 min-h-[48px]">
                    {equipment.notes}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* QR Code */}
          <QrCodeCard equipment={equipment} />
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-4 md:space-y-5">
          {/* Tile map */}
          <Card className="border-primary/20 bg-card rounded-none">
            <CardHeader className="border-b border-border bg-muted/30 py-3 px-4 flex flex-row items-center justify-between">
              <CardTitle className="font-mono text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" /> Tile Location
              </CardTitle>
              {hasLocation && (
                <div className="font-mono text-xs text-muted-foreground hidden sm:block">
                  {tile.lastSeen ? new Date(tile.lastSeen).toLocaleDateString() : "N/A"}
                </div>
              )}
            </CardHeader>
            <CardContent className="p-0 relative bg-[#1a1c23]" style={{ height: "260px" }}>
              {hasLocation ? (
                <MapContainer
                  center={[tile.latitude!, tile.longitude!]}
                  zoom={14}
                  className="absolute inset-0 h-full w-full z-0"
                  zoomControl={true}
                >
                  <TileLayer
                    attribution="&copy; OpenStreetMap"
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                  />
                  {historyPoints.length > 1 && (
                    <Polyline positions={historyPoints} color="hsl(var(--primary))" weight={2} dashArray="4" opacity={0.5} />
                  )}
                  {history?.map((pt, i) =>
                    pt.latitude && pt.longitude ? (
                      <Marker key={i} position={[pt.latitude, pt.longitude]} icon={getHistoryPointIcon()} />
                    ) : null
                  )}
                  <Marker position={[tile.latitude!, tile.longitude!]} icon={getTileIcon(tile)} />
                </MapContainer>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground font-mono text-sm">
                  <MapPin className="h-4 w-4 mr-2" /> NO GPS SIGNAL
                </div>
              )}
            </CardContent>
          </Card>

          {/* QR Scan History */}
          <QrScanHistory equipmentId={equipmentId} />

          {/* Tile location history */}
          <Card className="border-border bg-card rounded-none">
            <CardHeader className="border-b border-border bg-muted/30 py-3 px-4">
              <CardTitle className="font-mono text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" /> Tile Signal History (Last 7 Days)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-y-auto max-h-48">
              {loadingHist ? (
                <div className="p-4 space-y-2">
                  <Skeleton className="h-8 w-full bg-muted" />
                  <Skeleton className="h-8 w-full bg-muted" />
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
                <div className="p-6 text-center text-muted-foreground font-mono text-sm">
                  No Tile signal history available.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
