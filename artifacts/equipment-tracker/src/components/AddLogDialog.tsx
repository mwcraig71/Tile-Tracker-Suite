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
import { Plus } from "lucide-react";
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

export function AddLogDialog({ equipmentId, category }: AddLogDialogProps) {
  const [open, setOpen] = useState(false);
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
      form.reset();
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
          className="font-mono text-xs uppercase tracking-wider rounded-none gap-2 border-primary/30 hover:text-primary"
        >
          <Plus className="h-3.5 w-3.5" /> Add Log Entry
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[460px] border-primary/20 rounded-none bg-card">
        <DialogHeader>
          <DialogTitle className="font-mono text-primary uppercase tracking-wider text-sm">
            Add Use Log
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="durationMinutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-xs uppercase">
                      {isDrone && selectedType === "flight" ? "Flight Time (min)" : isRopeAccess ? "Hours of Use (min)" : "Duration (min)"}
                    </FormLabel>
                    <FormControl>
                      <Input type="number" min="0" placeholder="0" className="font-mono text-sm bg-background rounded-none border-border" {...field} value={field.value || ""} />
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
                      <Input placeholder="Name" className="font-mono text-sm bg-background rounded-none border-border" {...field} value={field.value || ""} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-mono text-xs uppercase">Location / Site</FormLabel>
                  <FormControl>
                    <Input placeholder="Job site or location name" className="font-mono text-sm bg-background rounded-none border-border" {...field} value={field.value || ""} />
                  </FormControl>
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
                      placeholder={isDrone && selectedType === "flight" ? "Battery info, conditions, incidents..." : isRopeAccess ? "Load applied, rigging notes, condition after use..." : "Notes..."}
                      className="font-mono text-sm bg-background min-h-[64px] rounded-none border-border"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end pt-2">
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
