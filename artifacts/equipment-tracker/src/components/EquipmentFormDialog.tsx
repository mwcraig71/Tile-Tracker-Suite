import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Equipment, EquipmentInput } from "@workspace/api-client-react/src/generated/api.schemas";
import { useCreateEquipment, useUpdateEquipment, useDeleteEquipment } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Trash2 } from "lucide-react";

const EQUIPMENT_CATEGORIES = ["Drone", "UT Machine", "D-Meter", "Laser Measurer", "Boat", "Other"] as const;

const formSchema = z.object({
  label: z.string().min(1, "Label is required"),
  category: z.enum(EQUIPMENT_CATEGORIES),
  description: z.string().optional(),
  serialNumber: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface EquipmentFormDialogProps {
  tileUuid: string;
  existingEquipment?: Equipment | null;
  trigger?: React.ReactNode;
}

export function EquipmentFormDialog({ tileUuid, existingEquipment, trigger }: EquipmentFormDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const createMutation = useCreateEquipment();
  const updateMutation = useUpdateEquipment();
  const deleteMutation = useDeleteEquipment();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      label: existingEquipment?.label || "",
      category: (existingEquipment?.category as any) || "Other",
      description: existingEquipment?.description || "",
      serialNumber: existingEquipment?.serialNumber || "",
      notes: existingEquipment?.notes || "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      if (existingEquipment) {
        await updateMutation.mutateAsync({
          id: existingEquipment.id,
          data: values,
        });
        toast({ title: "Equipment updated", description: "The equipment record has been updated." });
      } else {
        await createMutation.mutateAsync({
          data: {
            tileUuid,
            ...values,
          },
        });
        toast({ title: "Equipment created", description: "New equipment record linked to Tile." });
      }
      queryClient.invalidateQueries();
      setOpen(false);
    } catch (error) {
      toast({ title: "Error", description: "Failed to save equipment. Please try again.", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!existingEquipment) return;
    if (confirm("Are you sure you want to delete this equipment record? The Tile will remain but lose its metadata.")) {
      try {
        await deleteMutation.mutateAsync({ id: existingEquipment.id });
        toast({ title: "Equipment deleted", description: "The record has been removed." });
        queryClient.invalidateQueries();
        setOpen(false);
      } catch (error) {
        toast({ title: "Error", description: "Failed to delete equipment.", variant: "destructive" });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button variant={existingEquipment ? "outline" : "default"} size="sm" className="font-mono text-xs uppercase tracking-wider rounded-none">{existingEquipment ? "Edit Details" : "Add Equipment"}</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] border-primary/20 rounded-none bg-card">
        <DialogHeader>
          <DialogTitle className="font-mono text-primary uppercase tracking-wider">
            {existingEquipment ? "Edit Equipment" : "Link Equipment"}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-mono text-xs uppercase">Equipment Label</FormLabel>
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
                  <FormLabel className="font-mono text-xs uppercase">Category</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="font-mono text-sm bg-background rounded-none border-border">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="rounded-none font-mono">
                      {EQUIPMENT_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat} className="font-mono text-sm">
                          {cat}
                        </SelectItem>
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
                  <FormLabel className="font-mono text-xs uppercase">Serial Number (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="SN-12345" className="font-mono text-sm bg-background rounded-none border-border" {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-mono text-xs uppercase">Description (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Brief description" className="font-mono text-sm bg-background rounded-none border-border" {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-mono text-xs uppercase">Field Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Maintenance logs, condition, etc." className="font-mono text-sm bg-background min-h-[80px] rounded-none border-border" {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-between pt-4">
              {existingEquipment ? (
                <Button type="button" variant="destructive" size="icon" onClick={handleDelete} disabled={deleteMutation.isPending} className="rounded-none">
                  <Trash2 className="h-4 w-4" />
                </Button>
              ) : <div></div>}
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="font-mono uppercase tracking-wider rounded-none">
                {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save Record"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
