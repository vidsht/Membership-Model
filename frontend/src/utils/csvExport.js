/**
 * CSV Export Utility Functions
 * Provides functionality to export data to CSV files with proper formatting
 */

/**
 * Converts an array of objects to CSV format
 * @param {Array} data - Array of objects to convert
 * @param {Array} columns - Array of column configurations
 * @returns {string} CSV formatted string
 */
export const convertToCSV = (data, columns) => {
  if (!data || data.length === 0) {
    return '';
  }

  // Create headers
  const headers = columns.map(col => col.header || col.key).join(',');
  
  // Create rows
  const rows = data.map(item => {
    return columns.map(col => {
      let value = '';
      
      // Handle nested properties with dot notation
      if (col.key.includes('.')) {
        const keys = col.key.split('.');
        value = keys.reduce((obj, key) => obj && obj[key], item);
      } else {
        value = item[col.key];
      }
      
      // Apply formatter if provided
      if (col.formatter && typeof col.formatter === 'function') {
        value = col.formatter(value, item);
      }
      
      // Handle null/undefined values
      if (value === null || value === undefined) {
        value = '';
      }
      
      // Convert to string and escape quotes
      value = String(value).replace(/"/g, '""');
      
      // Wrap in quotes if contains comma, quote, or newline
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        value = `"${value}"`;
      }
      
      return value;
    }).join(',');
  });

  return [headers, ...rows].join('\n');
};

/**
 * Downloads a CSV file with the given data
 * @param {Array} data - Array of objects to export
 * @param {Array} columns - Array of column configurations
 * @param {string} filename - Name of the file to download
 */
export const downloadCSV = (data, columns, filename = 'export.csv') => {
  const csv = convertToCSV(data, columns);
  
  if (!csv) {
    throw new Error('No data to export');
  }
  
  // Create blob
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  
  // Create download link
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  // Add to DOM and click
  document.body.appendChild(link);
  link.click();
  
  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Formats date for CSV export
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date string
 */
export const formatDateForCSV = (date) => {
  if (!date) return '';
  
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  } catch (e) {
    return '';
  }
};

/**
 * Formats datetime for CSV export
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted datetime string
 */
export const formatDateTimeForCSV = (date) => {
  if (!date) return '';
  
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    
    return d.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch (e) {
    return '';
  }
};

/**
 * User data column definitions for CSV export
 */
export const USER_CSV_COLUMNS = [
  { key: 'id', header: 'User ID' },
  { key: 'fullName', header: 'Full Name' },
  { key: 'email', header: 'Email' },
  { key: 'phone', header: 'Phone' },
  { key: 'address', header: 'Address' },
  { key: 'community', header: 'Community' },
  { key: 'bloodGroup', header: 'Blood Group' },
  { key: 'membershipType', header: 'Membership Type' },
  { key: 'userType', header: 'User Type' },
  { key: 'status', header: 'Status' },
  { 
    key: 'createdAt', 
    header: 'Registration Date',
    formatter: formatDateTimeForCSV
  },
  { 
    key: 'lastLogin', 
    header: 'Last Login',
    formatter: formatDateTimeForCSV
  },
  { key: 'membershipNumber', header: 'Membership Number' },
  { key: 'planName', header: 'Plan Name' },
  { key: 'planPrice', header: 'Plan Price' },
  { key: 'currency', header: 'Currency' },
  { key: 'billingCycle', header: 'Billing Cycle' }
];

/**
 * Merchant data column definitions for CSV export
 */
export const MERCHANT_CSV_COLUMNS = [
  { key: 'id', header: 'Merchant ID' },
  { key: 'fullName', header: 'Owner Name' },
  { key: 'email', header: 'Owner Email' },
  { key: 'phone', header: 'Owner Phone' },
  { key: 'address', header: 'Owner Address' },
  { key: 'community', header: 'Community' },
  { key: 'bloodGroup', header: 'Blood Group' },
  { key: 'businessId', header: 'Business ID' },
  { key: 'businessName', header: 'Business Name' },
  { key: 'businessDescription', header: 'Business Description' },
  { key: 'businessCategory', header: 'Business Category' },
  { key: 'businessAddress', header: 'Business Address' },
  { key: 'businessPhone', header: 'Business Phone' },
  { key: 'businessEmail', header: 'Business Email' },
  { key: 'website', header: 'Website' },
  { key: 'businessLicense', header: 'Business License' },
  { key: 'taxId', header: 'Tax ID' },
  { key: 'customDealLimit', header: 'Custom Deal Limit' },
  { key: 'membershipType', header: 'Membership Type' },
  { key: 'status', header: 'Status' },
  { 
    key: 'createdAt', 
    header: 'Registration Date',
    formatter: formatDateTimeForCSV
  },
  { 
    key: 'lastLogin', 
    header: 'Last Login',
    formatter: formatDateTimeForCSV
  },
  { key: 'membershipNumber', header: 'Membership Number' },
  { key: 'planName', header: 'Plan Name' },
  { key: 'planPrice', header: 'Plan Price' },
  { key: 'currency', header: 'Currency' },
  { key: 'billingCycle', header: 'Billing Cycle' },
  { key: 'planMaxDeals', header: 'Plan Max Deals' }
];

/**
 * Generates a filename with timestamp
 * @param {string} prefix - Prefix for the filename
 * @returns {string} Generated filename
 */
export const generateFilename = (prefix = 'export') => {
  const now = new Date();
  const timestamp = now.toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '_');
  return `${prefix}_${timestamp}.csv`;
};
