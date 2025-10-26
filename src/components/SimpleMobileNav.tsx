import React, { useState } from 'react';
import { Menu, X, Users, History } from 'lucide-react';
import { Button } from './ui/button';

interface SimpleMobileNavProps {
  onPeopleClick: () => void;
  onGroupsClick: () => void;
  onRecordsClick: () => void;
  showRecords: boolean;
  selectedGroup?: {
    id: string;
    name: string;
  } | null;
}

export function SimpleMobileNav({
  onPeopleClick,
  onGroupsClick,
  onRecordsClick,
  showRecords,
  selectedGroup
}: SimpleMobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleMenuClick = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  return (
    <>
      {/* Hamburger Menu Button */}
      <div className="absolute top-4 left-4 z-30 md:top-6 md:left-6">
        <Button
          size="sm"
          variant="outline"
          className="h-10 w-10 p-0 bg-black/60 backdrop-blur-md border-white/30 text-white hover:bg-black/80 rounded-full shadow-lg"
          onClick={() => setIsOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Status Indicator */}
      <div className="absolute top-4 right-4 z-20 md:top-6 md:right-6">
        <div className="bg-black/60 backdrop-blur-md rounded-full px-3 py-1.5 border border-white/30 shadow-lg">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-white text-xs">Live</span>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
          <div className="fixed left-0 top-0 h-full w-80 bg-black/95 backdrop-blur-xl border-r border-white/20">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-6 border-b border-white/20">
              <div>
                <h3 className="text-white text-lg font-medium">Smart Attendance</h3>
                <div className="text-sm text-white/70">
                  {selectedGroup ? `Group: ${selectedGroup.name}` : 'Face Recognition System'}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/10"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            {/* Menu Items */}
            <div className="px-6 py-4 space-y-3">
              <Button
                variant="ghost"
                className="w-full justify-start h-12 text-white hover:bg-white/10 rounded-lg"
                onClick={() => handleMenuClick(onPeopleClick)}
              >
                <Users className="mr-3 h-5 w-5" />
                People Management
              </Button>
              
              <Button
                variant="ghost"
                className="w-full justify-start h-12 text-white hover:bg-white/10 rounded-lg"
                onClick={() => handleMenuClick(onGroupsClick)}
              >
                <Users className="mr-3 h-5 w-5" />
                Groups & Sessions
              </Button>
              
              <Button
                variant="ghost"
                className="w-full justify-start h-12 text-white hover:bg-white/10 rounded-lg"
                onClick={() => handleMenuClick(onRecordsClick)}
              >
                <History className="mr-3 h-5 w-5" />
                {showRecords ? 'Hide Records' : 'View Records'}
              </Button>
            </div>
          </div>
          
          {/* Close overlay on click outside */}
          <div 
            className="absolute inset-0 -z-10" 
            onClick={() => setIsOpen(false)}
          />
        </div>
      )}
    </>
  );
}