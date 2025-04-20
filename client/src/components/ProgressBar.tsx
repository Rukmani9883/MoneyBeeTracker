import { cn } from "@/lib/utils";

interface ProgressBarProps {
  percentage: number;
  color?: string;
  height?: number;
  showPercentage?: boolean;
  className?: string;
}

const ProgressBar = ({ 
  percentage, 
  color = "#4CAF50", 
  height = 8,
  showPercentage = false,
  className
}: ProgressBarProps) => {
  // Ensure percentage is between 0 and 100
  const safePercentage = Math.min(100, Math.max(0, percentage));
  
  return (
    <div className={cn("relative w-full overflow-hidden rounded-full bg-[#2D2D2D]", className)} style={{ height }}>
      <div 
        className="h-full rounded-full progress-bar"
        style={{ 
          width: `${safePercentage}%`,
          backgroundColor: color
        }}
      />
      
      {showPercentage && (
        <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-white">
          {safePercentage}%
        </div>
      )}
    </div>
  );
};

export default ProgressBar;
