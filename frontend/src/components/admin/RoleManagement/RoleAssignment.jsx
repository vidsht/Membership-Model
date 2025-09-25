import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useNotification } from '../../../contexts/NotificationContext';
import { useAdminNavigation } from '../../../hooks/useAdminNavigation';
import api from '../../../services/api';
import './RoleAssignment.css';

/**
 * RoleAssignment component for assigning roles to users
 * @returns {React.ReactElement} The role assignment component
 */
const RoleAssignment = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { navigateBackToAdmin } = useAdminNavigation();
  const { showNotification } = useNotification();
    const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedAdminRole, setSelectedAdminRole] = useState('');
  const [availablePermissions, setAvailablePermissions] = useState([]);
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [availableRoles, setAvailableRoles] = useState({});
  const [adminPermissions, setAdminPermissions] = useState({
    canManageUsers: false,
    canManagePlans: false,
    canManagePartners: false,
    canManageSettings: false,
    canManageDeals: false
  });
  const [merchantDetails, setMerchantDetails] = useState({
    businessId: '',
    position: '',
    canManageBusiness: false
  });
  const [businesses, setBusinesses] = useState([]);
  const [confirmationVisible, setConfirmationVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('roles');
  
  useEffect(() => {
    fetchUserData();
    fetchRolesAndPermissions();
  }, [userId]);
  
  const fetchUserData = async () => {
    try {
      setIsLoading(true);
      
      const [userResponse, businessesResponse, userRoleResponse] = await Promise.all([
        api.get(`/admin/users/${userId}`),
        api.get('/admin/businesses'),
        api.get(`/admin/users/${userId}/role`)
      ]);      // Sanitize user data to prevent circular references
      const cleanUser = {
        ...userResponse.data,
        fullName: String(userResponse.data.fullName || ''),
        email: String(userResponse.data.email || ''),
        userType: String(userResponse.data.userType || 'user')
      };
      setUser(cleanUser);
      setBusinesses(businessesResponse.data || []);
      
      // Set initial role and permissions
      const userType = userResponse.data.userType || 'user';
      setSelectedRole(userType);
      
      // Set admin role and permissions if user is admin
      if (userType === 'admin') {
        setSelectedAdminRole(userRoleResponse.data.adminRole || 'contentManager');
        setSelectedPermissions(userRoleResponse.data.permissions || []);
      }
      
      // Set merchant details if user is merchant
      if (userType === 'merchant' && userResponse.data.businessInfo) {
        setMerchantDetails({
          businessId: userResponse.data.businessInfo.businessId || '',
          position: userResponse.data.businessInfo.position || '',
          canManageBusiness: userResponse.data.businessInfo.canManageBusiness || false
        });
      }
      
    } catch (error) {
      console.error('Error fetching user data:', error);
      showNotification('Error loading user data. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };
  
  const fetchRolesAndPermissions = async () => {
    try {
      const [rolesResponse, permissionsResponse] = await Promise.all([
        api.get('/admin/roles'),
        api.get('/admin/roles/permissions')
      ]);
      
      setAvailableRoles(rolesResponse.data.roles);
      setAvailablePermissions(permissionsResponse.data.permissions);
    } catch (error) {
      console.error('Error fetching roles and permissions:', error);
      showNotification('Error loading roles and permissions. Please try again.', 'error');
    }
  };
  
  const handleRoleChange = (role) => {
    setSelectedRole(role);
    
    // Reset permissions and admin role if switching roles
    if (role === 'admin') {
      setSelectedAdminRole('contentManager');
      
      // Set default permissions based on the content manager role
      if (availableRoles.contentManager) {
        setSelectedPermissions(availableRoles.contentManager.permissions);
      }
    }
    
    setConfirmationVisible(false);
  };
  
  const handleAdminRoleChange = (role) => {
    setSelectedAdminRole(role);
    
    // Set permissions based on selected role
    if (availableRoles[role]) {
      setSelectedPermissions(availableRoles[role].permissions);
    }
  };
  
  const handlePermissionToggle = (permissionId) => {
    setSelectedPermissions(prev => {
      if (prev.includes(permissionId)) {
        return prev.filter(p => p !== permissionId);
      } else {
        return [...prev, permissionId];
      }
    });
  };
    const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    
    // Show confirmation if role is changing and dialog is not visible
    if (selectedRole !== user.userType && !confirmationVisible) {
      setConfirmationVisible(true);
      return;
    }
      try {
      setIsSaving(true);
      
      const roleData = {
        userType: selectedRole
      };
      
      // Add role-specific data with defensive copying to avoid circular references
      if (selectedRole === 'admin') {
        roleData.adminRole = selectedAdminRole;
        // Ensure permissions are just arrays/objects without DOM references
        roleData.permissions = Array.isArray(selectedPermissions) 
          ? selectedPermissions.map(p => typeof p === 'string' ? p : String(p))
          : [];
        roleData.adminPermissions = {
          canManageUsers: Boolean(adminPermissions.canManageUsers),
          canManagePlans: Boolean(adminPermissions.canManagePlans),
          canManagePartners: Boolean(adminPermissions.canManagePartners),
          canManageSettings: Boolean(adminPermissions.canManageSettings),
          canManageDeals: Boolean(adminPermissions.canManageDeals)
        };
      } else if (selectedRole === 'merchant') {
        roleData.merchantDetails = {
          businessId: String(merchantDetails.businessId || ''),
          position: String(merchantDetails.position || ''),
          canManageBusiness: Boolean(merchantDetails.canManageBusiness)
        };
      }
      
      const response = await api.post(`/admin/users/${userId}/assign-role`, roleData);
        // Update the user state with the complete updated user data
      if (response.data.user) {
        // Ensure we only store serializable data
        const cleanUser = {
          ...response.data.user,
          fullName: String(response.data.user.fullName || ''),
          email: String(response.data.user.email || ''),
          userType: String(response.data.user.userType || 'user')
        };
        setUser(cleanUser);
      }
      
      showNotification(`Role successfully updated for ${user.fullName || user.email || 'user'}.`, 'success');
      
      // Close confirmation dialog first
      setConfirmationVisible(false);
      
      // Navigate back to user management
      setTimeout(() => {
        navigateBackToAdmin('users');
      }, 1500);
      
    } catch (error) {
      console.error('Error assigning role:', error);
      const errorMessage = error.response?.data?.message || 'Failed to update user role. Please try again.';
      showNotification(errorMessage, 'error');
    } finally {
      setIsSaving(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">
        </div>
      </div>
    );
  }
  
  if (!user) {
    return (
      <div className="empty-state">
        <i className="fas fa-exclamation-triangle"></i>
        <p>Could not load user data. The user may not exist.</p>
        <button
          className="button button-primary"
          onClick={() => navigateBackToAdmin('users')}
        >
          Back to User List
        </button>
      </div>
    );
  }
  
  return (
    <div className="role-assignment">
      <div className="role-assignment-header">
        <h2>
          <i className="fas fa-user-tag"></i>
          Assign Role to User
        </h2>
        
        <button
          className="button button-secondary"
          onClick={() => navigate(`/admin/users/${userId}`)}
        >
          <i className="fas fa-arrow-left"></i> Back to User
        </button>
      </div>
      
      <div className="user-info-card">
        <div className="user-info-header">
          <h3>{user.fullName}</h3>
          <span className={`status-badge status-${user.isVerified ? 'approved' : 'pending'}`}>
            {user.isVerified ? 'Verified' : 'Pending'}
          </span>
        </div>
        
        <div className="user-info-details">
          <div className="info-group">
            <span className="info-label">Email:</span>
            <span className="info-value">{user.email}</span>
          </div>
          
          <div className="info-group">
            <span className="info-label">Current Role:</span>
            <span className="info-value role-badge">
              {user.userType === 'admin' ? 'Admin' : 
               user.userType === 'merchant' ? 'Merchant' : 'Regular User'}
            </span>
          </div>
          
          <div className="info-group">
            <span className="info-label">Registration Date:</span>
            <span className="info-value">{new Date(user.createdAt).toLocaleDateString('en-GB', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit'
            })}</span>
          </div>
          
          <div className="info-group">
            <span className="info-label">Member Since:</span>
            <span className="info-value">{new Date(user.createdAt).toLocaleDateString('en-GB', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit'
            })}</span>
          </div>
        </div>
      </div>
      
      <div className="role-assignment-form-container">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="role">Select Role *</label>
            <select
              id="role"
              value={selectedRole}
              onChange={handleRoleChange}
              required
            >
              <option value="user">Regular User</option>
              <option value="merchant">Merchant</option>
              <option value="admin">Admin</option>
            </select>
            <div className="form-description">
              {selectedRole === 'admin' ? 'Admin users have access to the admin dashboard and can manage system settings.' :
               selectedRole === 'merchant' ? 'Merchant users can manage business listings and create deals.' :
               'Regular users have standard member privileges.'}
            </div>
          </div>
          
          {/* Admin-specific settings */}
          {selectedRole === 'admin' && (
            <div className="role-specific-settings admin-settings">
              <h4>Admin Permissions</h4>
              <p>Select which areas this admin user can manage:</p>
              
              <div className="permissions-grid">
                <div className="permission-option">
                  <input
                    type="checkbox"
                    id="canManageUsers"
                    checked={adminPermissions.canManageUsers}
                    onChange={(e) => setAdminPermissions({
                      ...adminPermissions,
                      canManageUsers: e.target.checked
                    })}
                  />
                  <label htmlFor="canManageUsers">
                    <span className="permission-name">User Management</span>
                    <span className="permission-description">Can view, approve, edit, and delete users</span>
                  </label>
                </div>
                
                <div className="permission-option">
                  <input
                    type="checkbox"
                    id="canManagePlans"
                    checked={adminPermissions.canManagePlans}
                    onChange={(e) => setAdminPermissions({
                      ...adminPermissions,
                      canManagePlans: e.target.checked
                    })}
                  />
                  <label htmlFor="canManagePlans">
                    <span className="permission-name">Plan Management</span>
                    <span className="permission-description">Can manage membership plans and assign to users</span>
                  </label>
                </div>
                
                <div className="permission-option">
                  <input
                    type="checkbox"
                    id="canManagePartners"
                    checked={adminPermissions.canManagePartners}
                    onChange={(e) => setAdminPermissions({
                      ...adminPermissions,
                      canManagePartners: e.target.checked
                    })}
                  />
                  <label htmlFor="canManagePartners">
                    <span className="permission-name">Partner Management</span>
                    <span className="permission-description">Can manage business partners and listings</span>
                  </label>
                </div>
                
                <div className="permission-option">
                  <input
                    type="checkbox"
                    id="canManageSettings"
                    checked={adminPermissions.canManageSettings}
                    onChange={(e) => setAdminPermissions({
                      ...adminPermissions,
                      canManageSettings: e.target.checked
                    })}
                  />
                  <label htmlFor="canManageSettings">
                    <span className="permission-name">System Settings</span>
                    <span className="permission-description">Can modify system configuration and settings</span>
                  </label>
                </div>
                
                <div className="permission-option">
                  <input
                    type="checkbox"
                    id="canManageDeals"
                    checked={adminPermissions.canManageDeals}
                    onChange={(e) => setAdminPermissions({
                      ...adminPermissions,
                      canManageDeals: e.target.checked
                    })}
                  />
                  <label htmlFor="canManageDeals">
                    <span className="permission-name">Deal Management</span>
                    <span className="permission-description">Can manage deals and promotions</span>
                  </label>
                </div>
              </div>
              
              <div className="form-description admin-note">
                <i className="fas fa-info-circle"></i>
                <span>Note: Super admins with all permissions can create and manage other admin users.</span>
              </div>
            </div>
          )}
          
          {/* Merchant-specific settings */}
          {selectedRole === 'merchant' && (
            <div className="role-specific-settings merchant-settings">
              <h4>Merchant Details</h4>
              
              <div className="form-group">
                <label htmlFor="businessId">Associated Business *</label>
                <select
                  id="businessId"
                  value={merchantDetails.businessId}
                  onChange={(e) => setMerchantDetails({
                    ...merchantDetails,
                    businessId: e.target.value
                  })}
                  required={selectedRole === 'merchant'}
                >
                  <option value="">-- Select a business --</option>
                  {businesses.map(business => (
                    <option key={business._id} value={business._id}>
                      {business.businessName}
                    </option>
                  ))}
                </select>
                <div className="form-description">
                  Select which business this merchant account is associated with
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="position">Position in Business</label>
                <input
                  type="text"
                  id="position"
                  value={merchantDetails.position}
                  onChange={(e) => setMerchantDetails({
                    ...merchantDetails,
                    position: e.target.value
                  })}
                  placeholder="e.g., Owner, Manager, etc."
                />
              </div>
              
              <div className="permission-option">
                <input
                  type="checkbox"
                  id="canManageBusiness"
                  checked={merchantDetails.canManageBusiness}
                  onChange={(e) => setMerchantDetails({
                    ...merchantDetails,
                    canManageBusiness: e.target.checked
                  })}
                />
                <label htmlFor="canManageBusiness">
                  <span className="permission-name">Can Manage Business</span>
                  <span className="permission-description">Can edit business profile and create deals</span>
                </label>
              </div>
              
              <div className="form-description merchant-note">
                <i className="fas fa-info-circle"></i>
                <span>Note: Merchant accounts will have access to the merchant dashboard.</span>
              </div>
            </div>
          )}
          
          <div className="form-actions">
            <button
              type="button"
              className="button button-secondary"
              onClick={() => navigate(`/admin/users/${userId}`)}
            >
              Cancel
            </button>
            
            <button
              type="submit"
              className="button button-primary"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i> Saving...
                </>
              ) : (
                <>
                  <i className="fas fa-check"></i> Assign Role
                </>
              )}
            </button>
          </div>
        </form>
      </div>
      
      {confirmationVisible && (
        <div className="modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Confirm Role Change</h3>
              <button 
                className="close-button" 
                onClick={() => setConfirmationVisible(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="modal-body">
              <div className="role-change-alert">
                <i className="fas fa-exclamation-triangle"></i>
                <div>
                  <p>
                    You are about to change this user's role from <strong>
                      {user.userType === 'admin' ? 'Admin' : 
                       user.userType === 'merchant' ? 'Merchant' : 'Regular User'}
                    </strong> to <strong>
                      {selectedRole === 'admin' ? 'Admin' : 
                       selectedRole === 'merchant' ? 'Merchant' : 'Regular User'}
                    </strong>.
                  </p>
                  <p>This will change the user's permissions and access level.</p>
                </div>
              </div>
              
              {(user.userType === 'admin' && selectedRole !== 'admin') && (
                <div className="warning-message">
                  <p>
                    <strong>Warning:</strong> This user will lose all admin privileges and access to the admin dashboard.
                  </p>
                </div>
              )}
              
              {(user.userType === 'merchant' && selectedRole !== 'merchant') && (
                <div className="warning-message">
                  <p>
                    <strong>Warning:</strong> This user will lose all merchant privileges and access to the merchant dashboard.
                  </p>
                </div>
              )}
            </div>
              <div className="modal-footer">
              <button 
                className="button button-secondary"
                onClick={() => setConfirmationVisible(false)}
              >
                Cancel
              </button>
              
              <button 
                className="button button-primary"
                onClick={() => handleSubmit()}
                disabled={isSaving}
              >
                {isSaving ? 'Processing...' : 'Confirm Change'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleAssignment;
