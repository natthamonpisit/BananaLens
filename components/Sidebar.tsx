import React from 'react';
import { ViewMode } from '../types';

interface SidebarProps {
  currentView: ViewMode;
  setView: (view: ViewMode) => void;
  isOpen: boolean;       // Mobile state
  toggleOpen: () => void; // Mobile toggle
  isCollapsed: boolean;  // Desktop state
  toggleCollapse: () => void; // Desktop toggle
}

const Sidebar: React.FC<SidebarProps> = ({ 
  currentView, 
  setView, 
  isOpen, 
  toggleOpen,
  isCollapsed,
  toggleCollapse
}) => {
  
  const menuItems = [
    { id: ViewMode.COLLECTION, label: 'My Collection', icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
    )},
    { id: ViewMode.IMPORT, label: 'Import', icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
    )},
    { id: ViewMode.EXPORT, label: 'Export', icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
    )},
  ];

  return (
    <>
      {/* Mobile Toggle / Desktop Expand Button */}
      <button 
        onClick={() => {
            if (window.innerWidth >= 768) {
                toggleCollapse();
            } else {
                toggleOpen();
            }
        }}
        className={`fixed top-4 left-4 z-50 p-2 bg-dark-surface rounded-full shadow-lg text-white border border-dark-border hover:bg-banana-500 hover:border-banana-500 transition-colors
            ${/* Show on mobile OR if desktop is collapsed */ ''}
            ${!isOpen && !isCollapsed ? 'md:hidden' : ''}
        `}
        title="Toggle Menu"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
      </button>

      {/* Sidebar Container */}
      <div className={`fixed top-0 left-0 h-full bg-dark-surface border-r border-dark-border w-64 transform transition-transform duration-300 ease-in-out z-40 
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
        ${isCollapsed ? 'md:-translate-x-full' : 'md:translate-x-0'}
      `}>
        <div className="p-6 relative">
          {/* Desktop Collapse Button */}
          <button 
            onClick={toggleCollapse}
            className="absolute top-6 right-4 text-gray-400 hover:text-white hidden md:block"
            title="Collapse Sidebar"
          >
             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>

          <h1 
            className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-banana-400 to-banana-600 mb-8 cursor-pointer pr-8"
            onClick={() => setView(ViewMode.HOME)}
          >
            BananaLens
          </h1>
          
          <nav className="space-y-2">
            <button
               onClick={() => setView(ViewMode.HOME)}
               className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${currentView === ViewMode.HOME ? 'bg-banana-500 text-white' : 'text-gray-400 hover:bg-dark-border'}`}
            >
               <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
               <span>Home</span>
            </button>

            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setView(item.id as ViewMode)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${currentView === item.id ? 'bg-banana-500 text-white' : 'text-gray-400 hover:bg-dark-border'}`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>
    </>
  );
};

export default Sidebar;