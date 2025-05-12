import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Trash2Icon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { notifyFinancialDataChanged } from "@/lib/eventUtils";

export const ResetDataButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const resetMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/reset-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to reset data');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate all queries to refetch data
      queryClient.invalidateQueries();
      
      // Show success toast
      toast({
        title: "Data Reset Successfully",
        description: "All your financial data has been reset.",
        variant: "default",
      });
      
      // Notify all components that financial data has changed
      notifyFinancialDataChanged();
      
      // Close the dialog
      setIsOpen(false);
    },
    onError: (error) => {
      console.error('Error resetting data:', error);
      
      // Show error toast
      toast({
        title: "Reset Failed",
        description: "There was a problem resetting your data. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  const handleReset = () => {
    resetMutation.mutate();
  };
  
  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button 
          variant="destructive" 
          size="sm"
          className="flex items-center gap-2"
        >
          <Trash2Icon size={16} />
          Reset All Data
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="bg-gray-800 border-gray-700">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white">Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription className="text-gray-300">
            This action will permanently delete all your financial data, including income, expenses, savings, bills, debts and vault goals. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="border-gray-700 bg-gray-800 text-white hover:bg-gray-700">Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleReset}
            disabled={resetMutation.isPending}
            className="bg-red-600 hover:bg-red-700 text-white border-none"
          >
            {resetMutation.isPending ? "Resetting..." : "Reset All Data"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};