import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "wouter";
import jsQR from "jsqr";
import { useQrLookup, getQrLookupQueryKey } from "@workspace/api-client-react";
import { Loader2, QrCode, MapPin, Tag, Clock, FileText, ScanLine, ChevronRight, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TileStatusBadge } from "@/components/TileStatusBadge";

type ScannerStatus = "idle" | "starting" | "scanning" | "looking_up" | "found" | "not_found" | "camera_error";

const LOG_TYPE_LABELS: Record<string, string> = {
  flight: "Flight",
  rope_access: "Rope Access Use",
  inspection: "Inspection",
  maintenance: "Maintenance",
  general: "General Use",
};

export default function ScannerPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);

  const [status, setStatus] = useState<ScannerStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [lookupCode, setLookupCode] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(false);

  const { data: lookupResult, isLoading: lookupLoading, isError: lookupError, refetch } = useQrLookup(
    { code: lookupCode || "" },
    { query: { queryKey: getQrLookupQueryKey({ code: lookupCode || "" }), enabled: false, retry: false } }
  );

  function stopCamera() {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }

  const doLookup = useCallback(async (code: string) => {
    stopCamera();
    setStatus("looking_up");
    setLookupCode(code);

    try {
      const result = await refetch();
      if (result.data) {
        setStatus("found");
      } else {
        setStatus("not_found");
      }
    } catch {
      setStatus("not_found");
    }
  }, [refetch]);

  const scan = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA || cooldown) {
      rafRef.current = requestAnimationFrame(scan);
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(video, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);
    if (code?.data) {
      doLookup(code.data);
      return;
    }
    rafRef.current = requestAnimationFrame(scan);
  }, [cooldown, doLookup]);

  function startCamera() {
    setStatus("starting");
    setLookupCode(null);
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then(stream => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setStatus("scanning");
        rafRef.current = requestAnimationFrame(scan);
      })
      .catch(err => {
        setErrorMsg(err.name === "NotAllowedError" ? "Camera permission denied." : "Camera not available on this device.");
        setStatus("camera_error");
      });
  }

  function resetScanner() {
    setStatus("idle");
    setLookupCode(null);
  }

  useEffect(() => () => stopCamera(), []);

  // Restart animation loop when scan changes
  useEffect(() => {
    if (status === "scanning") {
      rafRef.current = requestAnimationFrame(scan);
    }
  }, [scan, status]);

  const eq = lookupResult?.equipment;
  const tile = lookupResult?.tile;
  const lastScan = lookupResult?.lastQrScan;

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-2xl mx-auto w-full">
      <header className="border-b border-border pb-4">
        <h1 className="font-mono font-bold text-2xl text-foreground uppercase tracking-wider flex items-center gap-3">
          <ScanLine className="h-6 w-6 text-primary" /> QR Scanner
        </h1>
        <p className="font-mono text-xs text-muted-foreground mt-1">
          Scan any FieldTrack QR code or custom asset tag to look up equipment.
        </p>
      </header>

      {/* Camera viewport */}
      <div className="relative bg-black border border-primary/30 overflow-hidden" style={{ aspectRatio: "4/3", maxHeight: "360px" }}>
        <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
        <canvas ref={canvasRef} className="hidden" />

        {/* Overlay content */}
        {status === "idle" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/80">
            <QrCode className="h-16 w-16 text-primary/40" />
            <p className="font-mono text-sm text-muted-foreground">Camera not started</p>
            <Button onClick={startCamera} className="font-mono uppercase tracking-wider rounded-none gap-2">
              <ScanLine className="h-4 w-4" /> Start Scanner
            </Button>
          </div>
        )}

        {status === "starting" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          </div>
        )}

        {status === "scanning" && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-56 h-56 border-2 border-primary/60 relative">
              <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-primary" />
              <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-primary" />
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-primary" />
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-primary" />
              <div className="absolute left-0 right-0 h-0.5 bg-primary/50 animate-[scanner_2s_ease-in-out_infinite]" />
            </div>
            <div className="absolute bottom-4 left-0 right-0 text-center">
              <p className="font-mono text-xs text-primary/80 bg-black/60 inline-block px-3 py-1">
                Scanning...
              </p>
            </div>
          </div>
        )}

        {status === "looking_up" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
            <p className="font-mono text-xs text-muted-foreground">Looking up equipment...</p>
          </div>
        )}

        {status === "not_found" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80">
            <XCircle className="h-12 w-12 text-destructive" />
            <p className="font-mono text-sm text-destructive">No equipment found</p>
            <p className="font-mono text-xs text-muted-foreground px-6 text-center break-all">{lookupCode?.slice(0, 60)}</p>
            <Button variant="outline" size="sm" onClick={resetScanner} className="font-mono rounded-none text-xs uppercase">
              Try Again
            </Button>
          </div>
        )}

        {status === "camera_error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/90 p-4">
            <AlertTriangle className="h-10 w-10 text-amber-500" />
            <p className="font-mono text-sm text-amber-400">{errorMsg}</p>
          </div>
        )}

        {status === "found" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <CheckCircle2 className="h-16 w-16 text-green-400" />
          </div>
        )}
      </div>

      {/* Equipment result card */}
      {status === "found" && eq && (
        <Card className="border-primary/30 bg-card rounded-none animate-in fade-in slide-in-from-bottom-4 duration-300">
          <CardHeader className="border-b border-border bg-muted/30 py-3 px-4 flex flex-row items-center gap-3">
            <CheckCircle2 className="h-4 w-4 text-green-400 flex-shrink-0" />
            <CardTitle className="font-mono text-sm text-foreground uppercase tracking-wide flex-1">
              {eq.label}
            </CardTitle>
            {tile && <TileStatusBadge tile={tile} />}
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            {/* Basic info */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 font-mono text-xs divide-y divide-border/30">
              {[
                { label: "Category", value: eq.category, highlight: true },
                { label: "Serial #", value: eq.serialNumber || "N/A" },
                { label: "In Service", value: eq.inServiceDate ? new Date(eq.inServiceDate).toLocaleDateString() : "Not set" },
                { label: "Out of Service", value: eq.outOfServiceDate ? new Date(eq.outOfServiceDate).toLocaleDateString() : "Active" },
              ].map(row => (
                <div key={row.label} className="flex justify-between gap-2 py-1.5 col-span-2">
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className={row.highlight ? "text-primary font-medium" : "text-foreground"}>{row.value}</span>
                </div>
              ))}
            </div>

            {/* Notes */}
            {eq.notes && (
              <div className="space-y-1">
                <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="h-3 w-3" /> Notes
                </p>
                <p className="font-mono text-xs text-foreground bg-muted/20 border border-border/50 p-2 whitespace-pre-wrap">
                  {eq.notes}
                </p>
              </div>
            )}

            {/* Tile location */}
            {tile?.latitude && tile?.longitude && (
              <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                <span>Tile last seen: {tile.lastSeen ? new Date(tile.lastSeen).toLocaleString() : "unknown"}</span>
              </div>
            )}

            {/* Last QR scan */}
            {lastScan && (
              <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                <QrCode className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                <span>Last QR scan: {lastScan.city ?? "unknown location"} — {new Date(lastScan.scannedAt).toLocaleString()}</span>
              </div>
            )}

            {/* Recent logs */}
            {lookupResult.recentLogs && lookupResult.recentLogs.length > 0 && (
              <div className="space-y-2">
                <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="h-3 w-3" /> Recent Activity
                </p>
                <div className="space-y-1.5">
                  {lookupResult.recentLogs.map(log => (
                    <div key={log.id} className="flex items-center justify-between gap-2 font-mono text-xs border border-border/40 bg-muted/10 px-3 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge variant="outline" className="font-mono text-xs rounded-none border-primary/20 text-primary flex-shrink-0">
                          {LOG_TYPE_LABELS[log.logType] || log.logType}
                        </Badge>
                        {log.location && <span className="text-muted-foreground truncate">{log.location}</span>}
                        {log.durationMinutes && <span className="text-muted-foreground flex-shrink-0">{log.durationMinutes}min</span>}
                      </div>
                      <span className="text-muted-foreground flex-shrink-0">{new Date(log.logDate).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between border-t border-border pt-3 gap-3">
              <Button variant="ghost" size="sm" onClick={resetScanner} className="font-mono text-xs rounded-none uppercase text-muted-foreground">
                Scan Another
              </Button>
              <Link href={`/equipment/${eq.id}`}>
                <Button size="sm" className="font-mono text-xs uppercase tracking-wider rounded-none gap-1.5">
                  Full Details <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      <style>{`
        @keyframes scanner {
          0%, 100% { top: 0; }
          50% { top: calc(100% - 2px); }
        }
      `}</style>
    </div>
  );
}
