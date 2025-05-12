/**
 * Utility to notify the application that financial data has changed.
 * This will trigger a refresh of the dashboard and related components.
 */

export const notifyFinancialDataChanged = (): void => {
  // Create and dispatch a custom event
  const event = new CustomEvent('financial-data-changed');
  window.dispatchEvent(event);
};

/**
 * Debounced version of the notification function to prevent too many refreshes
 * when multiple operations happen in quick succession.
 */
let debounceTimeout: NodeJS.Timeout | null = null;
export const debouncedNotifyFinancialDataChanged = (delay: number = 300): void => {
  if (debounceTimeout) {
    clearTimeout(debounceTimeout);
  }
  
  debounceTimeout = setTimeout(() => {
    notifyFinancialDataChanged();
    debounceTimeout = null;
  }, delay);
};