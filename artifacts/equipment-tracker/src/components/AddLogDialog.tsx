import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCreateEquipmentLog } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Plus, MapPin, Loader2, LocateFixed } from "lucide-react";
import { getLogTypesForCategory } from "@/lib/categories";

const formSchema = z.object({
  logType: z.string().min(1),
  logDate: z.string().min(1, "Date is required"),
  durationMinutes: z.string().optional(),
  operatorName: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AddLogDialogProps {
  equipmentId: number;
  category: string;
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10&addressdetails=1`,
      { headers: { "Accept-Language": "en-US,en" } }
    );
    if (!resp.ok) throw new Error();
    const data = await resp.json();
    const addr = data.address || {};
    const city =
      addr.city || addr.town || addr.village || addr.municipality ||
      addr.county || addr.state || "Unknown";
    return `${city} (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
  } catch {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}

export function AddLogDialog({ equipmentId, category }: AddLogDialogProps) {
  const [open, setOpen] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createLog = useCreateEquipmentLog();
  const logTypes = getLogTypesForCategory(category);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      logType: logTypes[0]?.value || "general",
      logDate: new Date().toISOString().slice(0, 10),
      durationMinutes: "",
      operatorName: "",
      location: "",
      notes: "",
    },
  });

  const selectedType = form.watch("logType");
  const isDrone = category === "Drone";
  const isRopeAccess = category === "Rope Access";

  async function captureGps() {
    if (!navigator.geolocation) {
      toast({ title: "GPS unavailable", description: "Your browser doesn't support geolocation.", variant: "destructive" });
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const locationStr = await reverseGeocode(latitude, longitude);
        form.setValue("location", locationStr, { shouldDirty: true });
        setGpsLoading(false);
        toast({ title: "Location captured", description: locationStr });
      },
      (err) => {
        setGpsLoading(false);
        const msg =
          err.code === 1 ? "Location permission denied." :
          err.code === 2 ? "Position unavailable." :
          "GPS timed out.";
        toast({ title: "GPS failed", description: msg, variant: "destructive" });
      },
      { timeout: 10000, maximumAge: 60000, enableHighAccuracy: true }
    );
  }

  const onSubmit = async (values: FormValues) => {
    try {
      await createLog.mutateAsync({
        id: equipmentId,
        data: {
          logType: values.logType,
          logDate: new Date(values.logDate).toISOString(),
          durationMinutes: values.durationMinutes ? parseInt(values.durationMinutes) : undefined,
          operatorName: values.operatorName || undefined,
          location: values.location || undefined,
          notes: values.notes || undefined,
        },
      });
      toast({ title: "Log entry added" });
      queryClient.invalidateQueries();
      setOpen(false);
      form.reset({
        logType: logTypes[0]?.value || "general",
        logDate: new Date().toISOString().slice(0, 10),
        durationMinutes: "",
        operatorName: "",
        location: "",
        notes: "",
      });
    } catch {
      toast({ title: "Error", description: "Failed to add log.", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          data-testid="button-add-log"
          className="font-mono text-xs uppercase tracking-wider rounded-none gap-1.5 border-primary/30 hover:text-primary"
        >
          <Plus className="h-3.5 w-3.5" /> Add Log Entry
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[480px] border-primary/20 rounded-none bg-card">
        <DialogHeader>
          <DialogTitle className="font-mono text-primary uppercase tracking-wider text-sm">
            Add Use Log
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="logType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-xs uppercase">Event Type *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="font-mono text-sm bg-background rounded-none border-border">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-none font-mono">
                        {logTypes.map(t => (
                          <SelectItem key={t.value} value={t.value} className="font-mono text-sm">{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="logDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-xs uppercase">Date *</FormLabel>
                    <FormControl>
                      <Input type="date" className="font-mono text-sm bg-background rounded-none border-border" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="durationMinutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-xs uppercase">
                      {isDrone && selectedType === "flight" ? "Flight Time (min)" : isRopeAccess ? "Use Time (min)" : "Duration (min)"}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        className="font-mono text-sm bg-background rounded-none border-border"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="operatorName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-xs uppercase">
                      {isDrone && selectedType === "flight" ? "Pilot" : "Operator"}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Name"
                        className="font-mono text-sm bg-background rounded-none border-border"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* Location with GPS capture */}
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel className="font-mono text-xs uppercase">Location / Site</FormLabel>
                    <button
                      type="button"
                      onClick={captureGps}
                      disabled={gpsLoading}
                      className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-primary hover:text-primary/70 transition-colors disabled:opacity-50"
                      title="Use device GPS to fill location"
                    >
                      {gpsLoading
                        ? <Loader2 className="h-3 w-3 animate-spin" />
                        : <LocateFixed className="h-3 w-3" />
                      }
                      {gpsLoading ? "Locating…" : "Use GPS"}
                    </button>
                  </div>
                  <div className="relative">
                    <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    <FormControl>
                      <Input
                        placeholder="Job site, city, or GPS will fill this"
                        className="font-mono text-sm bg-background rounded-none border-border pl-8"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-mono text-xs uppercase">Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={
                        isDrone && selectedType === "flight"
                          ? "Battery info, conditions, incidents..."
                          : isRopeAccess
                          ? "Load applied, rigging notes, condition after use..."
                          : "Notes..."
                      }
                      className="font-mono text-sm bg-background min-h-[64px] rounded-none border-border"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
                className="font-mono uppercase tracking-wider rounded-none text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createLog.isPending}
                className="font-mono uppercase tracking-wider rounded-none"
              >
                {createLog.isPending ? "Saving..." : "Save Log"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
