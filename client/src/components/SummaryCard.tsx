import { ArrowDownIcon, ArrowUpIcon } from "lucide-react";

interface SummaryCardProps {
  title: string;
  amount: number;
  percentChange: number;
  icon: React.ReactNode;
  iconColor: string;
}

const SummaryCard = ({ title, amount, percentChange, icon, iconColor }: SummaryCardProps) => {
  const formattedAmount = new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
  
  const isPositive = percentChange >= 0;
  const changeText = `${isPositive ? '+' : ''}${percentChange}%`;
  const textColor = isPositive ? 'text-[#4CAF50]' : 'text-[#F44336]';

  return (
    <div className="bg-[#1E1E1E] rounded-xl p-4 shadow-lg">
      <div className="flex justify-between items-start mb-3">
        <div className="text-[#CCCCCC] font-medium text-sm">{title}</div>
        <div className={iconColor}>
          {icon}
        </div>
      </div>
      <div className="font-mono font-medium text-xl text-white">{formattedAmount}</div>
      <div className={`mt-2 text-xs flex items-center ${textColor}`}>
        {isPositive ? (
          <ArrowUpIcon className="h-3 w-3 mr-1" />
        ) : (
          <ArrowDownIcon className="h-3 w-3 mr-1" />
        )}
        <span>{changeText}</span>
        <span className="text-[#999999] ml-1">vs last month</span>
      </div>
    </div>
  );
};

export default SummaryCard;
