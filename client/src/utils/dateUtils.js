/**
 * Format a date string or Date object to a human-readable format
 * @param {string|Date} dateInput - The date to format
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
export const formatDate = (dateInput, options = {}) => {
  if (!dateInput) return 'N/A';
  
  try {
    const date = new Date(dateInput);
    
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    
    const defaultOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...options
    };
    
    return new Intl.DateTimeFormat('en-US', defaultOptions).format(date);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Error';
  }
};

/**
 * Calculate the difference between two dates
 * @param {string|Date} startDate - The start date
 * @param {string|Date} endDate - The end date (defaults to current date)
 * @param {string} unit - The unit to return ('days', 'months', 'years')
 * @returns {number} The difference in the specified unit
 */
export const getDateDifference = (startDate, endDate = new Date(), unit = 'days') => {
  if (!startDate) return null;
  
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const diffTime = Math.abs(end - start);
    
    switch (unit.toLowerCase()) {
      case 'days':
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      case 'months':
        const monthDiff = (end.getFullYear() - start.getFullYear()) * 12 + 
                          (end.getMonth() - start.getMonth());
        return monthDiff;
      case 'years':
        return end.getFullYear() - start.getFullYear();
      default:
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Default to days
    }
  } catch (error) {
    console.error('Error calculating date difference:', error);
    return null;
  }
}; 