/**
 * Format a date string or Date object to dd/mm/yyyy format
 * @param {string|Date} dateInput - The date to format
 * @returns {string} Formatted date string in dd/mm/yyyy format
 */
export const formatDate = (dateInput) => {
  if (!dateInput) return 'N/A';
  
  try {
    const date = new Date(dateInput);
    
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Error';
  }
};

/**
 * Format a date string or Date object to dd/mm/yyyy HH:mm format
 * @param {string|Date} dateInput - The date and time to format
 * @returns {string} Formatted date and time string in dd/mm/yyyy HH:mm format
 */
export const formatDateTime = (dateInput) => {
  if (!dateInput) return 'N/A';
  
  try {
    const date = new Date(dateInput);
    
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch (error) {
    console.error('Error formatting date/time:', error);
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