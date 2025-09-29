/**
 * Date formatting utilities for email templates
 * Ensures all dates are formatted as dd/mm/yyyy without time
 */

/**
 * Format a date as dd/mm/yyyy
 * @param {Date|string|number} date - Date to format
 * @returns {string} Formatted date string
 */
function formatDateForEmail(date) {
  if (!date) return '';
  
  try {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return '';
    
    // Use en-GB locale to get dd/mm/yyyy format
    return dateObj.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch (error) {
    console.error('Error formatting date for email:', error);
    return '';
  }
}

/**
 * Format a date for display in templates (same as formatDateForEmail for consistency)
 * @param {Date|string|number} date - Date to format
 * @returns {string} Formatted date string
 */
function formatDisplayDate(date) {
  return formatDateForEmail(date);
}

/**
 * Get current date formatted as dd/mm/yyyy
 * @returns {string} Current date in dd/mm/yyyy format
 */
function getCurrentDateForEmail() {
  return formatDateForEmail(new Date());
}

/**
 * Format expiry date for emails (adds days to current date)
 * @param {number} daysFromNow - Number of days from now
 * @returns {string} Formatted expiry date
 */
function getExpiryDateForEmail(daysFromNow) {
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + daysFromNow);
  return formatDateForEmail(expiryDate);
}

module.exports = {
  formatDateForEmail,
  formatDisplayDate,
  getCurrentDateForEmail,
  getExpiryDateForEmail
};