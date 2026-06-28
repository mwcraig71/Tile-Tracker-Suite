import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { useGetScanInfo, getGetScanInfoQueryKey, useRecordScan } from "@workspace/api-client-react";
import { MapPin, CheckCircle, AlertTriangle, Loader2, QrCode, Clock, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";

type ScanState = "idle" | "requesting" | "submitting" | "success" | "error" | "no-gps";

export default function ScanPage() {
  const { token } = useParams<{ token: string }>();
  const [scanState, setScanState] = useState<ScanState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [scannedCity, setScannedCity] = useState<string | null>(null);

  const { data: info, isLoading, isError } = useGetScanInfo(token || "", {
    query: { queryKey: getGetScanInfoQueryKey(token || ""), enabled: !!token }
  });

  const recordScan = useRecordScan();

  // Auto-trigger GPS on load once info is available
  useEffect(() => {
    if (info && scanState === "idle") {
      handleScan();
    }
  }, [info]);

  async function handleScan() {
    if (!navigator.geolocation) {
      setScanState("no-gps");
      return;
    }

    setScanState("requesting");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setScanState("submitting");
        try {
          const result = await recordScan.mutateAsync({
            token: token!,
            data: {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
            },
          });
          setScannedCity(result.city ?? null);
          setScanState("success");
        } catch {
          setErrorMsg("Failed to save location. Please try again.");
          setScanState("error");
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setErrorMsg("Location permission was denied. Please allow location access and try again.");
        } else {
          setErrorMsg("Could not get your location. Make sure GPS is enabled.");
        }
        setScanState("error");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4 text-muted-foreground font-mono">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-sm uppercase tracking-widest">Loading equipment data...</span>
        </div>
      </div>
    );
  }

  if (isError || !info) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center space-y-6">
          <div className="w-16 h-16 rounded-none bg-destructive/10 flex items-center justify-center mx-auto border border-destructive/30">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <div className="space-y-2">
            <h1 className="font-mono font-bold text-xl text-foreground uppercase tracking-wider">QR Code Invalid</h1>
            <p className="font-mono text-sm text-muted-foreground">
              This QR code is not linked to any equipment, or the item has been removed from the system.
            </p>
          </div>
          <Link href="/">
            <Button variant="outline" className="font-mono rounded-none w-full">
              Go to FieldTrack
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-sm w-full space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <div className="w-10 h-10 bg-primary/10 border border-primary/30 flex items-center justify-center flex-shrink-0">
            <QrCode className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest">FieldTrack</p>
            <p className="font-mono text-xs text-primary">QR Scan Event</p>
          </div>
        </div>

        {/* Equipment info */}
        <div className="space-y-3">
          <h1 className="font-mono font-bold text-2xl text-foreground uppercase tracking-wide">
            {info.label}
          </h1>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
              <Tag className="h-3.5 w-3.5 text-primary" />
              {info.category}
            </div>
            {info.serialNumber && (
              <div className="font-mono text-xs text-muted-foreground">
                SN: {info.serialNumber}
              </div>
            )}
          </div>
          {info.description && (
            <p className="font-mono text-sm text-muted-foreground border-l-2 border-primary/40 pl-3">
              {info.description}
            </p>
          )}
        </div>

        {/* Scan status */}
        <div className="border border-border bg-card p-4 space-y-3">
          {(scanState === "idle" || scanState === "requesting" || scanState === "submitting") && (
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 text-primary animate-spin flex-shrink-0" />
              <div className="font-mono text-sm">
                {scanState === "requesting" ? "Requesting GPS location..." : "Updating location..."}
              </div>
            </div>
          )}

          {scanState === "success" && (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                <div className="font-mono text-sm text-foreground font-semibold">Location Updated</div>
              </div>
              <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground pl-8">
                <MapPin className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                {scannedCity ? (
                  <span>Last seen in <strong className="text-foreground">{scannedCity}</strong></span>
                ) : (
                  <span>GPS location recorded</span>
                )}
              </div>
              <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground pl-8">
                <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                {new Date().toLocaleString()}
              </div>
            </div>
          )}

          {scanState === "no-gps" && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
                <div className="font-mono text-sm">GPS not available on this device.</div>
              </div>
              <p className="font-mono text-xs text-muted-foreground">
                Item identified but location could not be recorded.
              </p>
            </div>
          )}

          {scanState === "error" && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
                <div className="font-mono text-sm text-destructive">{errorMsg}</div>
              </div>
              <Button
                onClick={handleScan}
                variant="outline"
                size="sm"
                className="font-mono rounded-none w-full text-xs uppercase tracking-wider"
                data-testid="button-retry-scan"
              >
                Retry with GPS
              </Button>
            </div>
          )}
        </div>

        {/* Last QR scan info */}
        {info.lastQrScan && scanState !== "success" && (
          <div className="border border-border/50 bg-muted/10 p-3 space-y-1.5">
            <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider">Previous QR Scan</p>
            <div className="flex items-center gap-2 font-mono text-xs">
              <MapPin className="h-3 w-3 text-primary flex-shrink-0" />
              <span className="text-foreground">{info.lastQrScan.city ?? "Unknown location"}</span>
            </div>
            <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
              <Clock className="h-3 w-3 flex-shrink-0" />
              {new Date(info.lastQrScan.scannedAt).toLocaleString()}
            </div>
            <p className="font-mono text-xs text-muted-foreground">
              Total scans: {info.totalScans}
            </p>
          </div>
        )}

        <p className="font-mono text-xs text-muted-foreground text-center">
          Powered by <Link href="/" className="text-primary hover:underline">FieldTrack</Link>
        </p>
      </div>
    </div>
  );
}
