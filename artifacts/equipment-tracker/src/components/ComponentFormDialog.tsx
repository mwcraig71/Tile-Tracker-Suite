import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCreateComponent, useUpdateComponent, getListComponentsQueryKey } from "@workspace/api-client-react";
import type { EquipmentComponent } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil } from "lucide-react";

const COMPONENT_TYPES: Record<string, { label: string; value: string }[]> = {
  Drone: [
    { value: "battery", label: "Battery" },
    { value: "rotor", label: "Rotor / Propeller" },
    { value: "camera", label: "Camera" },
    { value: "gimbal", label: "Gimbal" },
    { value: "controller", label: "Controller" },
    { value: "landing_gear", label: "Landing Gear" },
    { value: "other", label: "Other" },
  ],
  NDT: [
    { value: "probe", label: "Probe" },
    { value: "transducer", label: "Transducer" },
    { value: "cable", label: "Cable" },
    { value: "calibration_block", label: "Calibration Block" },
    { value: "scanner_head", label: "Scanner Head" },
    { value: "other", label: "Other" },
  ],
  "Rope Access": [
    { value: "rope", label: "Rope" },
    { value: "harness", label: "Harness" },
    { value: "anchor", label: "Anchor" },
    { value: "carabiner", label: "Carabiner" },
    { value: "descender", label: "Descender" },
    { value: "rope_grab", label: "Rope Grab" },
    { value: "helmet", label: "Helmet" },
    { value: "other", label: "Other" },
  ],
  "Laser Measurer": [
    { value: "battery", label: "Battery" },
    { value: "lens", label: "Lens" },
    { value: "tripod", label: "Tripod" },
    { value: "other", label: "Other" },
  ],
  Boat: [
    { value: "engine", label: "Engine" },
    { value: "battery", label: "Battery" },
    { value: "nav_light", label: "Navigation Light" },
    { value: "bilge_pump", label: "Bilge Pump" },
    { value: "anchor", label: "Anchor" },
    { value: "other", label: "Other" },
  ],
};

const DEFAULT_TYPES = [
  { value: "battery", label: "Battery" },
  { value: "sensor", label: "Sensor" },
  { value: "cable", label: "Cable" },
  { value: "module", label: "Module" },
  { value: "other", label: "Other" },
];

export function getComponentTypes(category: string) {
  return COMPONENT_TYPES[category] ?? DEFAULT_TYPES;
}

export function componentTypeLabel(type: string): string {
  for (const list of Object.values(COMPONENT_TYPES)) {
    const found = list.find(t => t.value === type);
    if (found) return found.label;
  }
  return type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  componentType: z.string().min(1, "Type is required"),
  serialNumber: z.string().optional(),
  inServiceDate: z.string().optional(),
  outOfServiceDate: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  equipmentId: number;
  category: string;
  existing?: EquipmentComponent;
  onClose?: () => void;
}

export function ComponentFormDialog({ equipmentId, category, existing, onClose }: Props) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const create = useCreateComponent();
  const update = useUpdateComponent();
  const componentTypes = getComponentTypes(category);
  const isEdit = !!existing;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: existing?.name ?? "",
      componentType: existing?.componentType ?? componentTypes[0]?.value ?? "other",
      serialNumber: existing?.serialNumber ?? "",
      inServiceDate: existing?.inServiceDate ? existing.inServiceDate.slice(0, 10) : "",
      outOfServiceDate: existing?.outOfServiceDate ? existing.outOfServiceDate.slice(0, 10) : "",
      notes: existing?.notes ?? "",
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      const payload = {
        name: values.name,
        componentType: values.componentType,
        serialNumber: values.serialNumber || undefined,
        inServiceDate: values.inServiceDate ? new Date(values.inServiceDate).toISOString() : undefined,
        outOfServiceDate: values.outOfServiceDate ? new Date(values.outOfServiceDate).toISOString() : undefined,
        notes: values.notes || undefined,
      };

      if (isEdit && existing) {
        await update.mutateAsync({ id: equipmentId, componentId: existing.id, data: payload });
        toast({ title: "Component updated" });
      } else {
        await create.mutateAsync({ id: equipmentId, data: payload });
        toast({ title: "Component added" });
      }
      queryClient.invalidateQueries({ queryKey: getListComponentsQueryKey(equipmentId) });
      setOpen(false);
      onClose?.();
      if (!isEdit) form.reset();
    } catch {
      toast({ title: "Error", description: "Failed to save component.", variant: "destructive" });
    }
  }

  const isPending = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-none text-muted-foreground hover:text-foreground"
            title="Edit component"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="font-mono text-xs uppercase tracking-wider rounded-none gap-1.5 border-primary/30 hover:text-primary"
          >
            <Plus className="h-3.5 w-3.5" /> Add Component
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-[480px] border-primary/20 rounded-none bg-card">
        <DialogHeader>
          <DialogTitle className="font-mono text-primary uppercase tracking-wider text-sm">
            {isEdit ? "Edit Component" : "Add Component"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="componentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-xs uppercase">Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="font-mono text-sm bg-background rounded-none border-border">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-none font-mono">
                        {componentTypes.map(t => (
                          <SelectItem key={t.value} value={t.value} className="font-mono text-sm">{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-xs uppercase">Name / Label *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Battery #1"
                        className="font-mono text-sm bg-background rounded-none border-border"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="serialNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-mono text-xs uppercase">Serial Number</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Optional"
                      className="font-mono text-sm bg-background rounded-none border-border"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="inServiceDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-xs uppercase">In Service</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
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
                name="outOfServiceDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-xs uppercase">Out of Service</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        className="font-mono text-sm bg-background rounded-none border-border"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-mono text-xs uppercase">Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Condition, specs, inspection notes..."
                      className="font-mono text-sm bg-background min-h-[56px] rounded-none border-border"
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
                disabled={isPending}
                className="font-mono uppercase tracking-wider rounded-none"
              >
                {isPending ? "Saving..." : isEdit ? "Save Changes" : "Add Component"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
