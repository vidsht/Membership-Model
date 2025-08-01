<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Indians in Ghana Membership System - Copilot Instructions

## Project Overview
This is a comprehensive web-based membership management system for the Indian community in Ghana. The application is built using vanilla HTML, CSS, and JavaScript with a focus on modern web standards and responsive design.

## Architecture
- **Full-Stack Application**: React frontend with Node.js/Express backend
- **Database**: MySQL with connection pooling for data persistence
- **Authentication**: Session-based authentication using MySQL session store
- **Modern JavaScript**: ES6+ features and modular approach
- **Responsive Design**: Mobile-first approach with CSS Grid and Flexbox

## Code Style Guidelines

### HTML
- Use semantic HTML5 elements
- Maintain proper document structure
- Include accessibility attributes (aria-labels, alt text)
- Use meaningful class names following BEM methodology when appropriate

### CSS
- Use CSS custom properties (variables) defined in :root
- Follow mobile-first responsive design principles
- Use CSS Grid and Flexbox for layouts
- Maintain consistent spacing using the defined variables
- Use the established color scheme and typography

### JavaScript
- Use modern ES6+ syntax
- Follow functional programming principles where possible
- Use const/let instead of var
- Implement proper error handling
- Use meaningful function and variable names
- Add JSDoc comments for complex functions

## Key Features to Maintain
1. **User Authentication**: Registration, login, logout, password reset
2. **Membership Cards**: Digital cards with QR codes and barcodes
3. **Business Directory**: Local Indian businesses listings
4. **Exclusive Deals**: Member-only offers and discounts
5. **Profile Management**: User data and preferences

## Data Structure
- Users: Stored in MySQL with proper schemas and validation
- Businesses: MySQL table with expandable structure linked to users
- Deals: MySQL table with categorized offers and expiration dates
- Sessions: MySQL-based session storage for authentication
- All data persisted in MySQL with proper foreign key relationships

## Third-Party Libraries
- Font Awesome for icons
- QR Code.js for QR code generation
- JsBarcode for barcode generation
- Google Fonts (Inter) for typography

## Development Guidelines
- Test all functionality across different browsers
- Ensure mobile responsiveness
- Validate all forms properly
- Handle edge cases gracefully
- Provide user feedback through notifications
- Keep the codebase modular and maintainable

## Security Considerations
- Validate all user inputs
- Sanitize data before storage
- Use proper session-based authentication
- Implement server-side validation and security
- Use HTTP-only cookies for session management

## Future Enhancements
When adding new features, consider:
- Maintaining the existing design system
- Adding proper error handling
- Ensuring mobile compatibility
- Following the established code patterns
- Updating the README file with new features
