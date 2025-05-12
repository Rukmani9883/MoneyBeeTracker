import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useState } from "react";
import TransactionForm from "./TransactionForm";

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number;
}

const AddTransactionModal = ({ isOpen, onClose, userId }: AddTransactionModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#1E1E1E] border-[#2D2D2D] text-white max-w-md p-0 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-xl font-semibold text-white">Add Transaction</DialogTitle>
          <DialogDescription className="text-[#CCCCCC]">
            Record a new transaction to track your finances.
          </DialogDescription>
        </DialogHeader>
        
        <div className="p-6 pt-2">
          <TransactionForm userId={userId} onSuccess={onClose} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddTransactionModal;
