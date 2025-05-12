import { motion } from "framer-motion";
import { ReactNode } from "react";

interface AnimatedIconProps {
  children: ReactNode;
  color?: string;
  animate?: boolean;
}

const AnimatedIcon = ({ children, color = "text-white", animate = true }: AnimatedIconProps) => {
  return (
    <motion.div
      className={`w-10 h-10 rounded-full bg-[#2D2D2D]/60 flex items-center justify-center ${color}`}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ 
        scale: animate ? [1, 1.05, 1] : 1, 
        opacity: 1 
      }}
      transition={{
        duration: animate ? 1.5 : 0.3,
        repeat: animate ? Infinity : 0,
        repeatType: "reverse"
      }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
    >
      {children}
    </motion.div>
  );
};

export default AnimatedIcon;