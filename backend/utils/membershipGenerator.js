/**
 * Generate membership number in the format: ABCD EFGH IJKL MNOP
 * ABCD: year user registers
 * EFGH: date and month user registers  
 * IJKL: time (minutes and seconds) user registers
 * MNOP: random set of 4 digits
 * 
 * @returns {string} Formatted membership number
 */
function generateMembershipNumber() {
  const now = new Date();
  
  // ABCD: Current year (4 digits)
  const year = now.getFullYear().toString();
  
  // EFGH: Date (2 digits) + Month (2 digits)
  const date = now.getDate().toString().padStart(2, '0');
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const dateMonth = date + month;
  
  // IJKL: Minutes (2 digits) + Seconds (2 digits)
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');
  const timeComponent = minutes + seconds;
  
  // MNOP: Random 4 digits
  const randomDigits = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  
  // Combine all parts
  const membershipNumber = `${year}${dateMonth}${timeComponent}${randomDigits}`;
  
  return membershipNumber;
}

/**
 * Format membership number with spaces for display
 * @param {string} membershipNumber - 16 digit membership number
 * @returns {string} Formatted number with spaces (ABCD EFGH IJKL MNOP)
 */
function formatMembershipNumberDisplay(membershipNumber) {
  if (!membershipNumber || membershipNumber.length !== 16) {
    return membershipNumber;
  }
  
  return `${membershipNumber.slice(0, 4)} ${membershipNumber.slice(4, 8)} ${membershipNumber.slice(8, 12)} ${membershipNumber.slice(12, 16)}`;
}

/**
 * Remove spaces from formatted membership number to get clean 16 digits
 * @param {string} formattedNumber - Formatted number with spaces
 * @returns {string} Clean 16 digit number
 */
function cleanMembershipNumber(formattedNumber) {
  return formattedNumber.replace(/\s+/g, '');
}

module.exports = {
  generateMembershipNumber,
  formatMembershipNumberDisplay,
  cleanMembershipNumber
};
