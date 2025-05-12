import { motion } from "framer-motion";
import { ReactNode } from "react";

interface AnimatedIconProps {
  children: ReactNode;
  color?: string;
  animate?: boolean;
}

const AnimatedIcon = ({ children, color = "text-white", animate = true }: AnimatedIconProps) => {
  // Define animation variants
  const iconVariants = {
    initial: { scale: 0.8, opacity: 0 },
    animate: { scale: 1, opacity: 1, transition: { duration: 0.3 } },
    hover: { 
      scale: 1.1, 
      transition: { duration: 0.2 } 
    },
    tap: { 
      scale: 0.95, 
      transition: { duration: 0.1 } 
    }
  };

  return (
    <motion.div
      className={`w-10 h-10 rounded-full bg-[#2D2D2D]/60 flex items-center justify-center ${color}`}
      initial="initial"
      animate={animate ? {
        scale: animate ? [1, 1.05, 1] : 1,
        transition: {
          duration: 1.5,
          repeat: Infinity,
          repeatType: "reverse" as const
        }
      } : "animate"}
      whileHover="hover"
      whileTap="tap"
      variants={iconVariants}
    >
      {children}
    </motion.div>
  );
};

export default AnimatedIcon;