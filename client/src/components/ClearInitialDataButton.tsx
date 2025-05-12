import { useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
         AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, 
         AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { notifyFinancialDataChanged } from "@/lib/eventUtils";

export const ClearInitialDataButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const clearMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/reset-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to clear initial data');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate all queries to refetch data
      queryClient.invalidateQueries();
      
      // Show success toast
      toast({
        title: "Data Cleared Successfully",
        description: "All initial data has been cleared. You can now start fresh.",
        variant: "default",
      });
      
      // Notify all components that financial data has changed
      notifyFinancialDataChanged();
      
      // Close the dialog
      setIsOpen(false);
    },
    onError: (error) => {
      console.error('Error clearing data:', error);
      
      // Show error toast
      toast({
        title: "Clear Failed",
        description: "There was a problem clearing the initial data. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  const handleClear = () => {
    clearMutation.mutate();
  };
  
  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button 
          variant="outline"
          className="bg-[#2D2D2D] hover:bg-[#3D3D3D] border-amber-500 text-amber-500 hover:text-amber-400"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Clear Initial Data
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="bg-[#1A1A1A] border-gray-700">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white">Clear All Initial Data?</AlertDialogTitle>
          <AlertDialogDescription>
            This will remove all initial sample data from your account. You'll start with a clean slate.
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            className="bg-[#2D2D2D] hover:bg-[#3D3D3D] text-gray-300 border-gray-700"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleClear}
            disabled={clearMutation.isPending}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {clearMutation.isPending ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Clearing...
              </>
            ) : (
              "Clear All Data"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
