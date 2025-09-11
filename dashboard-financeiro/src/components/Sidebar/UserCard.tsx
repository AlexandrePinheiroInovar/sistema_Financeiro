import React, { useState, useRef, useEffect } from 'react';

interface UserCardProps {
  isCollapsed?: boolean;
}

interface DropdownOption {
  id: string;
  label: string;
  icon: string;
}

const dropdownOptions: DropdownOption[] = [
  { id: 'profile', label: 'Perfil', icon: '👤' },
  { id: 'change-password', label: 'Trocar Senha', icon: '🔒' },
  { id: 'logout', label: 'Sair', icon: '🚪' }
];

export const UserCard: React.FC<UserCardProps> = ({ isCollapsed = false }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Mock user data - replace with actual user context/props
  const user = {
    name: 'Alexandre Pereira',
    email: 'alexandre@example.com',
    initials: 'AP'
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDropdownClick = (optionId: string) => {
    console.log(`Clicked: ${optionId}`);
    setIsDropdownOpen(false);
    
    switch (optionId) {
      case 'profile':
        // Navigate to profile page
        break;
      case 'change-password':
        // Open change password modal
        break;
      case 'logout':
        // Handle logout
        break;
      default:
        break;
    }
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  return (
    <div className="user-card-container" ref={dropdownRef}>
      {isDropdownOpen && (
        <div className="user-dropdown">
          {dropdownOptions.map((option) => (
            <button
              key={option.id}
              className="dropdown-item"
              onClick={() => handleDropdownClick(option.id)}
            >
              <span className="dropdown-icon">{option.icon}</span>
              <span className="dropdown-text">{option.label}</span>
            </button>
          ))}
        </div>
      )}
      
      <div className="user-card" onClick={toggleDropdown}>
        <div className="user-avatar">
          <span className="user-initials">{user.initials}</span>
        </div>
        
        {!isCollapsed && (
          <div className="user-info">
            <div className="user-name">{user.name}</div>
            <div className="user-email">{user.email}</div>
          </div>
        )}
        
        {!isCollapsed && (
          <div className="user-chevron">
            {isDropdownOpen ? '▲' : '▼'}
          </div>
        )}
      </div>
    </div>
  );
};