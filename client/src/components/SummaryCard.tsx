import { Link } from "wouter";

interface SummaryCardProps {
  title: string;
  amount: number;
  subtitle?: string; // Optional subtitle text
  icon: React.ReactNode;
  iconColor: string;
  linkTo?: string; // Optional path to navigate to when clicked
}

const SummaryCard = ({ title, amount, subtitle, icon, iconColor, linkTo }: SummaryCardProps) => {
  const formattedAmount = new Intl.NumberFormat('en-IN', { 
    style: 'currency', 
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);

  const content = (
    <>
      <div className="flex justify-between items-start mb-3">
        <div className="text-[#CCCCCC] font-medium text-sm">{title}</div>
        <div className={iconColor ? iconColor : ""}>
          {icon}
        </div>
      </div>
      <div className="font-mono font-medium text-xl text-white">{formattedAmount}</div>
      {subtitle && (
        <div className="text-[#999999] text-xs mt-1">{subtitle}</div>
      )}
    </>
  );

  return linkTo ? (
    <Link href={linkTo}>
      <div className="bg-[#1E1E1E] rounded-xl p-4 shadow-lg cursor-pointer transform transition-transform hover:scale-[1.02] hover:shadow-xl">
        {content}
      </div>
    </Link>
  ) : (
    <div className="bg-[#1E1E1E] rounded-xl p-4 shadow-lg">
      {content}
    </div>
  );
};

export default SummaryCard;
