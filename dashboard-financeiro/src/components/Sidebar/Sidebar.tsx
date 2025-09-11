import React, { useState } from 'react';
import { UserCard } from './UserCard';
import goLogo from '../../GO-removebg-preview-2-300x252.png';

interface SidebarItem {
  id: string;
  name: string;
  icon: string;
  isActive?: boolean;
}

interface SidebarProps {
  isCollapsed?: boolean;
  onToggle?: () => void;
}

const sidebarItems: SidebarItem[] = [
  { id: 'dashboard', name: 'Dashboard', icon: '📊', isActive: true }
];

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed = false, onToggle }) => {
  const [activeItem, setActiveItem] = useState('dashboard');

  const handleItemClick = (itemId: string) => {
    setActiveItem(itemId);
  };

  return (
    <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <img src={goLogo} alt="GO Logo" className="logo-image" />
          {!isCollapsed && (
            <div className="logo-text-container">
              <span className="logo-text">Dashboard Financeiro</span>
              <span className="logo-subtitle">Gestão de Resultados</span>
            </div>
          )}
        </div>
        <button className="sidebar-toggle" onClick={onToggle}>
          {isCollapsed ? '»' : '«'}
        </button>
      </div>

      <nav className="sidebar-nav">
        {sidebarItems.map((item) => (
          <button
            key={item.id}
            className={`sidebar-item ${activeItem === item.id ? 'active' : ''}`}
            onClick={() => handleItemClick(item.id)}
            title={isCollapsed ? item.name : ''}
          >
            <span className="sidebar-item-icon">{item.icon}</span>
            {!isCollapsed && <span className="sidebar-item-text">{item.name}</span>}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <UserCard isCollapsed={isCollapsed} />
      </div>
    </div>
  );
};