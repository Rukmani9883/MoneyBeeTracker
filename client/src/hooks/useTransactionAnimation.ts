import { useState, useCallback } from 'react';

type AnimationType = 'add' | 'delete' | 'update' | 'success' | 'error' | 'income' | 'expense';

interface AnimationOptions {
  type: AnimationType;
  amount?: number;
  duration?: number;
}

export function useTransactionAnimation() {
  const [isVisible, setIsVisible] = useState(false);
  const [animationType, setAnimationType] = useState<AnimationType>('success');
  const [amount, setAmount] = useState<number | undefined>(undefined);

  const showAnimation = useCallback((options: AnimationOptions) => {
    setAnimationType(options.type);
    setAmount(options.amount);
    setIsVisible(true);
    
    const duration = options.duration || 2000;
    
    // Auto-hide the animation after duration
    setTimeout(() => {
      setIsVisible(false);
    }, duration);
  }, []);

  const hideAnimation = useCallback(() => {
    setIsVisible(false);
  }, []);

  return {
    isVisible,
    animationType,
    amount,
    showAnimation,
    hideAnimation
  };
}

export default useTransactionAnimation;