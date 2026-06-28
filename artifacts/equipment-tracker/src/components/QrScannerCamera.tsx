import { useEffect, useRef, useState, useCallback } from "react";
import jsQR from "jsqr";
import { Camera, X, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QrScannerCameraProps {
  onDetected: (value: string) => void;
  onClose: () => void;
}

export function QrScannerCamera({ onDetected, onClose }: QrScannerCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const [status, setStatus] = useState<"starting" | "scanning" | "detected" | "error">("starting");
  const [errorMsg, setErrorMsg] = useState("");
  const [detectedValue, setDetectedValue] = useState("");

  const scan = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(scan);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(video, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);

    if (code) {
      setStatus("detected");
      setDetectedValue(code.data);
      stopCamera();
      setTimeout(() => onDetected(code.data), 600);
      return;
    }

    rafRef.current = requestAnimationFrame(scan);
  }, [onDetected]);

  function stopCamera() {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }

  useEffect(() => {
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
        setErrorMsg(err.name === "NotAllowedError" ? "Camera permission denied." : "Camera not available.");
        setStatus("error");
      });

    return () => stopCamera();
  }, [scan]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-full aspect-square max-w-[260px] bg-black overflow-hidden border-2 border-primary/40">
        <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
        <canvas ref={canvasRef} className="hidden" />

        {/* Scanning frame overlay */}
        {status === "scanning" && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-40 h-40 border-2 border-primary/70 relative">
              <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-primary" />
              <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-primary" />
              <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-primary" />
              <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-primary" />
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary/60 animate-[scan_2s_ease-in-out_infinite]" />
            </div>
          </div>
        )}

        {status === "starting" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          </div>
        )}

        {status === "detected" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70">
            <CheckCircle className="h-12 w-12 text-green-400" />
          </div>
        )}

        {status === "error" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-4">
            <p className="font-mono text-xs text-destructive text-center">{errorMsg}</p>
          </div>
        )}
      </div>

      <p className="font-mono text-xs text-muted-foreground text-center">
        {status === "scanning" ? "Point camera at a QR code..." : status === "detected" ? `Detected: ${detectedValue.slice(0, 40)}...` : ""}
      </p>

      <Button variant="ghost" size="sm" onClick={() => { stopCamera(); onClose(); }} className="font-mono text-xs rounded-none gap-2 text-muted-foreground">
        <X className="h-3.5 w-3.5" /> Cancel
      </Button>

      <style>{`
        @keyframes scan {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(158px); }
        }
      `}</style>
    </div>
  );
}
