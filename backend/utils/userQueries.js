// Add this to your backend routes if the columns don't exist yet
// This is a temporary solution until the database can be updated

const getUserInsertQuery = (includeNewFields = true) => {
  if (includeNewFields) {
    return {
      query: `INSERT INTO users
        (fullName, email, password, phone, address, dob, bloodGroup, employer_name, years_in_ghana, community, country, state, city, userCategory, profilePicture, preferences, membershipType, socialMediaFollowed, userType, status, adminRole, permissions, termsAccepted, validationDate, planAssignedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      valueIndexes: {
        fullName: 0, email: 1, password: 2, phone: 3, address: 4, dob: 5, 
        bloodGroup: 6, employerName: 7, yearsInGhana: 8, community: 9, 
        country: 10, state: 11, city: 12, userCategory: 13, profilePicture: 14,
        preferences: 15, membershipType: 16, socialMediaFollowed: 17, 
        userType: 18, status: 19, adminRole: 20, permissions: 21, termsAccepted: 22, validationDate: 23
      }
    };
  } else {
    return {
      query: `INSERT INTO users
        (fullName, email, password, phone, address, dob, bloodGroup, community, country, state, city, userCategory, profilePicture, preferences, membershipType, socialMediaFollowed, userType, status, adminRole, permissions, termsAccepted, validationDate, planAssignedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      valueIndexes: {
        fullName: 0, email: 1, password: 2, phone: 3, address: 4, dob: 5, 
        bloodGroup: 6, community: 7, country: 8, state: 9, city: 10, 
        userCategory: 11, profilePicture: 12, preferences: 13, membershipType: 14, 
        socialMediaFollowed: 15, userType: 16, status: 17, adminRole: 18, 
        permissions: 19, termsAccepted: 20, validationDate: 21
      }
    };
  }
};

module.exports = { getUserInsertQuery };