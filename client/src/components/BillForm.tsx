import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { apiRequest } from "@/lib/queryClient";
import { Bill } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { DialogFooter } from "@/components/ui/dialog";
import { addDays, format } from "date-fns";
import { notifyFinancialDataChanged } from "@/lib/eventUtils";

interface BillFormProps {
  userId: number;
  bill?: Bill | null;
  onSuccess?: () => void;
}

const formSchema = z.object({
  userId: z.number(),
  name: z.string().min(1, "Bill name is required"),
  amount: z.string().min(1, "Amount is required")
    .refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, "Amount must be a positive number"),
  dueDate: z.string().min(1, "Due date is required"),
  category: z.string().min(1, "Category is required"),
  recurring: z.boolean().default(true),
  frequency: z.string().nullable().optional(),
  isPaid: z.boolean().default(false),
  reminderDays: z.string()
    .refine(val => val === "" || (!isNaN(parseInt(val)) && parseInt(val) >= 0), "Reminder days must be a positive number")
    .optional(),
  autoPayment: z.boolean().default(false),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const categories = [
  "Utilities",
  "Housing",
  "Transportation",
  "Insurance",
  "Subscriptions",
  "Entertainment",
  "Loans",
  "Credit Card",
  "Healthcare",
  "Education",
  "Finance",
  "Other",
];

const frequencies = [
  "Daily",
  "Weekly",
  "Bi-weekly",
  "Monthly",
  "Quarterly",
  "Yearly",
];

const BillForm = ({ 
  userId, 
  bill, 
  onSuccess 
}: BillFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      userId: userId,
      name: "",
      amount: "",
      dueDate: format(addDays(new Date(), 5), "yyyy-MM-dd"),
      category: "",
      recurring: true,
      frequency: "monthly",
      isPaid: false,
      reminderDays: "3",
      autoPayment: false,
      notes: "",
    },
  });

  // Set form values when editing an existing bill
  useEffect(() => {
    if (bill) {
      form.reset({
        userId: userId,
        name: bill.name,
        amount: bill.amount.toString(),
        dueDate: format(new Date(bill.dueDate), "yyyy-MM-dd"),
        category: bill.category,
        recurring: bill.recurring,
        frequency: bill.frequency || "monthly",
        isPaid: bill.isPaid,
        reminderDays: bill.reminderDays.toString(),
        autoPayment: bill.autoPayment,
        notes: bill.notes || "",
      });
    }
  }, [bill, userId, form]);

  // Handle form submission
  const onSubmit = async (values: FormValues) => {
    try {
      setIsSubmitting(true);
      
      const billData = {
        userId: values.userId,
        name: values.name,
        amount: parseFloat(values.amount),
        dueDate: new Date(values.dueDate),
        category: values.category,
        recurring: values.recurring,
        frequency: values.recurring ? values.frequency : null,
        isPaid: values.isPaid,
        reminderDays: values.reminderDays ? parseInt(values.reminderDays) : 3,
        autoPayment: values.autoPayment,
        notes: values.notes,
      };
      
      if (bill) {
        // Update existing bill
        await apiRequest(
          "PUT",
          `/api/bills/${bill.id}`,
          billData
        );
        toast({
          title: "Success",
          description: "Bill updated successfully.",
          variant: "default",
        });
      } else {
        // Create new bill
        await apiRequest(
          "POST",
          "/api/bills",
          billData
        );
        toast({
          title: "Success",
          description: "Bill added successfully.",
          variant: "default",
        });
      }
      
      // Notify all components that financial data has changed
      notifyFinancialDataChanged();
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${bill ? "update" : "create"} bill: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bill Name</FormLabel>
              <FormControl>
                <Input 
                  placeholder="e.g. Electricity Bill, Netflix Subscription" 
                  className="bg-[#2D2D2D] border-[#444] text-white"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount</FormLabel>
              <FormControl>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-white text-lg">₹</span>
                  <Input
                    placeholder="0.00"
                    type="number"
                    step="0.01"
                    min="0"
                    className="bg-[#2D2D2D] border-[#444] text-white pl-8"
                    {...field}
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="dueDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Due Date</FormLabel>
                <FormControl>
                  <Input 
                    type="date" 
                    className="bg-[#2D2D2D] border-[#444] text-white"
                    {...field} 
                  />
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
                <FormLabel>Category</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger className="bg-[#2D2D2D] border-[#444] text-white">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-[#2D2D2D] border-[#444] text-white">
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="recurring"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border border-[#444] p-3 shadow-sm">
              <div className="space-y-0.5">
                <FormLabel>Recurring Bill</FormLabel>
                <FormDescription className="text-[#999999] text-xs">
                  This bill repeats on a regular schedule
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {form.watch("recurring") && (
          <FormField
            control={form.control}
            name="frequency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Frequency</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value || undefined}
                  value={field.value || undefined}
                >
                  <FormControl>
                    <SelectTrigger className="bg-[#2D2D2D] border-[#444] text-white">
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-[#2D2D2D] border-[#444] text-white">
                    {frequencies.map((frequency) => (
                      <SelectItem key={frequency} value={frequency.toLowerCase()}>
                        {frequency}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="reminderDays"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Remind Me (Days Before)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    min="0"
                    className="bg-[#2D2D2D] border-[#444] text-white"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="autoPayment"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border border-[#444] p-3 shadow-sm">
                <div className="space-y-0.5">
                  <FormLabel>Auto Payment</FormLabel>
                  <FormDescription className="text-[#999999] text-xs">
                    Bill is paid automatically
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="isPaid"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border border-[#444] p-3 shadow-sm">
              <div className="space-y-0.5">
                <FormLabel>Already Paid</FormLabel>
                <FormDescription className="text-[#999999] text-xs">
                  Mark this bill as already paid
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Add any additional details about this bill" 
                  className="bg-[#2D2D2D] border-[#444] text-white resize-none"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <DialogFooter>
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => onSuccess && onSuccess()}
            className="bg-transparent border-[#444] text-[#CCCCCC] hover:bg-[#2D2D2D] hover:text-white"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            className="bg-[#FFD700] text-[#121212] hover:bg-[#E6C200]"
            disabled={isSubmitting}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {bill ? "Update" : "Add"} Bill
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};

export default BillForm;
