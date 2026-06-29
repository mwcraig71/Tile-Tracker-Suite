import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useListComponents, useDeleteComponent,
  useListComponentLogs, useCreateComponentLog, useDeleteComponentLog,
  getListComponentsQueryKey, getListComponentLogsQueryKey,
} from "@workspace/api-client-react";
import type { EquipmentComponent, ComponentLog } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Cpu, Plus, ChevronDown, ChevronRight, Trash2,
  CalendarCheck, CalendarX, Hash, Clock, MapPin,
  ClipboardList, LocateFixed, Loader2,
} from "lucide-react";
import { ComponentFormDialog, componentTypeLabel } from "./ComponentFormDialog";

const LOG_TYPES = [
  { value: "maintenance", label: "Maintenance" },
  { value: "inspection", label: "Inspection" },
  { value: "charge", label: "Charge Cycle" },
  { value: "replacement", label: "Replacement" },
  { value: "general", label: "General Use" },
];

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10`,
      { headers: { "Accept-Language": "en-US,en" } }
    );
    const data = await resp.json();
    const addr = data.address || {};
    const city = addr.city || addr.town || addr.village || addr.county || addr.state || "Unknown";
    return `${city} (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
  } catch {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}

const logSchema = z.object({
  logType: z.string().min(1),
  logDate: z.string().min(1),
  durationMinutes: z.string().optional(),
  operatorName: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
});
type LogFormValues = z.infer<typeof logSchema>;

function AddComponentLogDialog({ equipmentId, componentId }: { equipmentId: number; componentId: number }) {
  const [open, setOpen] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createLog = useCreateComponentLog();

  const form = useForm<LogFormValues>({
    resolver: zodResolver(logSchema),
    defaultValues: {
      logType: "maintenance",
      logDate: new Date().toISOString().slice(0, 10),
      durationMinutes: "",
      operatorName: "",
      location: "",
      notes: "",
    },
  });

  async function captureGps() {
    if (!navigator.geolocation) return;
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const loc = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
        form.setValue("location", loc, { shouldDirty: true });
        setGpsLoading(false);
      },
      () => setGpsLoading(false),
      { timeout: 10000, maximumAge: 60000, enableHighAccuracy: true }
    );
  }

  async function onSubmit(values: LogFormValues) {
    try {
      await createLog.mutateAsync({
        id: equipmentId,
        componentId,
        data: {
          logType: values.logType,
          logDate: new Date(values.logDate).toISOString(),
          durationMinutes: values.durationMinutes ? parseInt(values.durationMinutes) : undefined,
          operatorName: values.operatorName || undefined,
          location: values.location || undefined,
          notes: values.notes || undefined,
        },
      });
      toast({ title: "Service log added" });
      queryClient.invalidateQueries({ queryKey: getListComponentLogsQueryKey(equipmentId, componentId) });
      setOpen(false);
      form.reset({
        logType: "maintenance",
        logDate: new Date().toISOString().slice(0, 10),
        durationMinutes: "", operatorName: "", location: "", notes: "",
      });
    } catch {
      toast({ title: "Error", description: "Failed to add log.", variant: "destructive" });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="font-mono text-xs rounded-none gap-1 text-muted-foreground hover:text-primary h-6 px-2"
        >
          <Plus className="h-3 w-3" /> Log
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[440px] border-primary/20 rounded-none bg-card">
        <DialogHeader>
          <DialogTitle className="font-mono text-primary uppercase tracking-wider text-sm">
            Add Service Log
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="logType" render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-mono text-xs uppercase">Event *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="font-mono text-sm bg-background rounded-none border-border">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="rounded-none font-mono">
                      {LOG_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value} className="font-mono text-sm">{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />

              <FormField control={form.control} name="logDate" render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-mono text-xs uppercase">Date *</FormLabel>
                  <FormControl>
                    <Input type="date" className="font-mono text-sm bg-background rounded-none border-border" {...field} />
                  </FormControl>
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="durationMinutes" render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-mono text-xs uppercase">Duration (min)</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" placeholder="0" className="font-mono text-sm bg-background rounded-none border-border" {...field} value={field.value || ""} />
                  </FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="operatorName" render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-mono text-xs uppercase">Operator</FormLabel>
                  <FormControl>
                    <Input placeholder="Name" className="font-mono text-sm bg-background rounded-none border-border" {...field} value={field.value || ""} />
                  </FormControl>
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="location" render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel className="font-mono text-xs uppercase">Location</FormLabel>
                  <button type="button" onClick={captureGps} disabled={gpsLoading}
                    className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-primary hover:text-primary/70 disabled:opacity-50">
                    {gpsLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <LocateFixed className="h-3 w-3" />}
                    {gpsLoading ? "Locating…" : "Use GPS"}
                  </button>
                </div>
                <div className="relative">
                  <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <FormControl>
                    <Input placeholder="Site or GPS will fill this" className="font-mono text-sm bg-background rounded-none border-border pl-8" {...field} value={field.value || ""} />
                  </FormControl>
                </div>
              </FormItem>
            )} />

            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel className="font-mono text-xs uppercase">Notes</FormLabel>
                <FormControl>
                  <Textarea placeholder="Condition, measurements, actions taken..." className="font-mono text-sm bg-background min-h-[56px] rounded-none border-border" {...field} value={field.value || ""} />
                </FormControl>
              </FormItem>
            )} />

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="font-mono uppercase tracking-wider rounded-none text-xs">Cancel</Button>
              <Button type="submit" disabled={createLog.isPending} className="font-mono uppercase tracking-wider rounded-none">
                {createLog.isPending ? "Saving..." : "Save Log"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function fmtDuration(mins: number | null | undefined) {
  if (!mins) return null;
  if (mins < 60) return `${mins}min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function ComponentLogEntry({
  log,
  equipmentId,
  componentId,
}: {
  log: ComponentLog;
  equipmentId: number;
  componentId: number;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const deleteLog = useDeleteComponentLog();

  async function handleDelete() {
    if (!confirm("Delete this log entry?")) return;
    try {
      await deleteLog.mutateAsync({ id: equipmentId, componentId, logId: log.id });
      queryClient.invalidateQueries({ queryKey: getListComponentLogsQueryKey(equipmentId, componentId) });
    } catch {
      toast({ title: "Error", description: "Failed to delete log.", variant: "destructive" });
    }
  }

  const typeLabel = LOG_TYPES.find(t => t.value === log.logType)?.label || log.logType;

  return (
    <div className="flex items-start justify-between gap-2 py-1.5 px-3 hover:bg-muted/20 group">
      <div className="space-y-0.5 min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="font-mono text-[10px] rounded-none border-primary/20 text-primary px-1.5 py-0">
            {typeLabel}
          </Badge>
          <span className="font-mono text-[11px] text-muted-foreground">
            {new Date(log.logDate).toLocaleDateString()}
          </span>
          {fmtDuration(log.durationMinutes) && (
            <span className="font-mono text-[11px] text-muted-foreground flex items-center gap-0.5">
              <Clock className="h-2.5 w-2.5" />{fmtDuration(log.durationMinutes)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 font-mono text-[11px] text-muted-foreground flex-wrap">
          {log.operatorName && <span>{log.operatorName}</span>}
          {log.location && (
            <span className="flex items-center gap-0.5">
              <MapPin className="h-2.5 w-2.5 text-primary/50" />{log.location}
            </span>
          )}
        </div>
        {log.notes && (
          <p className="font-mono text-[11px] text-foreground/60 leading-snug">{log.notes}</p>
        )}
      </div>
      <button
        onClick={handleDelete}
        className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}

function ComponentRow({
  component,
  equipmentId,
  category,
}: {
  component: EquipmentComponent;
  equipmentId: number;
  category: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const deleteComponent = useDeleteComponent();

  const { data: logs, isLoading: logsLoading } = useListComponentLogs(equipmentId, component.id, {
    query: {
      queryKey: getListComponentLogsQueryKey(equipmentId, component.id),
      enabled: expanded,
    },
  });

  async function handleDelete() {
    if (!confirm(`Delete "${component.name}"? This will also remove its service log.`)) return;
    try {
      await deleteComponent.mutateAsync({ id: equipmentId, componentId: component.id });
      queryClient.invalidateQueries({ queryKey: getListComponentsQueryKey(equipmentId) });
      toast({ title: "Component removed" });
    } catch {
      toast({ title: "Error", description: "Failed to delete component.", variant: "destructive" });
    }
  }

  const isRetired = !!component.outOfServiceDate && new Date(component.outOfServiceDate) <= new Date();

  return (
    <div className="border-b border-border/50 last:border-0">
      {/* Component header row */}
      <div className="flex items-center gap-2 px-4 py-2.5 hover:bg-muted/20 transition-colors">
        <button
          onClick={() => setExpanded(e => !e)}
          className="flex items-center gap-2 flex-1 min-w-0 text-left"
        >
          {expanded
            ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          }
          <span className="font-mono text-sm font-medium text-foreground truncate">
            {component.name}
          </span>
          <span className={`font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 border flex-shrink-0 ${
            isRetired
              ? "border-destructive/30 text-destructive/70 bg-destructive/5"
              : "border-primary/20 text-primary/80 bg-primary/5"
          }`}>
            {componentTypeLabel(component.componentType)}
          </span>
          {isRetired && (
            <span className="font-mono text-[10px] text-destructive/60 flex-shrink-0">Retired</span>
          )}
        </button>

        <div className="flex items-center gap-1 flex-shrink-0">
          <AddComponentLogDialog equipmentId={equipmentId} componentId={component.id} />
          <ComponentFormDialog equipmentId={equipmentId} category={category} existing={component} />
          <button
            onClick={handleDelete}
            className="text-muted-foreground hover:text-destructive transition-colors p-1"
            title="Delete component"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Expanded detail + logs */}
      {expanded && (
        <div className="ml-6 mr-4 mb-2 border border-border/40 bg-muted/10">
          {/* Component metadata */}
          <div className="flex flex-wrap gap-x-6 gap-y-1 px-3 py-2 border-b border-border/30 bg-muted/20 font-mono text-[11px] text-muted-foreground">
            {component.serialNumber && (
              <span className="flex items-center gap-1">
                <Hash className="h-2.5 w-2.5" /> SN: {component.serialNumber}
              </span>
            )}
            {component.inServiceDate && (
              <span className="flex items-center gap-1">
                <CalendarCheck className="h-2.5 w-2.5 text-green-500" />
                In: {new Date(component.inServiceDate).toLocaleDateString()}
              </span>
            )}
            {component.outOfServiceDate && (
              <span className="flex items-center gap-1">
                <CalendarX className="h-2.5 w-2.5 text-destructive" />
                Out: {new Date(component.outOfServiceDate).toLocaleDateString()}
              </span>
            )}
            {component.notes && (
              <span className="text-foreground/50 italic">{component.notes}</span>
            )}
          </div>

          {/* Service logs */}
          <div>
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/30">
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <ClipboardList className="h-3 w-3" />
                Service Log
                {logs && logs.length > 0 && (
                  <span className="text-primary font-bold">{logs.length}</span>
                )}
              </span>
            </div>

            {logsLoading ? (
              <div className="px-3 py-2 space-y-1">
                <Skeleton className="h-5 w-full bg-muted" />
                <Skeleton className="h-5 w-3/4 bg-muted" />
              </div>
            ) : logs && logs.length > 0 ? (
              <div className="divide-y divide-border/30">
                {logs.map(log => (
                  <ComponentLogEntry
                    key={log.id}
                    log={log}
                    equipmentId={equipmentId}
                    componentId={component.id}
                  />
                ))}
              </div>
            ) : (
              <div className="px-3 py-4 text-center font-mono text-[11px] text-muted-foreground/60">
                No service log yet — use the <span className="text-primary">+ Log</span> button to add an entry.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface ComponentsSectionProps {
  equipmentId: number;
  category: string;
}

export function ComponentsSection({ equipmentId, category }: ComponentsSectionProps) {
  const { data: components, isLoading } = useListComponents(equipmentId, {
    query: { queryKey: getListComponentsQueryKey(equipmentId) },
  });

  const active = components?.filter(c => !c.outOfServiceDate || new Date(c.outOfServiceDate) > new Date()) ?? [];
  const retired = components?.filter(c => c.outOfServiceDate && new Date(c.outOfServiceDate) <= new Date()) ?? [];

  return (
    <Card className="border-border bg-card rounded-none">
      <CardHeader className="border-b border-border bg-muted/30 py-3 px-4 flex flex-row items-center">
        <CardTitle className="font-mono text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2 flex-1">
          <Cpu className="h-4 w-4 text-primary" /> Components
          {components && components.length > 0 && (
            <span className="text-primary font-bold">
              {active.length} active
              {retired.length > 0 && <span className="text-muted-foreground font-normal ml-1">· {retired.length} retired</span>}
            </span>
          )}
        </CardTitle>
        <ComponentFormDialog equipmentId={equipmentId} category={category} />
      </CardHeader>

      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-4 space-y-2">
            <Skeleton className="h-10 w-full bg-muted" />
            <Skeleton className="h-10 w-full bg-muted" />
          </div>
        ) : components && components.length > 0 ? (
          <div>
            {[...active, ...retired].map(component => (
              <ComponentRow
                key={component.id}
                component={component}
                equipmentId={equipmentId}
                category={category}
              />
            ))}
          </div>
        ) : (
          <div className="p-8 text-center space-y-2">
            <Cpu className="h-8 w-8 text-muted-foreground/40 mx-auto" />
            <p className="font-mono text-sm text-muted-foreground">No components added yet.</p>
            <p className="font-mono text-xs text-muted-foreground/70">
              Add batteries, sensors, ropes, or any sub-component to track their service individually.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
