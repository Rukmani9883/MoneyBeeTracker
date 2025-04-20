import { useQuery } from "@tanstack/react-query";
import { Transaction } from "@shared/schema";
import { format } from "date-fns";

interface RecentTransactionsProps {
  userId: number;
  limit?: number;
}

const RecentTransactions = ({ userId, limit = 4 }: RecentTransactionsProps) => {
  const { data: transactions, isLoading } = useQuery<Transaction[]>({
    queryKey: ['/api/transactions/recent', { userId, limit }],
    queryFn: async () => {
      const res = await fetch(`/api/transactions/recent?userId=${userId}&limit=${limit}`);
      if (!res.ok) throw new Error('Failed to fetch transactions');
      return res.json();
    }
  });

  // Function to determine icon and color based on transaction type
  const getTransactionDetails = (transaction: Transaction) => {
    let icon = null;
    let color = "";
    
    if (transaction.type === "income") {
      icon = (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="8 12 12 8 16 12"></polyline>
          <line x1="12" y1="16" x2="12" y2="8"></line>
        </svg>
      );
      color = "text-[#4CAF50]";
    } else if (transaction.type === "expense") {
      icon = (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="8 12 12 16 16 12"></polyline>
          <line x1="12" y1="8" x2="12" y2="16"></line>
        </svg>
      );
      color = "text-[#F44336]";
    } else {
      icon = (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 1l4 4-4 4"></path>
          <path d="M3 11V9a4 4 0 014-4h14"></path>
          <path d="M7 23l-4-4 4-4"></path>
          <path d="M21 13v2a4 4 0 01-4 4H3"></path>
        </svg>
      );
      color = "text-[#2196F3]";
    }
    
    return { icon, color };
  };
  
  // Function to determine category icon
  const getCategoryIcon = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'food':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8h1a4 4 0 010 8h-1"></path>
            <path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"></path>
            <line x1="6" y1="1" x2="6" y2="4"></line>
            <line x1="10" y1="1" x2="10" y2="4"></line>
            <line x1="14" y1="1" x2="14" y2="4"></line>
          </svg>
        );
      case 'entertainment':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="23 7 16 12 23 17 23 7"></polygon>
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
          </svg>
        );
      case 'dining':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2"></path>
            <path d="M7 2v20"></path>
            <path d="M21 15V2"></path>
            <path d="M18 15a3 3 0 013 3v2a3 3 0 01-3 3h-3a3 3 0 01-3-3v-2a3 3 0 013-3h3z"></path>
          </svg>
        );
      case 'employment':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
            <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"></path>
          </svg>
        );
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        );
    }
  };

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

  return (
    <div className="bg-[#1E1E1E] rounded-xl p-5 shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-semibold text-white">Recent Transactions</h3>
        <button className="text-[#CCCCCC] hover:text-[#FFD700] text-sm transition-colors">
          View All
        </button>
      </div>
      
      {transactions && transactions.length > 0 ? (
        transactions.map((transaction, index) => {
          const { icon, color } = getTransactionDetails(transaction);
          const isLastItem = index === transactions.length - 1;
          const amountPrefix = transaction.type === 'income' ? '+' : (transaction.type === 'expense' ? '-' : '');
          const amountColor = transaction.type === 'income' ? 'text-[#4CAF50]' : 
                            (transaction.type === 'expense' ? 'text-[#F44336]' : 'text-[#2196F3]');
          
          const formattedAmount = new Intl.NumberFormat('en-US', { 
            style: 'currency', 
            currency: 'USD' 
          }).format(transaction.amount);
          
          const formattedDate = format(new Date(transaction.date), "MMM d, yyyy");
          
          return (
            <div 
              key={transaction.id} 
              className={`flex items-center justify-between py-3 ${isLastItem ? '' : 'border-b border-[#2D2D2D]'}`}
            >
              <div className="flex items-center">
                <div className={`w-10 h-10 rounded-full bg-[#2D2D2D]/60 flex items-center justify-center ${color} mr-3`}>
                  {getCategoryIcon(transaction.category)}
                </div>
                <div>
                  <p className="text-white text-sm font-medium">{transaction.description}</p>
                  <p className="text-[#999999] text-xs">{formattedDate} · {transaction.category}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`font-mono font-medium ${amountColor}`}>{amountPrefix}{formattedAmount}</p>
                <p className="text-xs text-[#999999]">{transaction.type === 'income' ? 'Direct Deposit' : 'Debit Card'}</p>
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
