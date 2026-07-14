import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Equipment } from "@workspace/api-client-react";
import { useCreateEquipment, useUpdateEquipment, useDeleteEquipment } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Camera, QrCode, X, Nfc } from "lucide-react";
import { EQUIPMENT_CATEGORIES } from "@/lib/categories";
import { QrScannerCamera } from "@/components/QrScannerCamera";
import { NfcScanButton } from "@/components/NfcScanButton";

const formSchema = z.object({
  label: z.string().min(1, "Label is required"),
  category: z.enum(EQUIPMENT_CATEGORIES),
  description: z.string().optional(),
  serialNumber: z.string().optional(),
  notes: z.string().optional(),
  inServiceDate: z.string().optional(),
  outOfServiceDate: z.string().optional(),
  customQrCode: z.string().optional(),
  rfidTag: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface EquipmentFormDialogProps {
  /** Tile to link. Omit (or pass null) to create QR/RFID-only equipment. */
  tileUuid?: string | null;
  existingEquipment?: Equipment | null;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function EquipmentFormDialog({ tileUuid, existingEquipment, trigger, open: openProp, onOpenChange }: EquipmentFormDialogProps) {
  const [openInternal, setOpenInternal] = useState(false);
  const open = openProp !== undefined ? openProp : openInternal;
  const setOpen = (v: boolean) => { setOpenInternal(v); onOpenChange?.(v); };
  const [showScanner, setShowScanner] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createMutation = useCreateEquipment();
  const updateMutation = useUpdateEquipment();
  const deleteMutation = useDeleteEquipment();

  function toDateInputValue(iso?: string | null) {
    if (!iso) return "";
    return new Date(iso).toISOString().slice(0, 10);
  }

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      label: existingEquipment?.label || "",
      category: (existingEquipment?.category as any) || "Other",
      description: existingEquipment?.description || "",
      serialNumber: existingEquipment?.serialNumber || "",
      notes: existingEquipment?.notes || "",
      inServiceDate: toDateInputValue(existingEquipment?.inServiceDate),
      outOfServiceDate: toDateInputValue(existingEquipment?.outOfServiceDate),
      customQrCode: existingEquipment?.customQrCode || "",
      rfidTag: existingEquipment?.rfidTag || "",
    },
  });

  function handleQrDetected(value: string) {
    form.setValue("customQrCode", value);
    setShowScanner(false);
    toast({ title: "QR code detected", description: `Value: ${value.slice(0, 60)}${value.length > 60 ? "…" : ""}` });
  }

  const onSubmit = async (values: FormValues) => {
    try {
      const payload: any = {
        ...values,
        inServiceDate: values.inServiceDate ? new Date(values.inServiceDate).toISOString() : undefined,
        outOfServiceDate: values.outOfServiceDate ? new Date(values.outOfServiceDate).toISOString() : undefined,
        // Send empty strings through; the server normalizes them to null,
        // which is what allows clearing a tag on edit.
        customQrCode: values.customQrCode ?? "",
        rfidTag: values.rfidTag ?? "",
      };

      if (existingEquipment) {
        await updateMutation.mutateAsync({ id: existingEquipment.id, data: payload });
        toast({ title: "Equipment updated" });
      } else {
        await createMutation.mutateAsync({ data: { ...(tileUuid ? { tileUuid } : {}), ...payload } });
        toast({
          title: "Equipment created",
          description: tileUuid ? "Record linked to Tile." : "Record created — attach tags any time.",
        });
      }
      queryClient.invalidateQueries();
      setOpen(false);
    } catch (err) {
      const e = err as { status?: number; message?: string };
      toast({
        title: "Error",
        description: e?.status === 409 && e.message
          ? e.message.replace(/^HTTP \d+[^:]*:\s*/, "")
          : "Failed to save. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!existingEquipment) return;
    if (confirm(existingEquipment.tileUuid
      ? "Delete this equipment record? The Tile will remain but lose its metadata."
      : "Delete this equipment record? Its QR/RFID tags will no longer resolve.")) {
      try {
        await deleteMutation.mutateAsync({ id: existingEquipment.id });
        toast({ title: "Equipment deleted" });
        queryClient.invalidateQueries();
        setOpen(false);
      } catch {
        toast({ title: "Error", description: "Failed to delete.", variant: "destructive" });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) setShowScanner(false); }}>
      {openProp === undefined && (
        <DialogTrigger asChild>
          {trigger || (
            <Button
              variant={existingEquipment ? "outline" : "default"}
              size="sm"
              className="font-mono text-xs uppercase tracking-wider rounded-none"
            >
              {existingEquipment ? "Edit Details" : "Add Equipment"}
            </Button>
          )}
        </DialogTrigger>
      )}

      <DialogContent className="sm:max-w-[520px] border-primary/20 rounded-none bg-card max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-mono text-primary uppercase tracking-wider">
            {existingEquipment ? "Edit Equipment" : tileUuid ? "Link Equipment" : "Add Equipment"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-0">
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="w-full rounded-none bg-muted/50 mb-4 h-9">
                <TabsTrigger value="details" className="flex-1 font-mono text-xs uppercase rounded-none">Details</TabsTrigger>
                <TabsTrigger value="service" className="flex-1 font-mono text-xs uppercase rounded-none">Service</TabsTrigger>
                <TabsTrigger value="qr" className="flex-1 font-mono text-xs uppercase rounded-none">Tags</TabsTrigger>
              </TabsList>

              {/* ── Details tab ── */}
              <TabsContent value="details" className="space-y-4 mt-0">
                <FormField
                  control={form.control}
                  name="label"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-xs uppercase">Equipment Label *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Primary Drone" className="font-mono text-sm bg-background rounded-none border-border" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-xs uppercase">Category *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="font-mono text-sm bg-background rounded-none border-border">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-none font-mono">
                          {EQUIPMENT_CATEGORIES.map(cat => (
                            <SelectItem key={cat} value={cat} className="font-mono text-sm">{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="serialNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-xs uppercase">Serial Number</FormLabel>
                      <FormControl>
                        <Input placeholder="SN-12345" className="font-mono text-sm bg-background rounded-none border-border" {...field} value={field.value || ""} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-xs uppercase">Description</FormLabel>
                      <FormControl>
                        <Input placeholder="Brief description" className="font-mono text-sm bg-background rounded-none border-border" {...field} value={field.value || ""} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-xs uppercase">Field Notes</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Maintenance logs, condition, certifications, etc." className="font-mono text-sm bg-background min-h-[80px] rounded-none border-border" {...field} value={field.value || ""} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </TabsContent>

              {/* ── Service dates tab ── */}
              <TabsContent value="service" className="space-y-4 mt-0">
                <p className="font-mono text-xs text-muted-foreground border-l-2 border-primary/40 pl-3">
                  Track when this equipment entered and left active service. Required for rope access equipment with retirement dates.
                </p>

                <FormField
                  control={form.control}
                  name="inServiceDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-xs uppercase">In-Service Date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          className="font-mono text-sm bg-background rounded-none border-border"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="outOfServiceDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-xs uppercase">Out-of-Service Date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          className="font-mono text-sm bg-background rounded-none border-border"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <p className="font-mono text-xs text-muted-foreground mt-1">
                        Set this date when equipment is retired, damaged, or decommissioned.
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              {/* ── Tags tab (QR / barcode / RFID) ── */}
              <TabsContent value="qr" className="space-y-4 mt-0">
                <p className="font-mono text-xs text-muted-foreground border-l-2 border-primary/40 pl-3">
                  Attach any combination of tags to this equipment: a custom QR/barcode, an RFID/NFC tag, or both. The FieldTrack QR code is always auto-generated separately.
                </p>

                {showScanner ? (
                  <QrScannerCamera
                    onDetected={handleQrDetected}
                    onClose={() => setShowScanner(false)}
                  />
                ) : (
                  <div className="space-y-3">
                    <FormField
                      control={form.control}
                      name="customQrCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-mono text-xs uppercase">Custom QR / Barcode Value</FormLabel>
                          <div className="flex gap-2">
                            <FormControl>
                              <Input
                                placeholder="Scan or type asset tag value"
                                className="font-mono text-sm bg-background rounded-none border-border"
                                {...field}
                                value={field.value || ""}
                              />
                            </FormControl>
                            {field.value && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="rounded-none flex-shrink-0"
                                onClick={() => form.setValue("customQrCode", "")}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowScanner(true)}
                      className="w-full font-mono text-xs uppercase tracking-wider rounded-none gap-2 border-primary/30 hover:text-primary"
                      data-testid="button-open-qr-scanner"
                    >
                      <Camera className="h-4 w-4" /> Scan QR / Barcode with Camera
                    </Button>

                    {form.watch("customQrCode") && (
                      <div className="flex items-start gap-2 p-3 border border-green-500/30 bg-green-500/5">
                        <QrCode className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <p className="font-mono text-xs text-green-400 break-all">
                          {form.watch("customQrCode")}
                        </p>
                      </div>
                    )}

                    {/* ── RFID / NFC tag ── */}
                    <div className="border-t border-border pt-4 space-y-3">
                      <FormField
                        control={form.control}
                        name="rfidTag"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-mono text-xs uppercase">RFID / NFC Tag ID</FormLabel>
                            <div className="flex gap-2">
                              <FormControl>
                                <Input
                                  placeholder="Scan tag or type its ID (e.g. 04:A3:1F:2A:B9:5C:80)"
                                  className="font-mono text-sm bg-background rounded-none border-border"
                                  {...field}
                                  value={field.value || ""}
                                />
                              </FormControl>
                              {field.value && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="rounded-none flex-shrink-0"
                                  onClick={() => form.setValue("rfidTag", "")}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <NfcScanButton
                        onDetected={(tagId) => {
                          form.setValue("rfidTag", tagId);
                          toast({ title: "RFID/NFC tag detected", description: tagId });
                        }}
                      />

                      {form.watch("rfidTag") && (
                        <div className="flex items-start gap-2 p-3 border border-green-500/30 bg-green-500/5">
                          <Nfc className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <p className="font-mono text-xs text-green-400 break-all">
                            {form.watch("rfidTag")}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            <div className="flex justify-between pt-5 border-t border-border mt-4">
              {existingEquipment ? (
                <Button type="button" variant="destructive" size="icon" onClick={handleDelete} disabled={deleteMutation.isPending} className="rounded-none">
                  <Trash2 className="h-4 w-4" />
                </Button>
              ) : <div />}
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="font-mono uppercase tracking-wider rounded-none"
              >
                {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save Record"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
