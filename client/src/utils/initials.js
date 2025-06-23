/**
 * Utility function to generate user initials from first and last name
 * @param {string} firstName - User's first name
 * @param {string} lastName - User's last name
 * @param {string} fallbackName - Full name as fallback if firstName/lastName not available
 * @returns {string} User initials (e.g., "RF" for "Rowan Franciscus")
 */
export const getUserInitials = (firstName, lastName, fallbackName) => {
  // If we have both first and last name, use their first letters
  if (firstName && lastName) {
    return `${firstName.charAt(0).toUpperCase()}${lastName.charAt(0).toUpperCase()}`;
  }
  
  // If we only have first name, use just the first letter
  if (firstName) {
    return firstName.charAt(0).toUpperCase();
  }
  
  // If we have a fallback name, try to extract initials
  if (fallbackName) {
    const nameParts = fallbackName.trim().split(' ');
    if (nameParts.length >= 2) {
      return `${nameParts[0].charAt(0).toUpperCase()}${nameParts[nameParts.length - 1].charAt(0).toUpperCase()}`;
    }
    return nameParts[0].charAt(0).toUpperCase();
  }
  
  // Default fallback
  return 'U';
};

/**
 * Simple initials generator for when you already have separate first and last names
 * @param {string} firstName - User's first name
 * @param {string} lastName - User's last name
 * @returns {string} User initials
 */
export const getInitials = (firstName, lastName) => {
  if (!firstName && !lastName) return 'U';
  
  const first = firstName ? firstName.charAt(0).toUpperCase() : '';
  const last = lastName ? lastName.charAt(0).toUpperCase() : '';
  
  return `${first}${last}`.trim() || 'U';
}; 