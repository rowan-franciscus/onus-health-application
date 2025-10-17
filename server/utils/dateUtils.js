/**
 * Format a date to dd/mm/yyyy format
 * @param {Date|string} dateInput - The date to format
 * @returns {string} Formatted date string in dd/mm/yyyy format
 */
const formatDate = (dateInput) => {
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
 * Format a date to dd/mm/yyyy HH:mm format
 * @param {Date|string} dateInput - The date and time to format
 * @returns {string} Formatted date and time string in dd/mm/yyyy HH:mm format
 */
const formatDateTime = (dateInput) => {
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

module.exports = {
  formatDate,
  formatDateTime
};
