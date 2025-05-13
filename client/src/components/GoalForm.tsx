import { useState } from "react";
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
import { apiRequest } from "@/lib/queryClient";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { DialogFooter } from "@/components/ui/dialog";
import { addMonths, format } from "date-fns";
import { notifyFinancialDataChanged } from "@/lib/eventUtils";

interface GoalFormProps {
  userId: number;
  onClose: () => void;
  onSuccess?: () => void;
}

const formSchema = z.object({
  userId: z.number(),
  name: z.string().min(1, "Goal name is required"),
  targetAmount: z.string().min(1, "Target amount is required")
    .refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, "Amount must be a positive number"),
  currentAmount: z.string()
    .refine(val => val === "" || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0), "Current amount must be a positive number")
    .optional(),
  deadline: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const GoalForm = ({ userId, onClose, onSuccess }: GoalFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      userId: userId,
      name: "",
      targetAmount: "",
      currentAmount: "0",
      deadline: format(addMonths(new Date(), 6), "yyyy-MM-dd"), // Default to 6 months from now
      notes: "",
    },
  });

  const queryClient = useQueryClient();
  
  // Handle form submission
  const onSubmit = async (values: FormValues) => {
    try {
      setIsSubmitting(true);
      
      console.log("Submitting form with values:", values);
      
      const goalData = {
        userId: values.userId,
        name: values.name,
        targetAmount: parseFloat(values.targetAmount),
        currentAmount: values.currentAmount ? parseFloat(values.currentAmount) : 0,
        deadline: values.deadline || undefined,
        notes: values.notes || "",
      };
      
      console.log("Formatted goal data for API:", goalData);
      
      // Make sure we have the correct userId
      console.log("Using userId:", goalData.userId);
      
      const response = await apiRequest("POST", "/api/vault-goals", goalData);
      console.log("API response:", response);
      
      // Notify all components that financial data has changed
      notifyFinancialDataChanged();
      
      toast({
        title: "Goal Created",
        description: "Your savings goal has been created successfully.",
        variant: "default",
      });
      
      // Force refresh queries
      queryClient.invalidateQueries({ queryKey: ['/api/vault-goals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/summary'] });
      
      if (onSuccess) {
        onSuccess();
      } else {
        onClose();
      }
    } catch (error: any) {
      console.error("Error creating goal:", error);
      toast({
        title: "Error",
        description: `Failed to create goal: ${error.message || "Unknown error"}`,
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
              <FormLabel>Goal Name</FormLabel>
              <FormControl>
                <Input 
                  placeholder="e.g. Emergency Fund, New Car, Vacation" 
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
          name="targetAmount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Target Amount</FormLabel>
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
          name="currentAmount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Current Amount (Optional)</FormLabel>
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
          name="deadline"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Target Date (Optional)</FormLabel>
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
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Why is this goal important to you?" 
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
            onClick={onClose}
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
            Create Goal
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};

export default GoalForm;
