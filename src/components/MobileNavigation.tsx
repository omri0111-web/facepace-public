import React, { useState } from 'react';
import { Menu, X, Users, History, Settings } from 'lucide-react';
import { Button } from './ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet';

interface MobileNavigationProps {
  onPeopleClick: () => void;
  onGroupsClick: () => void;
  onRecordsClick: () => void;
  showRecords: boolean;
  selectedGroup?: {
    id: string;
    name: string;
  } | null;
}

export function MobileNavigation({
  onPeopleClick,
  onGroupsClick,
  onRecordsClick,
  showRecords,
  selectedGroup
}: MobileNavigationProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleMenuClick = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  return (
    <>
      {/* Hamburger Menu Button */}
      <div className="absolute top-4 left-4 z-30 md:top-6 md:left-6">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="h-10 w-10 p-0 bg-black/60 backdrop-blur-md border-white/30 text-white hover:bg-black/80 rounded-full shadow-lg"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent 
            side="left" 
            className="w-80 bg-black/95 backdrop-blur-xl border-white/20 text-white p-0"
          >
            <SheetHeader className="px-6 py-6 border-b border-white/20">
              <SheetTitle className="text-white text-left">Smart Attendance</SheetTitle>
              <div className="text-sm text-white/70 text-left">
                {selectedGroup ? `Group: ${selectedGroup.name}` : 'Face Recognition System'}
              </div>
            </SheetHeader>
            
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
          </SheetContent>
        </Sheet>
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
    </>
  );
}