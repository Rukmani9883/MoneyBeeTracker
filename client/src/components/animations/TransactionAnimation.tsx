import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, ArrowUp, ArrowDown, Plus, Trash } from 'lucide-react';

type AnimationType = 'add' | 'delete' | 'update' | 'success' | 'error' | 'income' | 'expense';

interface TransactionAnimationProps {
  type: AnimationType;
  amount?: number;
  isVisible: boolean;
  onComplete?: () => void;
}

const TransactionAnimation: React.FC<TransactionAnimationProps> = ({
  type,
  amount,
  isVisible,
  onComplete,
}) => {
  const [visible, setVisible] = useState(isVisible);

  useEffect(() => {
    setVisible(isVisible);
    
    if (isVisible) {
      const timer = setTimeout(() => {
        setVisible(false);
        if (onComplete) onComplete();
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [isVisible, onComplete]);

  const getIcon = () => {
    switch (type) {
      case 'add':
        return <Plus className="h-6 w-6" />;
      case 'delete':
        return <Trash className="h-6 w-6" />;
      case 'update':
        return <Check className="h-6 w-6" />;
      case 'success':
        return <Check className="h-6 w-6" />;
      case 'error':
        return <X className="h-6 w-6" />;
      case 'income':
        return <ArrowUp className="h-6 w-6" />;
      case 'expense':
        return <ArrowDown className="h-6 w-6" />;
      default:
        return <Check className="h-6 w-6" />;
    }
  };

  const getColor = () => {
    switch (type) {
      case 'add':
        return 'bg-green-500';
      case 'delete':
        return 'bg-red-500';
      case 'update':
        return 'bg-blue-500';
      case 'success':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      case 'income':
        return 'bg-[#4CAF50]';
      case 'expense':
        return 'bg-[#F44336]';
      default:
        return 'bg-green-500';
    }
  };

  const getText = () => {
    switch (type) {
      case 'add':
        return 'Added';
      case 'delete':
        return 'Deleted';
      case 'update':
        return 'Updated';
      case 'success':
        return 'Success';
      case 'error':
        return 'Error';
      case 'income':
        return `+₹${amount?.toLocaleString() || '0'}`;
      case 'expense':
        return `-₹${amount?.toLocaleString() || '0'}`;
      default:
        return 'Done';
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className={`fixed top-20 right-4 z-50 rounded-md shadow-lg p-4 text-white flex items-center space-x-2 ${getColor()}`}
          initial={{ opacity: 0, y: -50, x: 50 }}
          animate={{ opacity: 1, y: 0, x: 0 }}
          exit={{ opacity: 0, y: -20, x: 20 }}
          transition={{ 
            type: 'spring', 
            stiffness: 500, 
            damping: 30 
          }}
        >
          <div className="bg-white bg-opacity-20 rounded-full p-2">
            {getIcon()}
          </div>
          <span className="font-semibold">{getText()}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TransactionAnimation;