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
import { apiRequest } from "@/lib/queryClient";
import { Debt } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { DialogFooter } from "@/components/ui/dialog";
import { addMonths, format } from "date-fns";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { notifyFinancialDataChanged } from "@/lib/eventUtils";
import { useQueryClient } from "@tanstack/react-query";

interface DebtFormProps {
  userId: number;
  debt?: Debt | null;
  debtType?: "owned" | "owed";
  onSuccess?: () => void;
}

const formSchema = z.object({
  userId: z.number(),
  name: z.string().min(1, "Name is required"),
  isOwedByUser: z.boolean(),
  totalAmount: z.string().min(1, "Total amount is required")
    .refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, "Amount must be a positive number"),
  remainingAmount: z.string().min(1, "Remaining amount is required")
    .refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, "Amount must be a positive number"),
  interestRate: z.string()
    .refine(val => val === "" || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0), "Interest rate must be a positive number")
    .optional(),
  dueDate: z.string().optional(),
  monthlyPayment: z.string()
    .refine(val => val === "" || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0), "Monthly payment must be a positive number")
    .optional(),
  category: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const debtCategories = [
  "Personal Loan",
  "Auto Loan",
  "Mortgage",
  "Credit Card",
  "Student Loan",
  "Medical Debt",
  "Tax Debt",
  "Business Loan",
  "Family Loan",
  "Friend Loan",
  "Other",
];

const DebtForm = ({ 
  userId, 
  debt, 
  debtType = "owned",
  onSuccess 
}: DebtFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      userId: userId,
      name: "",
      isOwedByUser: debtType === "owned",
      totalAmount: "",
      remainingAmount: "",
      interestRate: "",
      dueDate: format(addMonths(new Date(), 6), "yyyy-MM-dd"),
      monthlyPayment: "",
      category: "",
      notes: "",
    },
  });

  // Set form values when editing an existing debt
  useEffect(() => {
    if (debt) {
      form.reset({
        userId: userId,
        name: debt.name,
        isOwedByUser: debt.isOwedByUser === null ? false : debt.isOwedByUser,
        totalAmount: debt.totalAmount.toString(),
        remainingAmount: debt.remainingAmount.toString(),
        interestRate: debt.interestRate?.toString() || "",
        dueDate: debt.dueDate ? format(new Date(debt.dueDate), "yyyy-MM-dd") : undefined,
        monthlyPayment: debt.monthlyPayment?.toString() || "",
        category: debt.category || "",
        notes: debt.notes || "",
      });
    } else {
      form.setValue("isOwedByUser", debtType === "owned");
    }
  }, [debt, userId, debtType, form]);

  // Handle form submission
  const onSubmit = async (values: FormValues) => {
    try {
      setIsSubmitting(true);
      
      const debtData = {
        userId: values.userId,
        name: values.name,
        isOwedByUser: values.isOwedByUser,
        totalAmount: parseFloat(values.totalAmount),
        remainingAmount: parseFloat(values.remainingAmount),
        interestRate: values.interestRate ? parseFloat(values.interestRate) : undefined,
        dueDate: values.dueDate ? new Date(values.dueDate) : undefined,
        monthlyPayment: values.monthlyPayment ? parseFloat(values.monthlyPayment) : undefined,
        category: values.category || undefined,
        notes: values.notes || undefined,
      };
      
      if (debt) {
        // Update existing debt
        await apiRequest(
          "PUT",
          `/api/debts/${debt.id}`, 
          debtData
        );
        toast({
          title: "Success",
          description: "Debt updated successfully.",
          variant: "default",
        });
      } else {
        // Create new debt
        await apiRequest(
          "POST",
          "/api/debts", 
          debtData
        );
        toast({
          title: "Success",
          description: "Debt added successfully.",
          variant: "default",
        });
      }
      
      // Invalidate queries to refresh data immediately
      queryClient.invalidateQueries({ queryKey: ['/api/debts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/debts/owed-by-user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/debts/owed-to-user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/summary'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions/monthly'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions/recent'] });
      
      // Notify all components that financial data has changed
      notifyFinancialDataChanged();
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${debt ? "update" : "create"} debt: ${error.message}`,
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
          name="isOwedByUser"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Debt Type</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={(value) => field.onChange(value === "true")}
                  defaultValue={field.value ? "true" : "false"}
                  className="flex w-full space-x-1"
                >
                  <FormItem className="flex-1 flex items-center space-x-1 space-y-0">
                    <FormControl>
                      <RadioGroupItem
                        value="true"
                        id="owed-by-me"
                        className="peer sr-only"
                      />
                    </FormControl>
                    <FormLabel
                      htmlFor="owed-by-me"
                      className="flex-1 bg-[#2D2D2D] peer-data-[state=checked]:bg-[#F44336] text-[#CCCCCC] peer-data-[state=checked]:text-white py-2 text-center cursor-pointer font-medium hover:bg-[#3D3D3D] transition-colors rounded-l-md"
                    >
                      I Owe This
                    </FormLabel>
                  </FormItem>
                  <FormItem className="flex-1 flex items-center space-x-1 space-y-0">
                    <FormControl>
                      <RadioGroupItem
                        value="false"
                        id="owed-to-me"
                        className="peer sr-only"
                      />
                    </FormControl>
                    <FormLabel
                      htmlFor="owed-to-me"
                      className="flex-1 bg-[#2D2D2D] peer-data-[state=checked]:bg-[#4CAF50] text-[#CCCCCC] peer-data-[state=checked]:text-white py-2 text-center cursor-pointer font-medium hover:bg-[#3D3D3D] transition-colors rounded-r-md"
                    >
                      Owed To Me
                    </FormLabel>
                  </FormItem>
                </RadioGroup>
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
              <FormLabel>
                {form.watch("isOwedByUser") ? "Lender/Institution Name" : "Borrower Name"}
              </FormLabel>
              <FormControl>
                <Input 
                  placeholder={form.watch("isOwedByUser") ? "e.g. Bank, Credit Card, Friend" : "e.g. John, Company"} 
                  className="bg-[#2D2D2D] border-[#444] text-white"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="totalAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Total Amount</FormLabel>
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
            name="remainingAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Remaining Amount</FormLabel>
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
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="interestRate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Interest Rate (Optional)</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      placeholder="0.00"
                      type="number"
                      step="0.01"
                      min="0"
                      className="bg-[#2D2D2D] border-[#444] text-white pr-8"
                      {...field}
                    />
                    <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-white text-lg">%</span>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="monthlyPayment"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Monthly Payment (Optional)</FormLabel>
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
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="dueDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Due Date (Optional)</FormLabel>
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
                <FormLabel>Category (Optional)</FormLabel>
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
                    {debtCategories.map((category) => (
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
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Add any additional details about this debt" 
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
            {debt ? "Update" : "Add"} Debt
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};

export default DebtForm;
