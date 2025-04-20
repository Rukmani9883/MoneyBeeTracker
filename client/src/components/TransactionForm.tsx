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
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { apiRequest } from "@/lib/queryClient";
import { Income, Expense } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { format, parse } from "date-fns";

interface TransactionFormProps {
  userId: number;
  type?: "income" | "expense" | "transfer";
  existingTransaction?: Income | Expense | null;
  onSuccess?: () => void;
}

const formSchema = z.object({
  userId: z.number(),
  name: z.string().min(1, "Name is required"),
  amount: z.string().min(1, "Amount is required")
    .refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, "Amount must be a positive number"),
  category: z.string().min(1, "Category is required"),
  date: z.string().min(1, "Date is required"),
  transactionType: z.enum(["income", "expense", "transfer"]),
  recurring: z.boolean().default(false),
  frequency: z.string().nullable().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const categories = {
  income: [
    "Salary",
    "Freelance",
    "Investment",
    "Rental Income",
    "Bonus",
    "Gifts",
    "Refunds",
    "Other",
  ],
  expense: [
    "Food",
    "Housing",
    "Transportation",
    "Shopping",
    "Entertainment",
    "Health",
    "Education",
    "Bills",
    "Utilities",
    "Travel",
    "Dining",
    "Other",
  ],
  transfer: [
    "Savings", 
    "Investment", 
    "Debt Repayment", 
    "Account Transfer", 
    "Other"
  ]
};

const frequencies = [
  "Daily",
  "Weekly",
  "Bi-weekly",
  "Monthly",
  "Quarterly",
  "Yearly",
];

const TransactionForm = ({ 
  userId, 
  type = "expense", 
  existingTransaction, 
  onSuccess 
}: TransactionFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      userId: userId,
      name: "",
      amount: "",
      category: "",
      date: format(new Date(), "yyyy-MM-dd"),
      transactionType: type,
      recurring: false,
      frequency: null,
      notes: "",
    },
  });

  // Set form values when editing an existing transaction
  useEffect(() => {
    if (existingTransaction) {
      form.reset({
        userId: userId,
        name: existingTransaction.name,
        amount: existingTransaction.amount.toString(),
        category: existingTransaction.category,
        date: format(new Date(existingTransaction.date), "yyyy-MM-dd"),
        transactionType: type,
        recurring: existingTransaction.recurring || false,
        frequency: existingTransaction.frequency || null,
        notes: existingTransaction.notes || "",
      });
    }
  }, [existingTransaction, userId, type, form]);

  // Handle form submission
  const onSubmit = async (values: FormValues) => {
    try {
      setIsSubmitting(true);
      
      const transactionData = {
        userId: values.userId,
        name: values.name,
        amount: parseFloat(values.amount),
        category: values.category,
        date: new Date(values.date),
        recurring: values.recurring,
        frequency: values.recurring ? values.frequency : null,
        notes: values.notes,
      };
      
      // Determine which API endpoint to use based on transaction type
      const endpoint = values.transactionType === "income" ? "/api/incomes" : "/api/expenses";
      
      if (existingTransaction) {
        // Update existing transaction
        await apiRequest("PUT", `${endpoint}/${existingTransaction.id}`, transactionData);
        toast({
          title: "Success",
          description: `${values.transactionType === "income" ? "Income" : "Expense"} updated successfully.`,
          variant: "default",
        });
      } else {
        // Create new transaction
        await apiRequest("POST", endpoint, transactionData);
        toast({
          title: "Success",
          description: `${values.transactionType === "income" ? "Income" : "Expense"} added successfully.`,
          variant: "default",
        });
      }
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to ${existingTransaction ? "update" : "create"} ${values.transactionType === "income" ? "income" : "expense"}: ${error.message || "Unknown error"}`,
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
          name="transactionType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Transaction Type</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex w-full rounded-lg overflow-hidden mb-1"
                >
                  <div className="flex w-full">
                    <FormItem className="flex-1 flex items-center space-x-1 space-y-0">
                      <FormControl>
                        <RadioGroupItem
                          value="expense"
                          id="expense"
                          className="peer sr-only"
                        />
                      </FormControl>
                      <FormLabel
                        htmlFor="expense"
                        className="flex-1 bg-[#2D2D2D] peer-data-[state=checked]:bg-[#F44336] text-[#CCCCCC] peer-data-[state=checked]:text-white py-2 text-center cursor-pointer font-medium hover:bg-[#3D3D3D] transition-colors"
                      >
                        Expense
                      </FormLabel>
                    </FormItem>
                    <FormItem className="flex-1 flex items-center space-x-1 space-y-0">
                      <FormControl>
                        <RadioGroupItem
                          value="income"
                          id="income"
                          className="peer sr-only"
                        />
                      </FormControl>
                      <FormLabel
                        htmlFor="income"
                        className="flex-1 bg-[#2D2D2D] peer-data-[state=checked]:bg-[#4CAF50] text-[#CCCCCC] peer-data-[state=checked]:text-white py-2 text-center cursor-pointer font-medium hover:bg-[#3D3D3D] transition-colors"
                      >
                        Income
                      </FormLabel>
                    </FormItem>
                    <FormItem className="flex-1 flex items-center space-x-1 space-y-0">
                      <FormControl>
                        <RadioGroupItem
                          value="transfer"
                          id="transfer"
                          className="peer sr-only"
                        />
                      </FormControl>
                      <FormLabel
                        htmlFor="transfer"
                        className="flex-1 bg-[#2D2D2D] peer-data-[state=checked]:bg-[#2196F3] text-[#CCCCCC] peer-data-[state=checked]:text-white py-2 text-center cursor-pointer font-medium hover:bg-[#3D3D3D] transition-colors"
                      >
                        Transfer
                      </FormLabel>
                    </FormItem>
                  </div>
                </RadioGroup>
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

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Input 
                  placeholder="What was this for?" 
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
                  {categories[form.watch("transactionType")].map((category) => (
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

        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date</FormLabel>
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
          name="recurring"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border border-[#444] p-3 shadow-sm">
              <div className="space-y-0.5">
                <FormLabel>Recurring {form.watch("transactionType")}</FormLabel>
                <div className="text-[#999999] text-xs">
                  This {form.watch("transactionType")} happens regularly
                </div>
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

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Add any additional details" 
                  className="bg-[#2D2D2D] border-[#444] text-white resize-none"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2 pt-2">
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
            {existingTransaction ? "Update" : "Add"} {form.watch("transactionType")}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default TransactionForm;
