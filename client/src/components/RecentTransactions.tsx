import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Transaction } from "@shared/schema";
import { format } from "date-fns";
import { getCategoryIcon } from "./CategoryIcons";
import { useEffect, useCallback } from "react";
import { notifyFinancialDataChanged } from "@/lib/eventUtils";

interface RecentTransactionsProps {
  userId: number;
  limit?: number;
  month?: number;
  year?: number;
  autoRefresh?: boolean;
}

const RecentTransactions = ({ 
  userId, 
  limit = 4, 
  month, 
  year,
  autoRefresh = true 
}: RecentTransactionsProps) => {
  const queryClient = useQueryClient();
  
  // Get current month and year if not provided
  const currentDate = new Date();
  const selectedMonth = month !== undefined ? month : currentDate.getMonth();
  const selectedYear = year !== undefined ? year : currentDate.getFullYear();
  
  // For API call we need to add 1 to month because JS months are 0-based
  const apiMonth = selectedMonth + 1;
  
  // Query key for the transactions
  const transactionsQueryKey = ['/api/transactions/monthly', { userId, month: apiMonth, year: selectedYear }];
  
  // Define the refresh function to be reused
  const refreshTransactions = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: transactionsQueryKey });
  }, [queryClient, transactionsQueryKey]);
  
  // Set up auto-refresh at regular intervals if enabled
  useEffect(() => {
    if (!autoRefresh) return;
    
    // Refresh data every 30 seconds to catch any changes
    const intervalId = setInterval(() => {
      refreshTransactions();
    }, 30000);
    
    return () => clearInterval(intervalId);
  }, [autoRefresh, refreshTransactions]);
  
  // Set up financial data change listener
  useEffect(() => {
    // Function to handle the financial data changed event
    const handleFinancialDataChanged = () => {
      console.log('Financial data changed, refreshing transactions');
      refreshTransactions();
    };
    
    // Add event listener
    window.addEventListener('financial-data-changed', handleFinancialDataChanged);
    
    // Clean up event listener
    return () => {
      window.removeEventListener('financial-data-changed', handleFinancialDataChanged);
    };
  }, [refreshTransactions]);
  
  const { data: transactions, isLoading } = useQuery<Transaction[]>({
    queryKey: transactionsQueryKey,
    queryFn: async () => {
      const res = await fetch(`/api/transactions/monthly?userId=${userId}&month=${apiMonth}&year=${selectedYear}&limit=${limit}`);
      if (!res.ok) throw new Error('Failed to fetch transactions');
      return res.json();
    },
    staleTime: 10000, // Consider data fresh for 10 seconds
  });

  // Get appropriate payment method text based on transaction type and category
  const getTransactionPaymentMethod = (transaction: Transaction) => {
    if (transaction.type === 'income') {
      return 'Direct Deposit';
    } else if (transaction.type === 'expense') {
      if (transaction.category === 'bill') {
        return 'Bill Payment';
      } else if (transaction.category === 'debt payment') {
        return 'EMI Payment';
      } else {
        return 'Debit Card';
      }
    } else {
      return 'Transfer';
    }
  };
  
  // Display skeleton loading state
  if (isLoading) {
    return (
      <div className="bg-[#1E1E1E] rounded-xl p-5 shadow-lg animate-pulse">
        <div className="h-6 bg-[#2D2D2D] rounded w-1/3 mb-6"></div>
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex items-center justify-between py-3 border-b border-[#2D2D2D]">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-[#2D2D2D] mr-3"></div>
              <div>
                <div className="h-4 bg-[#2D2D2D] rounded w-24 mb-2"></div>
                <div className="h-3 bg-[#2D2D2D] rounded w-16"></div>
              </div>
            </div>
            <div className="text-right">
              <div className="h-4 bg-[#2D2D2D] rounded w-16 mb-2"></div>
              <div className="h-3 bg-[#2D2D2D] rounded w-12"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Prepare transactions for display by removing duplicates and sorting
  const displayTransactions = transactions
    ? [...transactions]
        // Filter out duplicate transactions by source
        .filter((transaction, index, self) => {
          // Keep the first occurrence of each sourceId
          if (!transaction.sourceId) return true;
          return index === self.findIndex(t => 
            t.sourceId === transaction.sourceId && 
            t.type === transaction.type
          );
        })
        // Sort by date, newest first
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        // Apply the limit
        .slice(0, limit)
    : [];

  return (
    <div className="bg-[#1E1E1E] rounded-xl p-5 shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-semibold text-white">Recent Transactions</h3>
        {transactions && transactions.length > limit && (
          <button className="text-[#CCCCCC] hover:text-[#FFD700] text-sm transition-colors">
            View All
          </button>
        )}
      </div>
      
      {displayTransactions.length > 0 ? (
        displayTransactions.map((transaction, index) => {
          const isLastItem = index === displayTransactions.length - 1;
          const amountPrefix = transaction.type === 'income' ? '+' : '-';
          const amountColor = transaction.type === 'income' ? 'text-[#4CAF50]' : 'text-[#F44336]';
          
          const formattedAmount = new Intl.NumberFormat('en-IN', { 
            style: 'currency', 
            currency: 'INR' 
          }).format(transaction.amount);
          
          const formattedDate = format(new Date(transaction.date), "MMM d, yyyy");
          const paymentMethod = getTransactionPaymentMethod(transaction);
          
          // Use category to determine icon color
          const color = transaction.type === 'income' ? 'text-[#4CAF50]' : 'text-[#F44336]';
          
          return (
            <div 
              key={`${transaction.id}-${transaction.type}-${index}`} 
              className={`flex items-center justify-between py-3 ${isLastItem ? '' : 'border-b border-[#2D2D2D]'}`}
            >
              <div className="flex items-center">
                <div className="mr-3">
                  {getCategoryIcon(transaction.category, color)}
                </div>
                <div>
                  <p className="text-white text-sm font-medium">{transaction.description}</p>
                  <p className="text-[#999999] text-xs">{formattedDate} · {transaction.category}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`font-mono font-medium ${amountColor}`}>{amountPrefix}{formattedAmount}</p>
                <p className="text-xs text-[#999999]">{paymentMethod}</p>
              </div>
            </div>
          );
        })
      ) : (
        <div className="text-center py-8 text-[#CCCCCC]">
          <p>No recent transactions</p>
          <p className="text-sm text-[#999999] mt-1">Add transactions to see them here</p>
        </div>
      )}
    </div>
  );
};

export default RecentTransactions;
