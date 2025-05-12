import React, { createContext, useContext, ReactNode } from 'react';
import useTransactionAnimation from '@/hooks/useTransactionAnimation';
import TransactionAnimation from './TransactionAnimation';

type AnimationType = 'add' | 'delete' | 'update' | 'success' | 'error' | 'income' | 'expense';

interface AnimationContextType {
  showAnimation: (options: {
    type: AnimationType;
    amount?: number;
    duration?: number;
  }) => void;
  hideAnimation: () => void;
}

const AnimationContext = createContext<AnimationContextType | undefined>(undefined);

export const useAnimation = () => {
  const context = useContext(AnimationContext);
  if (!context) {
    throw new Error('useAnimation must be used within an AnimationProvider');
  }
  return context;
};

interface AnimationProviderProps {
  children: ReactNode;
}

export const AnimationProvider: React.FC<AnimationProviderProps> = ({ children }) => {
  const {
    isVisible,
    animationType,
    amount,
    showAnimation,
    hideAnimation,
  } = useTransactionAnimation();

  return (
    <AnimationContext.Provider value={{ showAnimation, hideAnimation }}>
      {children}
      <TransactionAnimation
        isVisible={isVisible}
        type={animationType}
        amount={amount}
        onComplete={hideAnimation}
      />
    </AnimationContext.Provider>
  );
};

export default AnimationProvider;