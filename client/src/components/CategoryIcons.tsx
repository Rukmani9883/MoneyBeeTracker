import { motion } from "framer-motion";
import AnimatedIcon from "./AnimatedIcon";
import { 
  Coffee, 
  Utensils, 
  Film, 
  ShoppingBag, 
  Briefcase, 
  Car, 
  Home, 
  TrendingUp, 
  Heart, 
  HelpCircle 
} from "lucide-react";

// The Food icon component with animation
export const FoodIcon = ({ color = "text-[#FF9800]" }) => (
  <AnimatedIcon color={color}>
    <Coffee className="h-5 w-5" />
  </AnimatedIcon>
);

// The Dining icon component with animation
export const DiningIcon = ({ color = "text-[#F44336]" }) => (
  <AnimatedIcon color={color}>
    <Utensils className="h-5 w-5" />
  </AnimatedIcon>
);

// The Entertainment icon component with animation
export const EntertainmentIcon = ({ color = "text-[#9C27B0]" }) => (
  <AnimatedIcon color={color}>
    <Film className="h-5 w-5" />
  </AnimatedIcon>
);

// The Shopping icon component with animation
export const ShoppingIcon = ({ color = "text-[#E91E63]" }) => (
  <AnimatedIcon color={color}>
    <ShoppingBag className="h-5 w-5" />
  </AnimatedIcon>
);

// The Salary/Income icon component with animation
export const SalaryIcon = ({ color = "text-[#4CAF50]" }) => (
  <AnimatedIcon color={color}>
    <Briefcase className="h-5 w-5" />
  </AnimatedIcon>
);

// The Transportation icon component with animation
export const TransportationIcon = ({ color = "text-[#2196F3]" }) => (
  <AnimatedIcon color={color}>
    <Car className="h-5 w-5" />
  </AnimatedIcon>
);

// The Utilities/Bills icon component with animation
export const UtilitiesIcon = ({ color = "text-[#607D8B]" }) => (
  <AnimatedIcon color={color}>
    <Home className="h-5 w-5" />
  </AnimatedIcon>
);

// The Investment icon component with animation
export const InvestmentIcon = ({ color = "text-[#CDDC39]" }) => (
  <AnimatedIcon color={color}>
    <TrendingUp className="h-5 w-5" />
  </AnimatedIcon>
);

// The Health icon component with animation
export const HealthIcon = ({ color = "text-[#00BCD4]" }) => (
  <AnimatedIcon color={color}>
    <Heart className="h-5 w-5" />
  </AnimatedIcon>
);

// The Other/Default icon component with animation
export const OtherIcon = ({ color = "text-[#9E9E9E]" }) => (
  <AnimatedIcon color={color}>
    <HelpCircle className="h-5 w-5" />
  </AnimatedIcon>
);

// Returns the appropriate animated icon based on the category
export const getCategoryIcon = (category: string | null, colorOverride?: string) => {
  if (!category) return <OtherIcon color={colorOverride} />;
  
  switch (category.toLowerCase()) {
    case 'food':
      return <FoodIcon color={colorOverride} />;
    case 'entertainment':
      return <EntertainmentIcon color={colorOverride} />;
    case 'dining':
      return <DiningIcon color={colorOverride} />;
    case 'salary':
    case 'income':
      return <SalaryIcon color={colorOverride} />;
    case 'transportation':
      return <TransportationIcon color={colorOverride} />;
    case 'shopping':
      return <ShoppingIcon color={colorOverride} />;
    case 'utilities':
    case 'bills':
      return <UtilitiesIcon color={colorOverride} />;
    case 'investment':
      return <InvestmentIcon color={colorOverride} />;
    case 'health':
      return <HealthIcon color={colorOverride} />;
    default:
      return <OtherIcon color={colorOverride} />;
  }
};