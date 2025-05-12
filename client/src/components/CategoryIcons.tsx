import { motion } from "framer-motion";
import AnimatedIcon from "./AnimatedIcon";

// Animation variants for the SVG path elements
const pathVariants = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: (i: number) => ({
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: { 
        type: "spring", 
        duration: 1.5, 
        bounce: 0, 
        delay: i * 0.05 
      },
      opacity: { duration: 0.2 }
    }
  })
};

// Common props for motion paths
const getMotionPathProps = (index: number = 0) => ({
  variants: pathVariants,
  initial: "hidden",
  animate: "visible",
  custom: index
});

export const FoodIcon = ({ color = "text-[#FF9800]" }) => (
  <AnimatedIcon color={color}>
    <motion.svg 
      xmlns="http://www.w3.org/2000/svg" 
      className="h-5 w-5" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2"
    >
      <motion.path {...getMotionPathProps(0)} d="M18 8h1a4 4 0 010 8h-1" />
      <motion.path {...getMotionPathProps(1)} d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z" />
      <motion.line {...getMotionPathProps(2)} x1="6" y1="1" x2="6" y2="4" />
      <motion.line {...getMotionPathProps(3)} x1="10" y1="1" x2="10" y2="4" />
      <motion.line {...getMotionPathProps(4)} x1="14" y1="1" x2="14" y2="4" />
    </motion.svg>
  </AnimatedIcon>
);

export const EntertainmentIcon = ({ color = "text-[#9C27B0]" }) => (
  <AnimatedIcon color={color}>
    <motion.svg 
      xmlns="http://www.w3.org/2000/svg" 
      className="h-5 w-5" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2"
    >
      <motion.polygon {...getMotionPathProps(0)} points="23 7 16 12 23 17 23 7" />
      <motion.rect {...getMotionPathProps(1)} x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </motion.svg>
  </AnimatedIcon>
);

export const DiningIcon = ({ color = "text-[#F44336]" }) => (
  <AnimatedIcon color={color}>
    <motion.svg 
      xmlns="http://www.w3.org/2000/svg" 
      className="h-5 w-5" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2"
    >
      <motion.path {...getMotionPathProps(0)} d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2" />
      <motion.path {...getMotionPathProps(1)} d="M7 2v20" />
      <motion.path {...getMotionPathProps(2)} d="M21 15V2" />
      <motion.path {...getMotionPathProps(3)} d="M18 15a3 3 0 013 3v2a3 3 0 01-3 3h-3a3 3 0 01-3-3v-2a3 3 0 013-3h3z" />
    </motion.svg>
  </AnimatedIcon>
);

export const SalaryIcon = ({ color = "text-[#4CAF50]" }) => (
  <AnimatedIcon color={color}>
    <motion.svg 
      xmlns="http://www.w3.org/2000/svg" 
      className="h-5 w-5" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2"
    >
      <motion.rect {...getMotionPathProps(0)} x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <motion.path {...getMotionPathProps(1)} d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
    </motion.svg>
  </AnimatedIcon>
);

export const TransportationIcon = ({ color = "text-[#2196F3]" }) => (
  <AnimatedIcon color={color}>
    <motion.svg 
      xmlns="http://www.w3.org/2000/svg" 
      className="h-5 w-5" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2"
    >
      <motion.path {...getMotionPathProps(0)} d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C1.4 11.3 1 12.1 1 13v3c0 .6.4 1 1 1h2" />
      <motion.circle {...getMotionPathProps(1)} cx="7" cy="17" r="2" />
      <motion.path {...getMotionPathProps(2)} d="M9 17h6" />
      <motion.circle {...getMotionPathProps(3)} cx="17" cy="17" r="2" />
    </motion.svg>
  </AnimatedIcon>
);

export const ShoppingIcon = ({ color = "text-[#E91E63]" }) => (
  <AnimatedIcon color={color}>
    <motion.svg 
      xmlns="http://www.w3.org/2000/svg" 
      className="h-5 w-5" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2"
    >
      <motion.path {...getMotionPathProps(0)} d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
      <motion.line {...getMotionPathProps(1)} x1="3" y1="6" x2="21" y2="6" />
      <motion.path {...getMotionPathProps(2)} d="M16 10a4 4 0 01-8 0" />
    </motion.svg>
  </AnimatedIcon>
);

export const UtilitiesIcon = ({ color = "text-[#607D8B]" }) => (
  <AnimatedIcon color={color}>
    <motion.svg 
      xmlns="http://www.w3.org/2000/svg" 
      className="h-5 w-5" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2"
    >
      <motion.path {...getMotionPathProps(0)} d="M12 2v4" />
      <motion.path {...getMotionPathProps(1)} d="M12 18v4" />
      <motion.path {...getMotionPathProps(2)} d="M4.93 4.93l2.83 2.83" />
      <motion.path {...getMotionPathProps(3)} d="M16.24 16.24l2.83 2.83" />
      <motion.path {...getMotionPathProps(4)} d="M2 12h4" />
      <motion.path {...getMotionPathProps(5)} d="M18 12h4" />
      <motion.path {...getMotionPathProps(6)} d="M4.93 19.07l2.83-2.83" />
      <motion.path {...getMotionPathProps(7)} d="M16.24 7.76l2.83-2.83" />
    </motion.svg>
  </AnimatedIcon>
);

export const InvestmentIcon = ({ color = "text-[#CDDC39]" }) => (
  <AnimatedIcon color={color}>
    <motion.svg 
      xmlns="http://www.w3.org/2000/svg" 
      className="h-5 w-5" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2"
    >
      <motion.path {...getMotionPathProps(0)} d="M12 2v8" />
      <motion.path {...getMotionPathProps(1)} d="M12 18v4" />
      <motion.circle {...getMotionPathProps(2)} cx="12" cy="12" r="8" />
      <motion.path {...getMotionPathProps(3)} d="M8.5 14.5L12 12l3.5 2.5" />
      <motion.path {...getMotionPathProps(4)} d="M8.5 9.5L12 12l3.5-2.5" />
    </motion.svg>
  </AnimatedIcon>
);

export const HealthIcon = ({ color = "text-[#00BCD4]" }) => (
  <AnimatedIcon color={color}>
    <motion.svg 
      xmlns="http://www.w3.org/2000/svg" 
      className="h-5 w-5" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2"
    >
      <motion.path {...getMotionPathProps(0)} d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </motion.svg>
  </AnimatedIcon>
);

export const OtherIcon = ({ color = "text-[#9E9E9E]" }) => (
  <AnimatedIcon color={color}>
    <motion.svg 
      xmlns="http://www.w3.org/2000/svg" 
      className="h-5 w-5" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2"
    >
      <motion.circle {...getMotionPathProps(0)} cx="12" cy="12" r="10" />
      <motion.line {...getMotionPathProps(1)} x1="12" y1="8" x2="12" y2="12" />
      <motion.line {...getMotionPathProps(2)} x1="12" y1="16" x2="12.01" y2="16" />
    </motion.svg>
  </AnimatedIcon>
);

// Returns the appropriate animated icon based on the category
export const getCategoryIcon = (category: string | null, colorOverride?: string) => {
  switch (category?.toLowerCase()) {
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