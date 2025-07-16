import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../../../contexts/NotificationContext';
import api from '../../../services/api';
import './RoleManagement.css';

/**
 * RoleManagement component for managing admin roles and permissions
 * @returns {React.ReactElement} The role management component
 */
const RoleManagement = () => {
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const [isLoading, setIsLoading] = useState(true);
  const [roles, setRoles] = useState({});
  const [permissions, setPermissions] = useState([]);
  const [adminUsers, setAdminUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('roles');
  
  useEffect(() => {
    fetchData();
  }, []);
  
  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      const [rolesResponse, permissionsResponse, adminsResponse] = await Promise.all([
        api.get('/admin/roles'),
        api.get('/admin/roles/permissions'),
        api.get('/admin/users?filter=admin')
      ]);
      
      setRoles(rolesResponse.data.roles);
      setPermissions(permissionsResponse.data.permissions);
      setAdminUsers(adminsResponse.data.users || []);
    } catch (error) {
      console.error('Error fetching role data:', error);
      showNotification('Error loading role data. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">
          <i className="fas fa-spinner fa-spin"></i>
          <p>Loading role management data...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="role-management-container">
      <div className="page-header">
        <h1>Role Management</h1>
      </div>
      
      <div className="role-tabs">
        <button 
          className={activeTab === 'roles' ? 'active' : ''} 
          onClick={() => setActiveTab('roles')}
        >
          Admin Roles
        </button>
        <button 
          className={activeTab === 'permissions' ? 'active' : ''} 
          onClick={() => setActiveTab('permissions')}
        >
          Permissions
        </button>
        <button 
          className={activeTab === 'users' ? 'active' : ''} 
          onClick={() => setActiveTab('users')}
        >
          Admin Users
        </button>
      </div>
      
      {activeTab === 'roles' && (
        <div className="roles-section">
          <p className="section-description">
            The system has the following predefined admin roles with different permissions.
          </p>
          
          <div className="role-cards">
            {Object.entries(roles).map(([key, role]) => (
              <div key={key} className="role-detail-card">
                <div className="role-header">
                  <div className="role-icon">
                    <i className={
                      key === 'superAdmin' ? 'fas fa-crown' : 
                      key === 'userManager' ? 'fas fa-users-cog' :
                      key === 'contentManager' ? 'fas fa-edit' :
                      'fas fa-chart-line'
                    }></i>
                  </div>
                  <h2>{
                    key === 'superAdmin' ? 'Super Admin' : 
                    key === 'userManager' ? 'User Manager' :
                    key === 'contentManager' ? 'Content Manager' :
                    'Analyst'
                  }</h2>
                </div>
                <p className="role-description">{role.description}</p>
                
                <div className="role-permissions">
                  <h3>Permissions:</h3>
                  <ul>
                    {role.permissions.map(perm => {
                      const permInfo = permissions.find(p => p.id === perm);
                      return (
                        <li key={perm}>
                          <i className="fas fa-check-circle"></i>
                          <span>{permInfo?.name || perm}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {activeTab === 'permissions' && (
        <div className="permissions-section">
          <p className="section-description">
            These are the available permissions that can be assigned to admin users.
          </p>
          
          <div className="permissions-list">
            {permissions.map(permission => (
              <div key={permission.id} className="permission-card">
                <div className="permission-header">
                  <h3>{permission.name}</h3>
                  <span className="permission-id">{permission.id}</span>
                </div>
                <p className="permission-description">{permission.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {activeTab === 'users' && (
        <div className="admin-users-section">
          <p className="section-description">
            These users have admin privileges in the system.
          </p>
          
          <div className="admin-users-header">
            <h2>Admin Users</h2>
          </div>
          
          <table className="admin-users-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Admin Role</th>
                <th>Join Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {adminUsers.map(user => (
                <tr key={user._id}>
                  <td>{user.fullName}</td>
                  <td>{user.email}</td>
                  <td>
                    <span className={`role-badge ${user.adminRole || 'contentManager'}`}>
                      {user.adminRole === 'superAdmin' ? 'Super Admin' : 
                       user.adminRole === 'userManager' ? 'User Manager' :
                       user.adminRole === 'contentManager' ? 'Content Manager' :
                       user.adminRole === 'analyst' ? 'Analyst' : 'Content Manager'}
                    </span>
                  </td>
                  <td>{new Date(user.created_at).toLocaleDateString()}</td>
                  <td>
                    <button 
                      className="btn-link" 
                      onClick={() => navigate(`/admin/users/${user._id}/assign-role`)}
                    >
                      <i className="fas fa-edit"></i> Edit Role
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default RoleManagement;
