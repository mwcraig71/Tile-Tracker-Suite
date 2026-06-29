import { useParams, Link } from "wouter";
import {
  useGetEquipment, getGetEquipmentQueryKey,
  useGetTiles, getGetTilesQueryKey,
  useListEquipmentLogs, getListEquipmentLogsQueryKey,
  useListQrScans, getListQrScansQueryKey,
} from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Printer, ArrowLeft } from "lucide-react";

const LOG_TYPE_LABELS: Record<string, string> = {
  flight: "Flight",
  rope_access: "Rope Access",
  inspection: "Inspection",
  maintenance: "Maintenance",
  general: "General Use",
};

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function fmtDuration(mins: number | null | undefined) {
  if (!mins) return "—";
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function EquipmentPrintPage() {
  const { id } = useParams<{ id: string }>();
  const equipmentId = parseInt(id || "0", 10);

  const { data: equipment, isLoading: loadingEq, isError } = useGetEquipment(equipmentId, {
    query: { queryKey: getGetEquipmentQueryKey(equipmentId), enabled: !isNaN(equipmentId) }
  });
  const { data: tiles } = useGetTiles({ query: { queryKey: getGetTilesQueryKey() } });
  const { data: logs, isLoading: loadingLogs } = useListEquipmentLogs(equipmentId, {
    query: { queryKey: getListEquipmentLogsQueryKey(equipmentId), enabled: !isNaN(equipmentId) }
  });
  const { data: scans } = useListQrScans(equipmentId, {
    query: { queryKey: getListQrScansQueryKey(equipmentId), enabled: !isNaN(equipmentId) }
  });

  const tile = tiles?.find(t => t.uuid === equipment?.tileUuid);

  const totalMinutes = logs?.reduce((s, l) => s + (l.durationMinutes ?? 0), 0) ?? 0;
  const totalH = Math.floor(totalMinutes / 60);
  const totalM = totalMinutes % 60;

  if (loadingEq || loadingLogs) {
    return (
      <div className="p-8 space-y-4 max-w-4xl mx-auto">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !equipment) {
    return (
      <div className="p-8 flex flex-col items-center gap-4">
        <AlertTriangle className="h-10 w-10 text-destructive" />
        <p className="font-mono">Equipment not found.</p>
        <Link href="/equipment"><Button variant="outline" className="rounded-none font-mono">Back</Button></Link>
      </div>
    );
  }

  return (
    <>
      {/* Screen-only toolbar */}
      <div className="print:hidden flex items-center gap-3 p-4 border-b border-border bg-background sticky top-0 z-10">
        <Link href={`/equipment/${equipmentId}`}>
          <Button variant="ghost" size="sm" className="font-mono rounded-none gap-1.5 text-xs uppercase tracking-wider">
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </Button>
        </Link>
        <div className="flex-1" />
        <Button
          onClick={() => window.print()}
          className="font-mono uppercase tracking-wider rounded-none gap-2 text-sm"
        >
          <Printer className="h-4 w-4" /> Print / Save PDF
        </Button>
      </div>

      {/* Printable content */}
      <div className="print-page p-6 md:p-10 max-w-4xl mx-auto space-y-8 font-mono text-sm text-foreground print:text-black print:p-0 print:max-w-none">

        {/* Header */}
        <div className="flex items-start justify-between border-b-2 border-primary print:border-black pb-4">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground print:text-gray-500 mb-1">
              FieldTrack — Equipment Service Record
            </div>
            <h1 className="text-2xl md:text-3xl font-bold uppercase tracking-wider text-foreground print:text-black">
              {equipment.label}
            </h1>
            <div className="text-sm text-muted-foreground print:text-gray-600 mt-1 flex flex-wrap gap-x-4 gap-y-0.5">
              <span>{equipment.category}</span>
              {equipment.serialNumber && <span>SN: {equipment.serialNumber}</span>}
              {tile && <span>Tile: {tile.name}</span>}
            </div>
          </div>
          <div className="text-right text-xs text-muted-foreground print:text-gray-500 flex-shrink-0">
            <div>Printed: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</div>
            {tile && (
              <div className="mt-1">
                Status: <strong className={tile.lost ? "text-destructive" : tile.dead ? "text-gray-500" : "text-green-600"}>
                  {tile.dead ? "DEAD" : tile.lost ? "LOST" : "ACTIVE"}
                </strong>
              </div>
            )}
          </div>
        </div>

        {/* Equipment details table */}
        <section>
          <h2 className="text-xs uppercase tracking-widest text-muted-foreground print:text-gray-500 mb-3 border-b border-border print:border-gray-300 pb-1">
            Asset Information
          </h2>
          <table className="w-full text-sm border-collapse">
            <tbody>
              {[
                ["Label", equipment.label],
                ["Category", equipment.category],
                ["Serial Number", equipment.serialNumber || "—"],
                ["In Service Date", fmtDate(equipment.inServiceDate)],
                ["Out of Service Date", fmtDate(equipment.outOfServiceDate)],
                ["Tile Tracker", tile?.name || equipment.tileUuid],
                ["Last GPS Ping", tile?.lastSeen ? fmtDate(tile.lastSeen) : "—"],
                ["Last Known Location",
                  tile?.latitude && tile?.longitude
                    ? `${tile.latitude.toFixed(5)}, ${tile.longitude.toFixed(5)}`
                    : "—"
                ],
                ["Asset Tag / Custom QR", equipment.customQrCode || "—"],
              ].map(([label, value]) => (
                <tr key={label} className="border-b border-border/40 print:border-gray-200">
                  <td className="py-1.5 pr-4 text-muted-foreground print:text-gray-500 w-48 align-top">{label}</td>
                  <td className="py-1.5 font-medium text-foreground print:text-black">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {equipment.notes && (
            <div className="mt-3 p-3 bg-muted/30 print:bg-gray-50 border border-border print:border-gray-200">
              <div className="text-xs uppercase tracking-wider text-muted-foreground print:text-gray-500 mb-1">Field Notes</div>
              <p className="text-sm leading-relaxed print:text-black">{equipment.notes}</p>
            </div>
          )}
        </section>

        {/* Use log */}
        <section>
          <div className="flex items-baseline justify-between border-b border-border print:border-gray-300 pb-1 mb-3">
            <h2 className="text-xs uppercase tracking-widest text-muted-foreground print:text-gray-500">
              Use Log
            </h2>
            {logs && logs.length > 0 && (
              <span className="text-xs text-muted-foreground print:text-gray-500">
                {logs.length} {logs.length === 1 ? "entry" : "entries"}
                {totalMinutes > 0 && ` · Total: ${totalH > 0 ? `${totalH}h ` : ""}${totalM}m`}
              </span>
            )}
          </div>

          {!logs || logs.length === 0 ? (
            <p className="text-muted-foreground print:text-gray-400 italic text-sm">No use log entries recorded.</p>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-muted/40 print:bg-gray-100">
                  <th className="text-left py-2 px-2 text-xs uppercase tracking-wider text-muted-foreground print:text-gray-600 font-medium border border-border/40 print:border-gray-200">Date</th>
                  <th className="text-left py-2 px-2 text-xs uppercase tracking-wider text-muted-foreground print:text-gray-600 font-medium border border-border/40 print:border-gray-200">Type</th>
                  <th className="text-left py-2 px-2 text-xs uppercase tracking-wider text-muted-foreground print:text-gray-600 font-medium border border-border/40 print:border-gray-200">Duration</th>
                  <th className="text-left py-2 px-2 text-xs uppercase tracking-wider text-muted-foreground print:text-gray-600 font-medium border border-border/40 print:border-gray-200">Operator</th>
                  <th className="text-left py-2 px-2 text-xs uppercase tracking-wider text-muted-foreground print:text-gray-600 font-medium border border-border/40 print:border-gray-200">Location / Site</th>
                  <th className="text-left py-2 px-2 text-xs uppercase tracking-wider text-muted-foreground print:text-gray-600 font-medium border border-border/40 print:border-gray-200">Notes</th>
                </tr>
              </thead>
              <tbody>
                {[...logs].reverse().map((log, i) => (
                  <tr key={log.id} className={i % 2 === 0 ? "bg-background print:bg-white" : "bg-muted/20 print:bg-gray-50"}>
                    <td className="py-2 px-2 border border-border/40 print:border-gray-200 align-top whitespace-nowrap">
                      {fmtDate(log.logDate)}
                    </td>
                    <td className="py-2 px-2 border border-border/40 print:border-gray-200 align-top whitespace-nowrap font-medium">
                      {LOG_TYPE_LABELS[log.logType] || log.logType}
                    </td>
                    <td className="py-2 px-2 border border-border/40 print:border-gray-200 align-top whitespace-nowrap">
                      {fmtDuration(log.durationMinutes)}
                    </td>
                    <td className="py-2 px-2 border border-border/40 print:border-gray-200 align-top">
                      {log.operatorName || "—"}
                    </td>
                    <td className="py-2 px-2 border border-border/40 print:border-gray-200 align-top max-w-[160px]">
                      {log.location || "—"}
                    </td>
                    <td className="py-2 px-2 border border-border/40 print:border-gray-200 align-top text-muted-foreground print:text-gray-600 max-w-[200px] leading-snug">
                      {log.notes || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
              {totalMinutes > 0 && (
                <tfoot>
                  <tr className="bg-muted/60 print:bg-gray-100 font-bold">
                    <td colSpan={2} className="py-2 px-2 border border-border/40 print:border-gray-200 text-xs uppercase tracking-wider">Total</td>
                    <td className="py-2 px-2 border border-border/40 print:border-gray-200">
                      {totalH > 0 ? `${totalH}h ` : ""}{totalM}m
                    </td>
                    <td colSpan={3} className="border border-border/40 print:border-gray-200" />
                  </tr>
                </tfoot>
              )}
            </table>
          )}
        </section>

        {/* QR Scan history (brief) */}
        {scans && scans.length > 0 && (
          <section>
            <h2 className="text-xs uppercase tracking-widest text-muted-foreground print:text-gray-500 border-b border-border print:border-gray-300 pb-1 mb-3">
              QR Scan History ({scans.length})
            </h2>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-muted/40 print:bg-gray-100">
                  <th className="text-left py-2 px-2 text-xs uppercase tracking-wider text-muted-foreground print:text-gray-600 font-medium border border-border/40 print:border-gray-200">Date / Time</th>
                  <th className="text-left py-2 px-2 text-xs uppercase tracking-wider text-muted-foreground print:text-gray-600 font-medium border border-border/40 print:border-gray-200">Location</th>
                </tr>
              </thead>
              <tbody>
                {scans.slice(0, 20).map((scan, i) => (
                  <tr key={scan.id} className={i % 2 === 0 ? "bg-background print:bg-white" : "bg-muted/20 print:bg-gray-50"}>
                    <td className="py-1.5 px-2 border border-border/40 print:border-gray-200 whitespace-nowrap">
                      {new Date(scan.scannedAt).toLocaleString()}
                    </td>
                    <td className="py-1.5 px-2 border border-border/40 print:border-gray-200">
                      {scan.latitude && scan.longitude
                        ? `${scan.latitude.toFixed(5)}, ${scan.longitude.toFixed(5)}`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* Footer */}
        <div className="pt-4 border-t border-border print:border-gray-300 flex justify-between text-xs text-muted-foreground print:text-gray-400">
          <span>FieldTrack — Equipment Service Record</span>
          <span>{equipment.label} · {equipment.serialNumber || equipment.tileUuid}</span>
        </div>
      </div>

      <style>{`
        @media print {
          body { background: white !important; }
          .print-page { font-family: 'Courier New', monospace; }
        }
      `}</style>
    </>
  );
}
