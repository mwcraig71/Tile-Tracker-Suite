import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2, Nfc } from "lucide-react";

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
  write(
    message: { records: Array<{ recordType: string; data: string }> },
    options?: { signal?: AbortSignal },
  ): Promise<void>;
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

interface NfcWriteButtonProps {
  /** URL to write onto the tag as an NDEF url record. */
  url: string;
  className?: string;
}

/**
 * Writes the equipment's public scan URL onto an NFC tag. A tag written
 * this way opens the location-update page when tapped by ANY phone —
 * including iPhones, which read NDEF URLs natively — mirroring what the
 * printed QR label does. Writing requires Chrome/Edge on Android.
 */
export function NfcWriteButton({ url, className }: NfcWriteButtonProps) {
  const [state, setState] = useState<"idle" | "writing" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  if (!isNfcSupported()) return null;

  async function startWrite() {
    setError("");
    setState("writing");
    try {
      const controller = new AbortController();
      abortRef.current = controller;
      const reader = new window.NDEFReader!();
      await reader.write(
        { records: [{ recordType: "url", data: url }] },
        { signal: controller.signal },
      );
      setState("done");
    } catch (err) {
      const e = err as { name?: string };
      if (e?.name === "AbortError") {
        setState("idle");
        return;
      }
      setState("error");
      setError(
        e?.name === "NotAllowedError"
          ? "NFC permission denied."
          : e?.name === "NotSupportedError"
            ? "This tag can't be written (read-only or incompatible)."
            : "Write failed. Hold the tag steady against the phone and try again.",
      );
    }
  }

  function cancelWrite() {
    abortRef.current?.abort();
    setState("idle");
  }

  if (state === "done") {
    return (
      <div className={`flex items-center gap-2 font-mono text-xs text-green-400 ${className ?? ""}`}>
        <CheckCircle className="h-4 w-4 flex-shrink-0" />
        Tag written — tapping it now opens this equipment's scan page.
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setState("idle")}
          className="font-mono text-xs rounded-none text-muted-foreground ml-auto"
        >
          Write Another
        </Button>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      <Button
        type="button"
        variant="outline"
        onClick={state === "writing" ? cancelWrite : startWrite}
        className="w-full font-mono text-xs uppercase tracking-wider rounded-none gap-2 border-primary/30 hover:text-primary"
        data-testid="button-nfc-write"
      >
        {state === "writing" ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Hold tag to phone to write… (tap to cancel)
          </>
        ) : (
          <>
            <Nfc className="h-4 w-4" /> Write Link to NFC Tag
          </>
        )}
      </Button>
      {state === "error" && <p className="font-mono text-xs text-destructive">{error}</p>}
    </div>
  );
}
