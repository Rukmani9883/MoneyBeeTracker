import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bill } from "@shared/schema";
import { format, differenceInDays } from "date-fns";
import { apiRequest } from "@/lib/queryClient";

interface UpcomingBillsProps {
  userId: number;
  limit?: number;
  month?: number;
  year?: number;
}

const UpcomingBills = ({ userId, limit = 4, month, year }: UpcomingBillsProps) => {
  const queryClient = useQueryClient();
  
  // Get current month and year if not provided
  const currentDate = new Date();
  const selectedMonth = month !== undefined ? month : currentDate.getMonth();
  const selectedYear = year !== undefined ? year : currentDate.getFullYear();
  
  // For API call we need to add 1 to month because JS months are 0-based
  const apiMonth = selectedMonth + 1;

  const { data: bills, isLoading } = useQuery<Bill[]>({
    queryKey: ['/api/bills/upcoming', { userId, month: apiMonth, year: selectedYear }],
    queryFn: async () => {
      const res = await fetch(`/api/bills/upcoming?userId=${userId}&month=${apiMonth}&year=${selectedYear}&daysAhead=30`);
      if (!res.ok) throw new Error('Failed to fetch bills');
      return res.json();
    }
  });

  const markAsPaidMutation = useMutation({
    mutationFn: async (billId: number) => {
      return apiRequest('POST', `/api/bills/${billId}/mark-paid`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bills/upcoming'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/summary'] });
    }
  });

  // Get category icon based on category
  const getCategoryIcon = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'utilities':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"></path>
          </svg>
        );
      case 'finance':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
            <line x1="1" y1="10" x2="23" y2="10"></line>
          </svg>
        );
      case 'loans':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1v22"></path>
            <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"></path>
          </svg>
        );
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
        );
    }
  };

  // Get the appropriate color for the category icon
  const getCategoryIconColor = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'utilities':
        return 'text-[#FF9800]';
      case 'finance':
        return 'text-[#F44336]';
      case 'loans':
        return 'text-[#FF9800]';
      default:
        return 'text-[#2196F3]';
    }
  };

  // Format due in days text
  const getDueText = (dueDate: string) => {
    const days = differenceInDays(new Date(dueDate), new Date());
    if (days < 0) return 'Overdue';
    if (days === 0) return 'Due today';
    if (days === 1) return 'Due tomorrow';
    return `Due in ${days} days`;
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
            <div className="flex items-center">
              <div className="h-4 bg-[#2D2D2D] rounded w-16 mr-3"></div>
              <div className="h-8 bg-[#2D2D2D] rounded w-12"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Limit bills to the specified limit
  const displayBills = bills?.slice(0, limit) || [];

  return (
    <div className="bg-[#1E1E1E] rounded-xl p-5 shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-semibold text-white">Upcoming Bills</h3>
        <button className="text-[#CCCCCC] hover:text-[#FFD700] text-sm transition-colors">
          View All
        </button>
      </div>
      
      {displayBills.length > 0 ? (
        displayBills.map((bill, index) => {
          const isLastItem = index === displayBills.length - 1;
          const iconColor = getCategoryIconColor(bill.category);
          const dueText = getDueText(bill.dueDate.toString());
          
          const formattedAmount = new Intl.NumberFormat('en-IN', { 
            style: 'currency', 
            currency: 'INR' 
          }).format(bill.amount);
          
          return (
            <div 
              key={bill.id} 
              className={`flex items-center justify-between py-3 ${isLastItem ? '' : 'border-b border-[#2D2D2D]'}`}
            >
              <div className="flex items-center">
                <div className={`w-10 h-10 rounded-full bg-[#2D2D2D]/60 flex items-center justify-center ${iconColor} mr-3`}>
                  {getCategoryIcon(bill.category)}
                </div>
                <div>
                  <p className="text-white text-sm font-medium">{bill.name}</p>
                  <p className="text-[#999999] text-xs">{dueText}</p>
                </div>
              </div>
              <div className="flex items-center">
                <p className="text-white font-mono font-medium mr-3">{formattedAmount}</p>
                <button 
                  className="bg-[#2D2D2D] hover:bg-[#FFD700] hover:text-[#121212] px-3 py-1 rounded-lg text-xs text-[#CCCCCC] transition-colors"
                  onClick={() => markAsPaidMutation.mutate(bill.id)}
                  disabled={markAsPaidMutation.isPending}
                >
                  Pay
                </button>
              </div>
            </div>
          );
        })
      ) : (
        <div className="text-center py-8 text-[#CCCCCC]">
          <p>No upcoming bills</p>
          <p className="text-sm text-[#999999] mt-1">Add bills to see them here</p>
        </div>
      )}
      
      <button className="w-full mt-4 bg-[#2D2D2D] hover:bg-[#2D2D2D]/80 py-2 rounded-lg text-[#CCCCCC] text-sm transition-colors">
        Add New Bill
      </button>
    </div>
  );
};

export default UpcomingBills;
