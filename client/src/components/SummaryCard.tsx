interface SummaryCardProps {
  title: string;
  amount: number;
  icon: React.ReactNode;
  iconColor: string;
}

const SummaryCard = ({ title, amount, icon, iconColor }: SummaryCardProps) => {
  const formattedAmount = new Intl.NumberFormat('en-IN', { 
    style: 'currency', 
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);

  return (
    <div className="bg-[#1E1E1E] rounded-xl p-4 shadow-lg">
      <div className="flex justify-between items-start mb-3">
        <div className="text-[#CCCCCC] font-medium text-sm">{title}</div>
        <div className={iconColor ? iconColor : ""}>
          {icon}
        </div>
      </div>
      <div className="font-mono font-medium text-xl text-white">{formattedAmount}</div>
    </div>
  );
};

export default SummaryCard;
