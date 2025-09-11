import React, { useState, useEffect } from 'react';
import { Sidebar } from '../Sidebar/Sidebar';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
      // Auto-collapse sidebar on mobile
      if (window.innerWidth < 768) {
        setSidebarCollapsed(true);
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const handleSidebarToggle = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div className="app-layout">
      <Sidebar 
        isCollapsed={sidebarCollapsed} 
        onToggle={handleSidebarToggle} 
      />
      
      <div className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        {children}
      </div>
      
      {/* Mobile overlay */}
      {isMobile && !sidebarCollapsed && (
        <div 
          className="sidebar-overlay" 
          onClick={() => setSidebarCollapsed(true)}
        />
      )}
    </div>
  );
};