import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Nfc } from "lucide-react";

/**
 * Web NFC (NDEFReader) is currently available in Chrome/Edge on Android.
 * On unsupported platforms (iOS, desktop) this button renders a short hint
 * instead, and users can type the tag ID or use a handheld RFID reader that
 * types into the adjacent input field (keyboard-wedge mode).
 */
declare global {
  interface Window {
    NDEFReader?: new () => NDEFReaderLike;
  }
}

interface NDEFReaderLike {
  scan(options?: { signal?: AbortSignal }): Promise<void>;
  onreading: ((event: NDEFReadingEventLike) => void) | null;
  onreadingerror: (() => void) | null;
}

interface NDEFReadingEventLike {
  serialNumber: string;
  message: { records: Array<{ recordType: string; data?: DataView; encoding?: string }> };
}

export function isNfcSupported(): boolean {
  return typeof window !== "undefined" && "NDEFReader" in window;
}

/**
 * Normalize an NFC tag serial (e.g. "04:a3:1f:2a:b9:5c:80") into the
 * canonical uppercase form used across the app.
 */
function normalizeSerial(serial: string): string {
  return serial.trim().toUpperCase();
}

interface NfcScanButtonProps {
  onDetected: (tagId: string) => void;
  className?: string;
}

export function NfcScanButton({ onDetected, className }: NfcScanButtonProps) {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  if (!isNfcSupported()) {
    return (
      <p className={`font-mono text-xs text-muted-foreground leading-relaxed ${className ?? ""}`}>
        Tap-to-scan NFC needs Chrome on Android. On other devices, type the tag
        ID or use a handheld RFID reader (it types into the field like a keyboard).
      </p>
    );
  }

  async function startScan() {
    setError("");
    setScanning(true);
    try {
      const controller = new AbortController();
      abortRef.current = controller;
      const reader = new window.NDEFReader!();
      reader.onreading = (event) => {
        controller.abort();
        setScanning(false);
        if (event.serialNumber) {
          onDetected(normalizeSerial(event.serialNumber));
        } else {
          setError("Tag detected but it has no readable serial number.");
        }
      };
      reader.onreadingerror = () => {
        setError("Could not read this tag. Try holding it closer.");
      };
      await reader.scan({ signal: controller.signal });
    } catch (err) {
      setScanning(false);
      const e = err as { name?: string };
      setError(
        e?.name === "NotAllowedError"
          ? "NFC permission denied."
          : "NFC scan failed to start. Make sure NFC is enabled on this device.",
      );
    }
  }

  function stopScan() {
    abortRef.current?.abort();
    setScanning(false);
  }

  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      <Button
        type="button"
        variant="outline"
        onClick={scanning ? stopScan : startScan}
        className="w-full font-mono text-xs uppercase tracking-wider rounded-none gap-2 border-primary/30 hover:text-primary"
        data-testid="button-nfc-scan"
      >
        {scanning ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Hold tag to the back of your phone… (tap to cancel)
          </>
        ) : (
          <>
            <Nfc className="h-4 w-4" /> Scan NFC / RFID Tag
          </>
        )}
      </Button>
      {error && <p className="font-mono text-xs text-destructive">{error}</p>}
    </div>
  );
}
