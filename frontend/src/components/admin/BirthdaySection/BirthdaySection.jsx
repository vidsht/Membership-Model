import React, { useState, useEffect } from 'react';
import { useNotification } from '../../../contexts/NotificationContext';
import api from '../../../services/api';
import './BirthdaySection.css';

const BirthdaySection = () => {
  const [birthdays, setBirthdays] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('10'); // Default to 10 days
  const { showNotification } = useNotification();

  const filterOptions = [
    { value: '1', label: 'Today' },
    { value: '2', label: 'Next 2 days' },
    { value: '5', label: 'Next 5 days' },
    { value: '10', label: 'Next 10 days' },
    { value: '30', label: 'Next 30 days' }
  ];

  useEffect(() => {
    fetchBirthdays();
  }, [filter]);

  const fetchBirthdays = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/admin/users/birthdays?days=${filter}`);
      if (response.data.success) {
        setBirthdays(response.data.birthdays);
      } else {
        showNotification('Failed to fetch birthdays', 'error');
      }
    } catch (error) {
      console.error('Error fetching birthdays:', error);
      showNotification('Error fetching birthdays', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const birthday = new Date(today.getFullYear(), date.getMonth(), date.getDate());
    
    // If birthday has passed this year, show next year's birthday
    if (birthday < today) {
      birthday.setFullYear(today.getFullYear() + 1);
    }
    
    const diffTime = birthday.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Tomorrow';
    } else {
      return `In ${diffDays} days`;
    }
  };

  const calculateAge = (birthDate) => {
    const today = new Date();
    const birth = new Date(birthDate);
    const age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      return age - 1;
    }
    return age;
  };

  return (
    <div className="birthday-section">
      <div className="birthday-header">
        <h2>
          <i className="fas fa-birthday-cake"></i>
          Upcoming Birthdays
        </h2>
        <div className="birthday-filters">
          <label htmlFor="dayFilter">Filter by:</label>
          <select
            id="dayFilter"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="filter-select"
          >
            {filterOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="birthday-stats">
        <div className="stat-card">
          <div className="stat-number">{birthdays.length}</div>
          <div className="stat-label">
            {filter === '1' ? 'Today' : `Next ${filter} days`}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading birthdays...</p>
        </div>
      ) : (
        <div className="birthday-list">
          {birthdays.length === 0 ? (
            <div className="no-birthdays">
              <i className="fas fa-calendar-times"></i>
              <p>No birthdays in the selected period</p>
            </div>
          ) : (
            <div className="birthday-cards">
              {birthdays.map((user) => (
                <div key={user.id} className="birthday-card">
                  <div className="birthday-card-header">
                    <div className="user-avatar">
                      {user.profilePicture ? (
                        <img src={user.profilePicture} alt={user.fullName} />
                      ) : (
                        <div className="avatar-placeholder">
                          {user.fullName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="user-info">
                      <h4>{user.fullName}</h4>
                      <p className="user-email">{user.email}</p>
                      <p className="user-type">
                        <i className={`fas ${user.userType === 'merchant' ? 'fa-store' : 'fa-user'}`}></i>
                        {user.userType === 'merchant' ? 'Business Partner' : 'Member'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="birthday-info">
                    <div className="birthday-date">
                      <i className="fas fa-calendar-alt"></i>
                      <span>
                        {new Date(user.birthDate).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                    <div className="birthday-countdown">
                      <i className="fas fa-clock"></i>
                      <span>{formatDate(user.birthDate)}</span>
                    </div>
                    <div className="birthday-age">
                      <i className="fas fa-gift"></i>
                      <span>Turning {calculateAge(user.birthDate) + 1}</span>
                    </div>
                  </div>

                  {user.phoneNumber && (
                    <div className="contact-info">
                      <a href={`tel:${user.phoneNumber}`} className="contact-btn">
                        <i className="fas fa-phone"></i>
                        Call
                      </a>
                      <a href={`mailto:${user.email}`} className="contact-btn">
                        <i className="fas fa-envelope"></i>
                        Email
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BirthdaySection;