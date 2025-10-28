import React, { useState, useEffect } from "react";
import { PeoplePanel } from "./components/PeoplePanel";
import { GroupsPanel } from "./components/GroupsPanel";
import { AdminPanel } from "./components/AdminPanel";
import { RealFaceCameraView } from "./components/RealFaceCameraView";
import { FaceEnrollmentModal } from "./components/FaceEnrollmentModal";
import { FaceRecognitionInitializer } from "./components/FaceRecognitionInitializer";
import { DebugPanel } from "./components/DebugPanel";
import { CelebrationAnimation } from "./components/CelebrationAnimation";
import { backendRecognitionService } from "./services/BackendRecognitionService";
import { VideoTestPage } from "./components/VideoTestPage";
import { logger } from "./utils/logger";

export interface AttendanceRecordType {
  id: string;
  timestamp: Date;
  detectedCount: number;
  totalCapacity: number;
  groupName: string;
  guideName?: string; // Which guide recorded this
  location?: string; // Where the attendance was taken
  activity?: string; // What activity was being attended
  // IDs automatically detected by the recognizer when the session finished
  autoDetectedIds?: string[];
  security?: {
    transportStatus:
      | "bus"
      | "walking"
      | "parent_pickup"
      | "other";
    destination?: string;
    estimatedReturn?: Date;
    emergencyContacts?: string[];
  };
  manualAttendance?: {
    [personId: string]: "present" | "absent";
  };
  finalPresentCount: number;
}

export interface Person {
  id: string;
  name: string;
  email: string;
  ageGroup: string; // e.g., "6th Grade", "7th Grade"
  guides: string[]; // Array of guide names assigned to this scout
  age: number;
  parentName: string;
  parentPhone: string;
  allergies: string[]; // Array of allergies
  lastSeen?: Date;
  status: "present" | "absent" | "unknown";
  avatar?: string;
  photoPaths?: string[]; // Array of photo filenames stored in backend
  groups: string[]; // Array of group IDs this person belongs to
}

export interface Group {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  capacity: number;
  isActive: boolean;
  lastSession?: Date;
  members: string[]; // Array of person IDs in this group
  guideId?: string; // ID of the person who is the guide for this group
  subGroups?: string[]; // Array of nested group IDs
  joinLink?: string; // Shareable link for joining
  parentGroup?: string; // Parent group ID if this is a subgroup
}

// Welcome Screen Component
function WelcomeScreen({
  onNavigate,
  hasLastGroup,
}: {
  onNavigate: (screen: string) => void;
  hasLastGroup: boolean;
}) {
  const [dragStart, setDragStart] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  return (
    <div className="min-h-screen flex flex-col items-center p-6 relative overflow-hidden bg-gradient-to-br from-gray-800 via-gray-700 to-gray-900">
      {/* Clean gradient background - no overlay needed */}

      {/* Header */}
      <div className="text-center mb-8 z-10">
        <div className="mb-6"></div>
        <h1 className="text-white mb-2 text-4xl tracking-wide drop-shadow-lg">
          FacePace
        </h1>
      </div>

      {/* Main Options - Centered in available space */}
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-sm space-y-4 z-10">
          {/* Other Options */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => onNavigate("people")}
              className="bg-white/15 backdrop-blur-md border border-white/30 rounded-2xl p-4 hover:bg-white/25 transition-all duration-300 active:scale-95 shadow-xl"
            >
              <div className="text-center">
                <div className="text-white text-2xl mb-3">
                  👥
                </div>
                <div className="text-white font-medium text-sm">
                  People
                </div>
                <div className="text-white/70 text-xs">
                  Manage scouts
                </div>
              </div>
            </button>

            <button
              onClick={() => onNavigate("groups")}
              className="bg-white/15 backdrop-blur-md border border-white/30 rounded-2xl p-4 hover:bg-white/25 transition-all duration-300 active:scale-95 shadow-xl"
            >
              <div className="text-center">
                <div className="text-white text-2xl mb-3">
                  👨‍👩‍👧‍👦
                </div>
                <div className="text-white font-medium text-sm">
                  Groups
                </div>
                <div className="text-white/70 text-xs">
                  Manage patrols
                </div>
              </div>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => onNavigate("records")}
              className="bg-white/15 backdrop-blur-md border border-white/30 rounded-2xl p-4 hover:bg-white/25 transition-all duration-300 active:scale-95 shadow-xl"
            >
              <div className="text-center">
                <div className="text-white text-2xl mb-3">
                  📊
                </div>
                <div className="text-white font-medium text-sm">
                  Records
                </div>
                <div className="text-white/70 text-xs">
                  View history
                </div>
              </div>
            </button>

            <button
              onClick={() => onNavigate("admin")}
              className="bg-white/15 backdrop-blur-md border border-white/30 rounded-2xl p-4 hover:bg-white/25 transition-all duration-300 active:scale-95 shadow-xl"
            >
              <div className="text-center">
                <div className="text-white text-2xl mb-3">
                  🛡️
                </div>
                <div className="text-white font-medium text-sm">
                  Admin
                </div>
                <div className="text-white/70 text-xs">
                  Control center
                </div>
              </div>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <button
              onClick={() => onNavigate("test")}
              className="bg-blue-600/80 backdrop-blur-md border border-blue-400/50 rounded-2xl p-4 hover:bg-blue-600/90 transition-all duration-300 active:scale-95 shadow-xl"
            >
              <div className="text-center">
                <div className="text-white text-2xl mb-3">
                  🧪
                </div>
                <div className="text-white font-medium text-sm">
                  Video Test
                </div>
                <div className="text-white/70 text-xs">
                  Test recognition accuracy
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Record Button Section - Like Camera Screen */}
      <div className="w-full z-10 pb-8">
        <div className="w-full max-w-sm mx-auto">
          {/* Record Attendance Label */}
          <div className="text-center mb-4">
            <div className="text-white font-medium text-lg mb-1">
              Record Attendance
            </div>
            <div className="text-white/70 text-sm">
              {hasLastGroup
                ? "Tap to choose • Drag right for last"
                : "Choose group to record"}
            </div>
          </div>

          {/* iPhone Style Camera Button */}
          <div className="flex justify-center">
            <button
              onClick={(e) => {
                // Only navigate if not dragging
                if (!isDragging && dragOffset === 0) {
                  onNavigate("groupSelect");
                }
              }}
              onTouchStart={(e) => {
                const touch = e.touches[0];
                setDragStart({
                  x: touch.clientX,
                  y: touch.clientY,
                });
                setDragOffset(0);
                setIsDragging(false);
                e.preventDefault(); // Prevent default touch behavior
              }}
              onTouchMove={(e) => {
                if (!dragStart) return;

                const touch = e.touches[0];
                const deltaX = touch.clientX - dragStart.x;
                const deltaY = touch.clientY - dragStart.y;

                // Strict horizontal drag detection - must be mostly horizontal
                if (
                  Math.abs(deltaX) > 10 &&
                  Math.abs(deltaX) > Math.abs(deltaY) * 1.5
                ) {
                  setIsDragging(true);
                  setDragOffset(
                    Math.min(120, Math.max(0, deltaX)),
                  ); // Only positive (right) movement
                  e.preventDefault(); // Prevent scrolling when dragging
                }
              }}
              onTouchEnd={(e) => {
                if (!dragStart) return;

                // Lower threshold for trigger - 60px instead of 100px
                if (dragOffset > 60 && hasLastGroup) {
                  e.preventDefault(); // Prevent click event
                  onNavigate("camera");
                } else if (isDragging) {
                  // Prevent click if we were dragging but didn't trigger
                  e.preventDefault();
                }

                // Reset drag state
                setDragStart(null);
                setDragOffset(0);
                setIsDragging(false);
              }}
              onMouseDown={(e) => {
                setDragStart({ x: e.clientX, y: e.clientY });
                setDragOffset(0);
                setIsDragging(false);
                e.preventDefault(); // Prevent text selection
              }}
              onMouseMove={(e) => {
                if (!dragStart) return;

                const deltaX = e.clientX - dragStart.x;
                const deltaY = e.clientY - dragStart.y;

                // Strict horizontal drag detection for mouse too
                if (
                  Math.abs(deltaX) > 10 &&
                  Math.abs(deltaX) > Math.abs(deltaY) * 1.5
                ) {
                  setIsDragging(true);
                  setDragOffset(
                    Math.min(120, Math.max(0, deltaX)),
                  ); // Only positive (right) movement
                  e.preventDefault();
                }
              }}
              onMouseUp={(e) => {
                if (!dragStart) return;

                // Lower threshold for trigger
                if (dragOffset > 60 && hasLastGroup) {
                  e.preventDefault(); // Prevent click event
                  onNavigate("camera");
                } else if (isDragging) {
                  // Prevent click if we were dragging but didn't trigger
                  e.preventDefault();
                }

                // Reset drag state
                setDragStart(null);
                setDragOffset(0);
                setIsDragging(false);
              }}
              onMouseLeave={() => {
                // Reset drag state if mouse leaves the button while dragging
                if (dragStart) {
                  setDragStart(null);
                  setDragOffset(0);
                  setIsDragging(false);
                }
              }}
              className={`relative w-20 h-20 bg-white/20 backdrop-blur-md rounded-full border-4 border-white shadow-2xl transition-all duration-200 hover:bg-white/30 ${
                isDragging && dragOffset > 30
                  ? "bg-green-500/30 border-green-400 scale-105"
                  : ""
              } ${isDragging ? "cursor-grabbing" : "cursor-pointer"}`}
              style={{
                transform: `translateX(${dragOffset}px) translateY(0)`,
                willChange: isDragging ? "transform" : "auto",
                transition: isDragging
                  ? "none"
                  : "transform 0.3s ease-out, background-color 0.3s ease-out, border-color 0.3s ease-out, box-shadow 0.3s ease-out",
              }}
            >
              <div
                className={`absolute inset-3 rounded-full transition-all duration-300 ${
                  isDragging && dragOffset > 30
                    ? "bg-green-500"
                    : "bg-red-500"
                }`}
              ></div>

              {/* Drag indicator arrow when dragging */}
              {isDragging && dragOffset > 20 && (
                <div className="absolute -right-8 top-1/2 transform -translate-y-1/2 text-white/80 text-xl animate-pulse">
                  →
                </div>
              )}
            </button>
          </div>

          {/* Drag instruction when dragging */}
          {isDragging && (
            <div className="text-center mt-3">
              <div
                className={`text-sm transition-colors font-medium ${
                  dragOffset > 60 && hasLastGroup
                    ? "text-green-200 animate-pulse"
                    : dragOffset > 30 && hasLastGroup
                      ? "text-yellow-200"
                      : "text-white/70"
                }`}
              >
                {dragOffset > 60 && hasLastGroup
                  ? "✨ Release to record!"
                  : dragOffset > 30 && hasLastGroup
                    ? "Keep dragging right..."
                    : "Drag right for last group"}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Group Selection Screen Component
function GroupSelectionScreen({
  groups,
  onSelectGroup,
  onCreateNew,
  onBack,
}: {
  groups: Group[];
  onSelectGroup: (groupId: string) => void;
  onCreateNew: () => void;
  onBack: () => void;
}) {
  const activeGroups = groups.filter((group) => group.isActive);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-800 via-gray-700 to-gray-900 flex flex-col p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 pt-8">
        <button
          onClick={onBack}
          className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full border border-white/30 flex items-center justify-center text-white hover:bg-white/30 transition-all duration-200 active:scale-95"
        >
          ←
        </button>
        <div className="text-center">
          <h2 className="text-white text-xl font-medium">
            Choose Patrol
          </h2>
          <p className="text-white/70 text-sm">
            Select which group to record
          </p>
        </div>
        <div className="w-10"></div>
      </div>

      {/* Create New Group Option */}
      <button
        onClick={onCreateNew}
        className="w-full bg-green-500/20 backdrop-blur-md border border-green-400/40 rounded-2xl p-4 mb-6 hover:bg-green-500/30 transition-all duration-300 active:scale-95 shadow-xl"
      >
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-green-500/80 rounded-full flex items-center justify-center">
            <span className="text-white text-xl">+</span>
          </div>
          <div className="flex-1 text-left">
            <div className="text-white font-medium">
              Create New Group
            </div>
            <div className="text-white/70 text-sm">
              Set up a new patrol for recording
            </div>
          </div>
        </div>
      </button>

      {/* Existing Groups */}
      <div className="flex-1 space-y-3">
        <div className="text-white/80 font-medium mb-4">
          Available Patrols
        </div>
        {activeGroups.map((group) => (
          <button
            key={group.id}
            onClick={() => onSelectGroup(group.id)}
            className="w-full bg-white/15 backdrop-blur-md border border-white/30 rounded-2xl p-4 hover:bg-white/25 transition-all duration-300 active:scale-95 shadow-xl group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-blue-500/80 rounded-full flex items-center justify-center group-hover:bg-blue-500 transition-colors">
                  <span className="text-white text-lg">🏕️</span>
                </div>
                <div className="text-left">
                  <div className="text-white font-medium">
                    {group.name}
                  </div>
                  <div className="text-white/70 text-sm">
                    {group.members.length} scouts
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-white/50 text-xl">▶</div>
                {group.lastSession && (
                  <div className="text-white/50 text-xs mt-1">
                    {group.lastSession.toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                )}
              </div>
            </div>
          </button>
        ))}

        {activeGroups.length === 0 && (
          <div className="text-center py-12">
            <div className="text-white/50 text-4xl mb-4">
              🏕️
            </div>
            <div className="text-white/70">
              No active patrols found
            </div>
            <div className="text-white/50 text-sm">
              Create a new group to get started
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Real Face Recognition Camera
function RealFaceCamera({
  onFaceCountChange,
  selectedGroup,
  people,
  isRecording,
  onRecognizedIdsChange,
}: {
  onFaceCountChange: (detected: number, total: number) => void;
  selectedGroup: Group | undefined;
  people: Person[];
  isRecording: boolean;
  onRecognizedIdsChange?: (ids: string[]) => void;
}) {
  return (
    <RealFaceCameraView
      onFaceCountChange={onFaceCountChange}
      selectedGroup={selectedGroup}
      people={people}
      isRecording={isRecording}
      onRecognizedIdsChange={onRecognizedIdsChange}
    />
  );
}

// Simple Navigation Component
function SimpleNav({
  isOpen,
  onToggle,
  onPeopleClick,
  onGroupsClick,
  onRecordsClick,
  onAdminClick,
}: {
  isOpen: boolean;
  onToggle: () => void;
  onPeopleClick: () => void;
  onGroupsClick: () => void;
  onRecordsClick: () => void;
  onAdminClick: () => void;
}) {
  return (
    <>
      {/* Menu Button */}
      <div className="absolute top-4 left-4 z-30">
        <button
          onClick={onToggle}
          className="h-10 w-10 bg-black/60 backdrop-blur-md border border-white/30 text-white hover:bg-black/80 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 active:scale-95"
        >
          ☰
        </button>
      </div>

      {/* Status Indicator */}
      <div className="absolute top-4 right-4 z-20">
        <div className="bg-black/60 backdrop-blur-md rounded-full px-3 py-1.5 border border-white/30 shadow-lg">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-white text-xs font-bold no-underline font-normal">
              Scout Check
            </span>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
          <div className="fixed left-4 top-20 z-40 flex flex-col space-y-3">
            <button
              onClick={() => {
                onPeopleClick();
                onToggle();
              }}
              className="w-12 h-12 bg-transparent backdrop-blur-sm border border-white/20 text-white hover:bg-white/10 rounded-full shadow-md flex items-center justify-center text-xl transition-all duration-200 active:scale-95"
            >
              👥
            </button>

            <button
              onClick={() => {
                onGroupsClick();
                onToggle();
              }}
              className="w-12 h-12 bg-transparent backdrop-blur-sm border border-white/20 text-white hover:bg-white/10 rounded-full shadow-md flex items-center justify-center text-xl transition-all duration-200 active:scale-95"
            >
              👨‍👩‍👧‍👦
            </button>

            <button
              onClick={() => {
                onRecordsClick();
                onToggle();
              }}
              className="w-12 h-12 bg-transparent backdrop-blur-sm border border-white/20 text-white hover:bg-white/10 rounded-full shadow-md flex items-center justify-center text-xl transition-all duration-200 active:scale-95"
            >
              📊
            </button>

            <button
              onClick={() => {
                onAdminClick();
                onToggle();
              }}
              className="w-12 h-12 bg-transparent backdrop-blur-sm border border-white/20 text-white hover:bg-white/10 rounded-full shadow-md flex items-center justify-center text-xl transition-all duration-200 active:scale-95"
            >
              🛡️
            </button>
          </div>

          <div
            className="absolute inset-0 -z-10"
            onClick={onToggle}
          />
        </div>
      )}
    </>
  );
}

// Group Selector Modal Component
function GroupSelectorModal({
  isOpen,
  onClose,
  groups,
  selectedGroupId,
  onSelectGroup,
}: {
  isOpen: boolean;
  onClose: () => void;
  groups: Group[];
  selectedGroupId: string;
  onSelectGroup: (groupId: string) => void;
}) {
  if (!isOpen) return null;

  const activeGroups = groups.filter((group) => group.isActive);
  const inactiveGroups = groups.filter(
    (group) => !group.isActive,
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm sm:w-full max-h-[80vh] sm:max-h-[70vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 p-4 border-b border-gray-100">
          {/* Mobile handle bar */}
          <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-3 sm:hidden"></div>

          <div className="flex items-center justify-between">
            <h3 className="font-medium text-lg">
              Select Group
            </h3>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors touch-manipulation"
            >
              ✕
            </button>
          </div>
          <div className="mt-1 text-sm text-gray-600">
            Choose which patrol to monitor
          </div>
        </div>

        {/* Group List - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* All Groups - Simple List */}
          <div className="space-y-2">
            {groups.map((group) => (
              <button
                key={group.id}
                onClick={() => {
                  onSelectGroup(group.id);
                  onClose();
                }}
                className={`w-full p-3 rounded-lg border transition-all duration-200 text-left ${
                  selectedGroupId === group.id
                    ? "bg-blue-50 border-blue-200 shadow-sm"
                    : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                } ${!group.isActive ? "opacity-60" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <div
                    className={`font-medium ${
                      selectedGroupId === group.id
                        ? "text-blue-900"
                        : "text-gray-900"
                    }`}
                  >
                    {group.name}
                  </div>
                  <div
                    className={`text-sm font-medium ${
                      selectedGroupId === group.id
                        ? "text-blue-700"
                        : "text-gray-600"
                    }`}
                  >
                    {group.members.length} scouts
                  </div>
                </div>
              </button>
            ))}

            {groups.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <div className="text-2xl mb-2">🏕️</div>
                <div className="text-sm">No groups found</div>
              </div>
            )}
          </div>
        </div>

        {/* Footer - Extra padding for mobile safe area */}
        <div className="flex-shrink-0 pb-6 sm:pb-0">
          <div className="h-6 sm:hidden"></div>
        </div>
      </div>
    </div>
  );
}

// Missing People Modal Component
function MissingPeopleModal({
  isOpen,
  onClose,
  people,
  selectedGroup,
  detectedCount,
  autoDetectedIds,
  manualAttendance,
  onToggleAttendance,
  onMarkAll,
  onConfirm,
  setSelectedPerson,
  setShowPersonDetails,
}: {
  isOpen: boolean;
  onClose: () => void;
  people: Person[];
  selectedGroup: Group | undefined;
  detectedCount: number;
  autoDetectedIds: string[];
  manualAttendance: {
    [personId: string]: "present" | "absent";
  };
  onToggleAttendance: (personId: string) => void;
  onMarkAll: (status: "present" | "absent") => void;
  onConfirm: () => void;
  setSelectedPerson: (person: Person) => void;
  setShowPersonDetails: (show: boolean) => void;
}) {
  if (!isOpen || !selectedGroup) return null;

  const groupMembers = selectedGroup.members || [];
  const groupPeople = people.filter((person) =>
    groupMembers.includes(person.id),
  );

  // Show people who haven't been marked present yet
  // In real face recognition mode, the detectedCount comes from actual AI recognition
  // Missing people are those not yet marked as present (either by AI or manually)
  const autoDetectedSet = new Set(autoDetectedIds || []);
  const missingPeople = groupPeople.filter((person) => {
    const autoDetected = autoDetectedSet.has(person.id);
    const manuallyPresent = manualAttendance[person.id] === "present";
    return !autoDetected && !manuallyPresent;
  });

  // Auto-detected count
  const autoDetectedCount = autoDetectedIds.length;
  // Manual present count (not already auto-detected)
  const manualPresentCount = Object.values(manualAttendance).filter(
    (status) => status === "present"
  ).length;
  // Total = auto + manual (no double counting since we exclude auto-detected from manual marking)
  const totalPresent = autoDetectedCount + manualPresentCount;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm sm:w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header - Compact */}
        <div className="flex-shrink-0 p-3 sm:p-4 border-b border-gray-100">
          {/* Mobile handle bar */}
          <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-3 sm:hidden"></div>

          <div className="flex items-center justify-between">
            <h3 className="font-medium text-lg">
              Confirm Attendance
            </h3>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors touch-manipulation"
            >
              ✕
            </button>
          </div>
          <div className="mt-1 text-sm text-gray-600">
            {autoDetectedCount} detected • {missingPeople.length}{" "}
            missing from {selectedGroup.name}
          </div>
        </div>

        {/* Missing People List - Expanded Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 min-h-[200px]">
          <div className="text-sm font-medium text-gray-900 mb-2">
            Mark scouts present:
          </div>
          <div className="space-y-2">
            {missingPeople.map((person) => (
              <div
                key={person.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100"
              >
                <div className="flex items-center space-x-3 flex-1">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-gray-200 border-2 border-gray-300 overflow-hidden flex-shrink-0">
                    {person.avatar ? (
                      <img
                        src={person.avatar}
                        alt={person.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                        <span className="text-white font-medium text-lg">
                          {person.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">
                      {person.name}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {person.ageGroup} •{" "}
                      {person.guides.join(", ")}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      setSelectedPerson(person);
                      setShowPersonDetails(true);
                    }}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-blue-50 text-gray-600 hover:text-blue-600 transition-colors text-xs font-medium"
                  >
                    👁️
                  </button>
                  <button
                    onClick={() =>
                      onToggleAttendance(person.id)
                    }
                    className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      manualAttendance[person.id] === "present"
                        ? "bg-green-100 text-green-700 border border-green-200"
                        : "bg-gray-100 text-gray-600 border border-gray-200 hover:bg-green-50"
                    }`}
                  >
                    {manualAttendance[person.id] === "present"
                      ? "✓ Here"
                      : "Here"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions & Summary - Compact Footer */}
        <div className="flex-shrink-0 p-3 sm:p-4 border-t border-gray-100 bg-white">
          <div className="text-sm text-gray-600 mb-2">
            Quick actions:
          </div>
          <div className="flex space-x-2 mb-3">
            <button
              onClick={() => onMarkAll("present")}
              className="flex-1 py-2.5 px-3 bg-green-50 text-green-700 border border-green-200 rounded-xl text-sm font-medium hover:bg-green-100 transition-colors touch-manipulation"
            >
              Everyone Here
            </button>
            <button
              onClick={() => onMarkAll("absent")}
              className="flex-1 py-2.5 px-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors touch-manipulation"
            >
              No One Here
            </button>
          </div>

          {/* Compact Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-2.5 mb-3">
            <div className="text-sm font-medium text-blue-900 mb-1">
              Final Count: {totalPresent}/
              {selectedGroup.members.length} scouts
            </div>
            <div className="text-xs text-blue-700">
              {autoDetectedCount} detected + {manualPresentCount}{" "}
              manual = {totalPresent} scouts
            </div>
          </div>

          {/* Confirm Button */}
          <button
            onClick={onConfirm}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors text-base touch-manipulation"
          >
            Finish Recording
          </button>

          {/* Extra padding for mobile safe area */}
          <div className="h-4 sm:hidden"></div>
        </div>
      </div>
    </div>
  );
}

// Person Details Modal Component
function PersonDetailsModal({
  isOpen,
  onClose,
  person,
  groups,
}: {
  isOpen: boolean;
  onClose: () => void;
  person: Person | null;
  groups: Group[];
}) {
  if (!isOpen || !person) return null;

  const personGroups = groups.filter((group) =>
    person.groups.includes(group.id),
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md sm:w-full max-h-[90vh] sm:max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 p-4 sm:p-6 border-b border-gray-100">
          <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4 sm:hidden"></div>

          <div className="flex items-center justify-between">
            <h3 className="font-medium text-lg">
              Scout Details
            </h3>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Basic Info */}
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-full bg-gray-200 border-2 border-gray-300 overflow-hidden flex-shrink-0">
              {person.avatar ? (
                <img
                  src={person.avatar}
                  alt={person.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                  <span className="text-white font-medium text-xl">
                    {person.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)}
                  </span>
                </div>
              )}
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-xl text-gray-900">
                {person.name}
              </h4>
              <div className="text-sm text-gray-600 mt-1">
                {person.ageGroup} • Age {person.age}
              </div>
              <div className="text-sm text-gray-600">
                Guides: {person.guides.join(", ")}
              </div>
            </div>
          </div>

          {/* Parent Contact */}
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
            <h5 className="font-medium text-blue-900 mb-3 flex items-center">
              👨‍👩‍👧‍👦 Parent Contact
            </h5>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-blue-700 font-medium">
                  Name:
                </span>
                <span className="text-sm text-blue-900">
                  {person.parentName}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-blue-700 font-medium">
                  Phone:
                </span>
                <a
                  href={`tel:${person.parentPhone}`}
                  className="text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  {person.parentPhone}
                </a>
              </div>
            </div>
          </div>

          {/* Medical Info */}
          <div className="bg-red-50 rounded-xl p-4 border border-red-100">
            <h5 className="font-medium text-red-900 mb-3 flex items-center">
              🏥 Medical Information
            </h5>
            <div>
              <span className="text-sm text-red-700 font-medium">
                Allergies:
              </span>
              {person.allergies.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {person.allergies.map((allergy, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full border border-red-200"
                    >
                      {allergy}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-sm text-red-600 ml-2">
                  None reported
                </span>
              )}
            </div>
          </div>

          {/* Groups */}
          <div className="bg-green-50 rounded-xl p-4 border border-green-100">
            <h5 className="font-medium text-green-900 mb-3 flex items-center">
              👥 Groups & Patrols
            </h5>
            <div className="space-y-2">
              {personGroups.map((group) => (
                <div
                  key={group.id}
                  className="flex items-center justify-between p-2 bg-green-100 rounded-lg border border-green-200"
                >
                  <div>
                    <div className="text-sm font-medium text-green-900">
                      {group.name}
                    </div>
                    <div className="text-xs text-green-700">
                      {group.description}
                    </div>
                  </div>
                  <div
                    className={`w-2 h-2 rounded-full ${group.isActive ? "bg-green-500" : "bg-gray-400"}`}
                  ></div>
                </div>
              ))}
            </div>
          </div>

          {/* Contact Info */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <h5 className="font-medium text-gray-900 mb-3 flex items-center">
              📧 Contact Information
            </h5>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700 font-medium">
                  Email:
                </span>
                <a
                  href={`mailto:${person.email}`}
                  className="text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  {person.email}
                </a>
              </div>
              {person.lastSeen && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-700 font-medium">
                    Last seen:
                  </span>
                  <span className="text-sm text-gray-600">
                    {person.lastSeen.toLocaleString([], {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer - Extra padding for mobile safe area */}
        <div className="flex-shrink-0 pb-6 sm:pb-0">
          <div className="h-6 sm:hidden"></div>
        </div>
      </div>
    </div>
  );
}

// Record Details Modal Component
function RecordDetailsModal({
  isOpen,
  onClose,
  record,
  people,
  groups,
}: {
  isOpen: boolean;
  onClose: () => void;
  record: AttendanceRecordType | null;
  people: Person[];
  groups: Group[];
}) {
  if (!isOpen || !record) return null;

  const group = groups.find((g) => g.name === record.groupName);
  const groupMembers = group?.members || [];
  const groupPeople = people.filter((person) =>
    groupMembers.includes(person.id),
  );

  // Determine who was auto-detected from the recorded autoDetectedIds stored at record time
  const autoDetectedIdSet = new Set(record.autoDetectedIds || []);
  const detectedPeople = groupPeople.filter((p) => autoDetectedIdSet.has(p.id));

  // People manually marked present
  const manuallyPresentPeople = groupPeople.filter(
    (person) =>
      record.manualAttendance?.[person.id] === "present",
  );

  // People manually marked absent
  const manuallyAbsentPeople = groupPeople.filter(
    (person) =>
      record.manualAttendance?.[person.id] === "absent",
  );

  // Missing people (not detected and not manually marked present)
  const missingPeople = groupPeople.filter((person) => {
    const isDetected = autoDetectedIdSet.has(person.id);
    const isMarkedPresent =
      record.manualAttendance?.[person.id] === "present";
    return !isDetected && !isMarkedPresent;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md sm:w-full max-h-[90vh] sm:max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 p-4 sm:p-6 border-b border-gray-100">
          <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4 sm:hidden"></div>

          <div className="flex items-center justify-between">
            <h3 className="font-medium text-lg">
              Attendance Details
            </h3>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
            >
              ✕
            </button>
          </div>

          <div className="mt-2 space-y-1">
            <div className="text-sm text-gray-600">
              {record.groupName}
            </div>
            <div className="text-xs text-gray-500">
              {record.timestamp.toLocaleString([], {
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
            <div className="text-sm font-medium text-blue-600">
              {record.finalPresentCount}/{record.totalCapacity}{" "}
              scouts present
            </div>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Automatically Detected */}
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <div className="font-medium text-green-700">
                Auto-Detected ({detectedPeople.length})
              </div>
            </div>
            <div className="space-y-2">
              {detectedPeople.map((person) => (
                <div
                  key={person.id}
                  className="flex items-center justify-between p-2 bg-green-50 rounded-lg border border-green-100"
                >
                  <div>
                    <div className="font-medium text-gray-900">
                      {person.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {person.ageGroup} •{" "}
                      {person.guides.join(", ")}
                    </div>
                  </div>
                  <div className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                    Detected
                  </div>
                </div>
              ))}
              {detectedPeople.length === 0 && (
                <div className="text-sm text-gray-500 italic">
                  No one was automatically detected
                </div>
              )}
            </div>
          </div>

          {/* Manually Marked Present */}
          {manuallyPresentPeople.length > 0 && (
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <div className="font-medium text-blue-700">
                  Manually Marked Present (
                  {manuallyPresentPeople.length})
                </div>
              </div>
              <div className="space-y-2">
                {manuallyPresentPeople.map((person) => (
                  <div
                    key={person.id}
                    className="flex items-center justify-between p-2 bg-blue-50 rounded-lg border border-blue-100"
                  >
                    <div>
                      <div className="font-medium text-gray-900">
                        {person.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {person.ageGroup} •{" "}
                        {person.guides.join(", ")}
                      </div>
                    </div>
                    <div className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                      Marked Here
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Missing People */}
          {missingPeople.length > 0 && (
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div className="font-medium text-red-700">
                  Missing ({missingPeople.length})
                </div>
              </div>
              <div className="space-y-2">
                {missingPeople.map((person) => (
                  <div
                    key={person.id}
                    className="flex items-center justify-between p-2 bg-red-50 rounded-lg border border-red-100"
                  >
                    <div>
                      <div className="font-medium text-gray-900">
                        {person.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {person.ageGroup} •{" "}
                        {person.guides.join(", ")}
                      </div>
                    </div>
                    <div className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded-full">
                      Not Present
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Manually Marked Absent */}
          {manuallyAbsentPeople.length > 0 && (
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                <div className="font-medium text-gray-700">
                  Manually Marked Absent (
                  {manuallyAbsentPeople.length})
                </div>
              </div>
              <div className="space-y-2">
                {manuallyAbsentPeople.map((person) => (
                  <div
                    key={person.id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-100"
                  >
                    <div>
                      <div className="font-medium text-gray-900">
                        {person.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {person.ageGroup} •{" "}
                        {person.guides.join(", ")}
                      </div>
                    </div>
                    <div className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
                      Confirmed Absent
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer - Extra padding for mobile safe area */}
        <div className="flex-shrink-0 pb-6 sm:pb-0">
          <div className="h-6 sm:hidden"></div>
        </div>
      </div>
    </div>
  );
}

// Simple Records Component
function SimpleRecords({
  records,
  onClose,
  people,
  groups,
  onShowDetails,
}: {
  records: AttendanceRecordType[];
  onClose: () => void;
  people: Person[];
  groups: Group[];
  onShowDetails: (record: AttendanceRecordType) => void;
}) {
  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="text-6xl mb-4">📊</div>
        <h3 className="text-gray-900 mb-2">No Records Yet</h3>
        <p className="text-gray-500 text-sm max-w-xs">
          Start recording attendance to see your patrol history
          here
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Stats Summary Bar */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500">
              Total Sessions
            </div>
            <div className="text-2xl text-gray-900">
              {records.length}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">Latest</div>
            <div className="text-sm text-gray-900">
              {records[0].timestamp.toLocaleDateString([], {
                month: "short",
                day: "numeric",
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="space-y-3">
          {records.map((record) => (
            <div
              key={record.id}
              className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer"
              onClick={() => onShowDetails(record)}
            >
              {/* Main Info Row */}
              <div className="px-4 py-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                      <div className="text-blue-600">
                        <svg
                          className="w-6 h-6"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                          />
                        </svg>
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="text-gray-900 font-medium mb-1">
                        {record.groupName}
                      </div>
                      <div className="text-xs text-gray-500">
                        {record.timestamp.toLocaleString([], {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-blue-600 flex items-center space-x-1">
                    <span>View</span>
                    <span>→</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="flex-1 bg-gray-100 rounded-lg px-3 py-2">
                    <div className="text-xs text-gray-500 mb-0.5">
                      Attendance
                    </div>
                    <div className="text-gray-900 font-medium">
                      {record.finalPresentCount}
                      <span className="text-gray-400">
                        /{record.totalCapacity}
                      </span>
                      <span className="text-xs text-gray-500 ml-2">
                        (
                        {Math.round(
                          (record.finalPresentCount /
                            record.totalCapacity) *
                            100,
                        )}
                        %)
                      </span>
                    </div>
                  </div>
                  {record.manualAttendance &&
                    Object.values(
                      record.manualAttendance,
                    ).filter((s) => s === "present").length >
                      0 && (
                      <div className="bg-purple-50 rounded-lg px-3 py-2 border border-purple-100">
                        <div className="text-xs text-purple-600 mb-0.5">
                          Manual
                        </div>
                        <div className="text-purple-700 font-medium">
                          +
                          {
                            Object.values(
                              record.manualAttendance,
                            ).filter((s) => s === "present")
                              .length
                          }
                        </div>
                      </div>
                    )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom padding for better scrolling */}
        <div className="h-4"></div>
      </div>
    </div>
  );
}

export default function App() {
  // App navigation state
  const [currentScreen, setCurrentScreen] = useState<
    | "welcome"
    | "record"
    | "groupSelect"
    | "camera"
    | "people"
    | "groups"
    | "records"
    | "admin"
    | "test"
  >("welcome");
  const [isTransitioning, setIsTransitioning] = useState(false);

  const [detectedCount, setDetectedCount] = useState(0);
  const [lastFrameRecognizedIds, setLastFrameRecognizedIds] = useState<string[]>([]);
  const [records, setRecords] = useState<
    AttendanceRecordType[]
  >([
    {
      id: "1",
      timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
      detectedCount: 3, // Math.max(1, Math.floor(8 * 0.5)) = 4, but using 3 for this record
      totalCapacity: 8,
      groupName: "Eagle Patrol",
      guideName: "Sarah J.",
      location: "Scout Hall",
      activity: "Weekly Meeting",
      security: {
        transportStatus: "walking",
        destination: "Park for outdoor activities",
        estimatedReturn: new Date(
          Date.now() + 1000 * 60 * 60 * 2,
        ), // 2 hours from now
      },
      finalPresentCount: 4, // 3 detected + 1 manually marked present
      manualAttendance: {
        "4": "present", // Sophie L. manually marked present (not auto-detected)
      },
    },
    {
      id: "2",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      detectedCount: 2, // Math.max(1, Math.floor(5 * 0.5)) = 2 for Wolf Pack with 5 members
      totalCapacity: 5,
      groupName: "Wolf Pack",
      guideName: "Mike R.",
      location: "Community Center",
      activity: "Craft Workshop",
      security: {
        transportStatus: "bus",
        destination: "Nature Center Field Trip",
        estimatedReturn: new Date(
          Date.now() + 1000 * 60 * 60 * 4,
        ), // 4 hours from now
        emergencyContacts: ["(555) 911-0000", "(555) 911-0001"],
      },
      finalPresentCount: 3, // 2 detected + 1 manually marked present
      manualAttendance: {
        "9": "present", // Ethan C. manually marked present
      },
    },
    {
      id: "3",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // Yesterday
      detectedCount: 1,
      totalCapacity: 2,
      groupName: "Bear Cubs",
      guideName: "Tom W.",
      location: "Art Room",
      activity: "Creative Arts",
      finalPresentCount: 1,
    },
    {
      id: "4",
      timestamp: new Date(Date.now() - 1000 * 60 * 45), // 45 minutes ago
      detectedCount: 1, // Math.max(1, Math.floor(1 * 0.5)) = 1 for Outdoor Explorers with 1 member
      totalCapacity: 1,
      groupName: "Outdoor Explorers",
      guideName: "Chris D.",
      location: "Hiking Trail",
      activity: "Nature Hike",
      security: {
        transportStatus: "bus",
        destination: "Mountain Trail",
        estimatedReturn: new Date(
          Date.now() + 1000 * 60 * 60 * 3,
        ), // 3 hours from now
        emergencyContacts: ["(555) 911-0000"],
      },
      finalPresentCount: 1, // 1 detected, no manual attendance needed
      manualAttendance: {}, // No manual attendance needed since only 1 member and they were detected
    },
  ]);
  const [showRecords, setShowRecords] = useState(false);
  const [showNav, setShowNav] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showPeoplePanel, setShowPeoplePanel] = useState(false);
  const [showGroupsPanel, setShowGroupsPanel] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [selectedGroupId, setSelectedGroupId] =
    useState<string>("1");

  const [showMissingPeopleModal, setShowMissingPeopleModal] =
    useState(false);
  const [pendingRecord, setPendingRecord] =
    useState<Partial<AttendanceRecordType> | null>(null);
  const [manualAttendance, setManualAttendance] = useState<{
    [personId: string]: "present" | "absent";
  }>({});
  const [recognizedSessionIds, setRecognizedSessionIds] = useState<Set<string>>(new Set());
  const [recordingFinished, setRecordingFinished] =
    useState(false);
  const [selectedRecord, setSelectedRecord] =
    useState<AttendanceRecordType | null>(null);
  const [showRecordDetails, setShowRecordDetails] =
    useState(false);
  const [selectedPerson, setSelectedPerson] =
    useState<Person | null>(null);
  const [showPersonDetails, setShowPersonDetails] =
    useState(false);
  const [showCameraGuide, setShowCameraGuide] = useState(false);
  const [showGroupSelector, setShowGroupSelector] =
    useState(false);
  const [showEnrollmentModal, setShowEnrollmentModal] = useState(false);

  const [people, setPeople] = useState<Person[]>([
    {
      id: "1",
      name: "Alex M.",
      email: "alex.m@scouts.org",
      ageGroup: "6th Grade",
      guides: ["Sarah J.", "Mike R."],
      age: 11,
      parentName: "Jennifer Martinez",
      parentPhone: "(555) 123-4567",
      allergies: ["Peanuts", "Tree nuts"],
      lastSeen: new Date(Date.now() - 1000 * 60 * 30),
      status: "present",
      groups: ["1", "2"],
    },
    {
      id: "2",
      name: "Emma K.",
      email: "emma.k@scouts.org",
      ageGroup: "7th Grade",
      guides: ["Sarah J."],
      age: 12,
      parentName: "David Kim",
      parentPhone: "(555) 234-5678",
      allergies: [],
      lastSeen: new Date(Date.now() - 1000 * 60 * 60 * 2),
      status: "absent",
      groups: ["1"],
    },
    {
      id: "3",
      name: "Charlie B.",
      email: "charlie.b@scouts.org",
      ageGroup: "8th Grade",
      guides: ["Tom W."],
      age: 13,
      parentName: "Lisa Brown",
      parentPhone: "(555) 345-6789",
      allergies: ["Dairy"],
      lastSeen: new Date(Date.now() - 1000 * 60 * 10),
      status: "present",
      groups: ["3", "1"],
    },
    {
      id: "4",
      name: "Sophie L.",
      email: "sophie.l@scouts.org",
      ageGroup: "6th Grade",
      guides: ["Sarah J.", "Mike R."],
      age: 11,
      parentName: "Amanda Lopez",
      parentPhone: "(555) 456-7890",
      allergies: ["Shellfish"],
      status: "unknown",
      groups: ["2", "1"],
    },
    {
      id: "5",
      name: "Jake W.",
      email: "jake.w@scouts.org",
      ageGroup: "9th Grade",
      guides: ["Chris D.", "Sarah J."],
      age: 14,
      parentName: "Robert Wilson",
      parentPhone: "(555) 567-8901",
      allergies: ["Bee stings"],
      lastSeen: new Date(Date.now() - 1000 * 60 * 60 * 4),
      status: "absent",
      groups: ["1", "4"], // Now in Eagle Patrol and Outdoor Explorers
    },
    {
      id: "6",
      name: "Maya P.",
      email: "maya.p@scouts.org",
      ageGroup: "7th Grade",
      guides: ["Sarah J.", "Tom W."],
      age: 12,
      parentName: "Priya Patel",
      parentPhone: "(555) 678-9012",
      allergies: ["Gluten"],
      lastSeen: new Date(Date.now() - 1000 * 60 * 15),
      status: "present",
      groups: ["1", "2"],
    },
    {
      id: "7",
      name: "Noah T.",
      email: "noah.t@scouts.org",
      ageGroup: "8th Grade",
      guides: ["Mike R."],
      age: 13,
      parentName: "Karen Taylor",
      parentPhone: "(555) 789-0123",
      allergies: [],
      lastSeen: new Date(Date.now() - 1000 * 60 * 45),
      status: "present",
      groups: ["1"],
    },
    {
      id: "8",
      name: "Zoe R.",
      email: "zoe.r@scouts.org",
      ageGroup: "6th Grade",
      guides: ["Tom W."],
      age: 11,
      parentName: "Michelle Rodriguez",
      parentPhone: "(555) 890-1234",
      allergies: ["Eggs", "Soy"],
      lastSeen: new Date(Date.now() - 1000 * 60 * 20),
      status: "present",
      groups: ["2", "3"],
    },
    {
      id: "9",
      name: "Ethan C.",
      email: "ethan.c@scouts.org",
      ageGroup: "7th Grade",
      guides: ["Chris D."],
      age: 12,
      parentName: "Steven Chen",
      parentPhone: "(555) 901-2345",
      allergies: ["Latex"],
      status: "unknown",
      groups: ["2"],
    },
    {
      id: "10",
      name: "Lily S.",
      email: "lily.s@scouts.org",
      ageGroup: "9th Grade",
      guides: ["Chris D.", "Mike R."],
      age: 14,
      parentName: "Rachel Smith",
      parentPhone: "(555) 012-3456",
      allergies: ["Penicillin"],
      lastSeen: new Date(Date.now() - 1000 * 60 * 30),
      status: "present",
      groups: ["4", "1"],
    },
  ]);

  const [groups, setGroups] = useState<Group[]>([
    {
      id: "1",
      name: "Eagle Patrol",
      description: "Main scout patrol - ages 11-14",
      memberCount: 8,
      capacity: 30, // Keep for backwards compatibility but use members.length instead
      isActive: true,
      lastSession: new Date(Date.now() - 1000 * 60 * 30),
      members: ["1", "2", "3", "4", "5", "6", "7", "10"], // 8 people total - added Jake W. (id: '5')
      subGroups: ["5"],
      joinLink:
        "https://scouts.example.com/join/eagle-patrol-abc123",
    },
    {
      id: "2",
      name: "Wolf Pack",
      description: "Younger scouts - ages 8-11",
      memberCount: 5,
      capacity: 20,
      isActive: true,
      lastSession: new Date(Date.now() - 1000 * 60 * 60),
      members: ["1", "4", "6", "8", "9"], // 5 people total
      joinLink:
        "https://scouts.example.com/join/wolf-pack-def456",
    },
    {
      id: "3",
      name: "Bear Cubs",
      description: "Creative activities group",
      memberCount: 2,
      capacity: 12,
      isActive: false,
      lastSession: new Date(Date.now() - 1000 * 60 * 60 * 24),
      members: ["3", "8"], // 2 people total
      joinLink:
        "https://scouts.example.com/join/bear-cubs-ghi789",
    },
    {
      id: "4",
      name: "Outdoor Explorers",
      description: "Adventure and hiking specialists",
      memberCount: 1,
      capacity: 15,
      isActive: true,
      lastSession: new Date(Date.now() - 1000 * 60 * 45),
      members: ["10"], // 1 person total - Jake W. moved to Eagle Patrol
      joinLink:
        "https://scouts.example.com/join/explorers-jkl012",
    },
    {
      id: "5",
      name: "Patrol Leaders",
      description: "Senior scouts with leadership roles",
      memberCount: 0,
      capacity: 5,
      isActive: true,
      members: [],
      parentGroup: "1",
      joinLink:
        "https://scouts.example.com/join/leaders-mno345",
    },
  ]);

  // Initialize backend face recognition service on app load
  useEffect(() => {
    logger.clear(); // Clear console and show app banner
    
    const initFaceRecognition = async () => {
      try {
        logger.system('Initializing InsightFace backend...');
        await backendRecognitionService.initialize();
        logger.success('InsightFace backend ready!');

        // Load persisted people from backend DB and merge minimal fields into UI list without losing UI-only fields
        const apiPeople = await backendRecognitionService.fetchPeople();
        if (Array.isArray(apiPeople)) {
          setPeople((prev) => {
            // Build a map for quick lookup
            const byId = new Map(prev.map(p => [p.id, p] as const));
            const merged = [...prev];
            for (const p of apiPeople) {
              if (!byId.has(p.person_id)) {
                merged.push({
                  id: p.person_id,
                  name: p.person_name,
                  email: `${(p.person_name || 'user').toLowerCase().replace(/\s+/g, '.') }@scouts.org`,
                  ageGroup: '6th Grade',
                  guides: [],
                  age: 11,
                  parentName: '',
                  parentPhone: '',
                  allergies: [],
                  status: 'unknown',
                  groups: [],
                  photoPaths: (p as any).photo_paths || [],
                });
              }
            }
            return merged;
          });
        }

        // Load groups and hydrate membership from backend
        const apiGroups = await backendRecognitionService.fetchGroups();
        if (Array.isArray(apiGroups) && apiGroups.length > 0) {
          setGroups((prev) => {
            const byId = new Map(prev.map(g => [g.id, g] as const));
            const merged = [...prev];
            for (const g of apiGroups) {
              if (byId.has(g.group_id)) {
                const idx = merged.findIndex(x => x.id === g.group_id);
                if (idx >= 0) {
                  merged[idx] = {
                    ...merged[idx],
                    members: g.members || [],
                    memberCount: (g.members || []).length,
                  };
                }
              } else {
                merged.push({
                  id: g.group_id,
                  name: g.group_name,
                  description: '',
                  memberCount: (g.members || []).length,
                  capacity: 30,
                  isActive: true,
                  members: g.members || [],
                });
              }
            }
            return merged;
          });
        }
      } catch (error) {
        logger.error('Failed to initialize face recognition', error);
      }
    };

    initFaceRecognition();
  }, []); // Run only once on mount

  const handleFaceCountChange = (
    detected: number,
    total: number,
  ) => {
    setDetectedCount(detected);
  };

  // Accumulate recognized IDs during the current recording session; do not decrement when a face leaves the frame
  const handleRecognizedIdsChange = (ids: string[]) => {
    if (!isRecording) return;
    if (!Array.isArray(ids) || ids.length === 0) return;
    // Save the last frame's unique IDs for the confirmation modal filtering and live summary
    setLastFrameRecognizedIds(Array.from(new Set(ids)));
    setRecognizedSessionIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => {
        if (id) next.add(id);
      });
      try {
        const inGroup = selectedGroup?.members || [];
        const count = Array.from(next).filter((id) => inGroup.includes(id)).length;
        logger.count('Unique people recognized in session', count, inGroup.length);
      } catch {}
      return next;
    });
  };

  // Get the currently selected group
  const selectedGroup = groups.find(
    (group) => group.id === selectedGroupId,
  );
  const selectedGroupName =
    selectedGroup?.name || "No Group Selected";

  // Calculate actual group size based on members
  const actualGroupSize = selectedGroup?.members.length || 0;

  // Calculate total detected count including manual attendance (avoid double counting)
  const calculateTotalDetectedCount = () => {
    if (!selectedGroup) return 0;
    // Persistent recognized count within session + manual attendance
    const sessionRecognizedCount = Array.from(recognizedSessionIds).filter(id => selectedGroup.members.includes(id)).length;
    const manualPresentCount = Object.values(manualAttendance).filter((status) => status === "present").length;
    return sessionRecognizedCount + manualPresentCount;
  };

  // Calculate missing people count for red indicator - now considers manual attendance
  const calculateMissingCount = () => {
    if (!selectedGroup) return 0;
    
    // Total in group minus actually detected minus manually marked present
    const totalInGroup = selectedGroup.members.length;
    const totalPresent = calculateTotalDetectedCount();
    
    return Math.max(0, totalInGroup - totalPresent);
  };

  // Calculate values on every render to ensure reactivity
  const totalDetectedCount = calculateTotalDetectedCount();
  const missingCount = calculateMissingCount();

  const handleRecord = () => {
    if (isRecording) {
      // Stop recording
      // Compute detected from persistent session-recognized IDs (not frame-based) to avoid jitter
      const totalDetected = calculateTotalDetectedCount();
      const missingCount = Math.max(0, actualGroupSize - totalDetected);

      // Stop recording and mark as finished
      setIsRecording(false);
      setRecordingFinished(true);
      // Trigger celebration animation
      setShowCelebration(true);
      // Freeze the recognized session ids for summary; keep state as-is

      if (missingCount > 0) {
        // Show missing people confirmation
        const inGroup = selectedGroup?.members || [];
        const autoIds = Array.from(recognizedSessionIds).filter((id): id is string => typeof id === 'string' && inGroup.includes(id));
        const pendingRecordData = {
          id: Date.now().toString(),
          timestamp: new Date(),
          detectedCount: totalDetected,
          totalCapacity: actualGroupSize,
          groupName: selectedGroupName,
          autoDetectedIds: autoIds,
        };

        setPendingRecord(pendingRecordData);
        setManualAttendance({});
        setShowMissingPeopleModal(true);
      } else {
        // No missing people, save record directly
        const inGroup = selectedGroup?.members || [];
        const autoIds = Array.from(recognizedSessionIds).filter((id): id is string => typeof id === 'string' && inGroup.includes(id));
        const newRecord: AttendanceRecordType = {
          id: Date.now().toString(),
          timestamp: new Date(),
          detectedCount: totalDetected,
          totalCapacity: actualGroupSize,
          groupName: selectedGroupName,
          autoDetectedIds: autoIds,
          finalPresentCount: totalDetected,
        };

        setRecords((prev) => [newRecord, ...prev.slice(0, 9)]);
        showNotification(
          `Attendance recorded: ${totalDetected}/${actualGroupSize} scouts present for ${selectedGroupName}`,
        );
        // Stay on camera screen; do not auto-navigate
      }
    } else {
      // Start recording - clear previous states to ensure clean start
      setIsRecording(true);
      setRecordingFinished(false);
      setManualAttendance({});
      setRecognizedSessionIds(new Set());
      setShowMissingPeopleModal(false);
      setPendingRecord(null);
    }
  };

  const handleRestart = () => {
    // Reset all states for a fresh start
    setRecordingFinished(false);
    setManualAttendance({});
    setShowMissingPeopleModal(false);
    setPendingRecord(null);
    showNotification("Ready to start new recording");
  };

  const showNotification = (message: string) => {
    try {
      const notification = document.createElement("div");
      notification.textContent = message;
      notification.className =
        "absolute top-0 left-1/2 transform -translate-x-1/2 mt-2 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 text-sm max-w-sm text-center";
      const anchor = document.getElementById("scout-count-anchor");
      if (anchor) {
        anchor.appendChild(notification);
      } else {
        document.body.appendChild(notification);
      }

      window.setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 3000);
    } catch (error) {
      logger.error("Notification error", error);
    }
  };

  const showMissingCountNotification = (message: string) => {
    try {
      const notification = document.createElement("div");
      notification.innerHTML = `
        <div class="flex items-center space-x-2">
          <div class="w-3 h-3 bg-red-400 rounded-full animate-pulse"></div>
          <span>${message}</span>
        </div>
      `;
      notification.className =
        "absolute top-0 left-1/2 transform -translate-x-1/2 mt-2 bg-red-600/95 backdrop-blur-md text-white px-4 py-3 rounded-xl shadow-2xl z-50 text-sm max-w-sm text-center border border-red-400/50";
      const anchor = document.getElementById("scout-count-anchor");
      if (anchor) {
        anchor.appendChild(notification);
      } else {
        document.body.appendChild(notification);
      }

      // Add entrance animation
      notification.style.opacity = "0";
      notification.style.transform =
        "translate(-50%, -20px) scale(0.9)";
      notification.style.transition = "all 0.3s ease-out";

      requestAnimationFrame(() => {
        notification.style.opacity = "1";
        notification.style.transform =
          "translate(-50%, 0) scale(1)";
      });

      window.setTimeout(() => {
        if (notification.parentNode) {
          notification.style.opacity = "0";
          notification.style.transform =
            "translate(-50%, -20px) scale(0.9)";
          setTimeout(() => {
            if (notification.parentNode) {
              notification.parentNode.removeChild(notification);
            }
          }, 300);
        }
      }, 2500);
    } catch (error) {
      logger.error("Missing count notification error", error);
    }
  };

  const handleConfirmAttendance = () => {
    if (!pendingRecord) return;

    const manualPresentCount = Object.values(
      manualAttendance,
    ).filter((status) => status === "present").length;
    // Final count is session recognized (auto) + manual present
    const finalPresentCount = calculateTotalDetectedCount();

    const newRecord: AttendanceRecordType = {
      ...pendingRecord,
      manualAttendance,
      finalPresentCount,
    } as AttendanceRecordType;

    setRecords((prev) => [newRecord, ...prev.slice(0, 9)]);
    showNotification(
      `Attendance recorded: ${finalPresentCount}/${actualGroupSize} scouts present for ${selectedGroupName}`,
    );

    setShowMissingPeopleModal(false);
    setPendingRecord(null);
    // DON'T clear manual attendance - keep it so the main UI shows updated count
    // setManualAttendance({}); // Remove this line
    // Keep recordingFinished = true so restart button shows
    // Stay on camera screen; do not auto-navigate
  };

  const handleMarkAll = (status: "present" | "absent") => {
    const groupMembers = selectedGroup?.members || [];
    const groupPeople = people.filter((person) =>
      groupMembers.includes(person.id),
    );

    setManualAttendance((prev) => {
      let newManualAttendance = { ...prev };

      if (status === "present") {
        // Mark everyone present
        // EXCLUDE auto-detected session IDs to avoid double counting
        const autoDetectedIds = new Set(Array.from(recognizedSessionIds));
        groupPeople.forEach((person) => {
          if (!autoDetectedIds.has(person.id)) {
            newManualAttendance[person.id] = "present";
          }
        });
      } else {
        // Clear all manual markings (no one here)
        groupPeople.forEach((person) => {
          delete newManualAttendance[person.id];
        });
      }

      // Calculate new missing count
      const manualPresentCount = Object.values(newManualAttendance).filter(
        (s) => s === "present"
      ).length;
      const totalPresent = calculateTotalDetectedCount();
      const newMissingCount = Math.max(0, actualGroupSize - totalPresent);

      // Show immediate notification for bulk action
      setTimeout(() => {
        if (status === "present") {
          showMissingCountNotification(
            `Everyone marked present! ${newMissingCount} missing.`,
          );
        } else {
          showMissingCountNotification(
            `All markings cleared. ${newMissingCount} missing.`,
          );
        }
      }, 50);

      return newManualAttendance;
    });
  };

  // Navigation functions with smooth transitions
  const navigateToScreen = (screen: typeof currentScreen) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentScreen(screen);
      setIsTransitioning(false);
    }, 150);
  };

  const handleToggleAttendance = (personId: string) => {
    const current = manualAttendance[personId];
    const person = people.find((p) => p.id === personId);
    const personName = person?.name || "Person";

    setManualAttendance((prev) => {
      let newState;
      if (current === "present") {
        // Present → Unset (remove from manual attendance)
        newState = { ...prev };
        delete newState[personId];
      } else {
        // Unset/Absent → Present
        newState = { ...prev, [personId]: "present" };
      }

      // Calculate new missing count with the new state
      const manualPresentCount = Object.values(newState).filter(
        (s) => s === "present"
      ).length;
      const totalPresent = detectedCount + manualPresentCount;
      const newMissingCount = Math.max(0, actualGroupSize - totalPresent);

      // Show immediate notification with correct count
      setTimeout(() => {
        if (current === "present") {
          showMissingCountNotification(
            `${personName} unmarked. ${newMissingCount} missing.`,
          );
        } else {
          showMissingCountNotification(
            `${personName} marked present! ${newMissingCount} missing.`,
          );
        }
      }, 50);

      return newState;
    });
  };

  // Screen transition wrapper
  const ScreenWrapper = ({
    children,
  }: {
    children?: React.ReactNode;
  }) => (
    <div
      className={`transition-opacity duration-150 ${isTransitioning ? "opacity-0" : "opacity-100"}`}
    >
      {children}
    </div>
  );

  // Render different screens based on current state
  if (currentScreen === "welcome") {
    return (
      <ScreenWrapper>
        <WelcomeScreen
          onNavigate={navigateToScreen}
          hasLastGroup={
            !!selectedGroupId &&
            !!groups.find((g) => g.id === selectedGroupId)
          }
        />
      </ScreenWrapper>
    );
  }

  if (currentScreen === "groupSelect") {
    return (
      <ScreenWrapper>
        <GroupSelectionScreen
          groups={groups}
          onSelectGroup={(groupId) => {
            setSelectedGroupId(groupId);
            navigateToScreen("camera");
          }}
          onCreateNew={() => {
            navigateToScreen("groups");
          }}
          onBack={() => navigateToScreen("welcome")}
        />
      </ScreenWrapper>
    );
  }

  if (currentScreen === "people") {
    return (
      <ScreenWrapper>
        <div className="fixed inset-0 bg-white">
          <PeoplePanel
            isOpen={true}
            onClose={() => navigateToScreen("welcome")}
            people={people}
            setPeople={setPeople}
            groups={groups}
            setGroups={setGroups}
            onShowPersonDetails={(person) => {
              setSelectedPerson(person);
              setShowPersonDetails(true);
            }}
          />
          {/* Person Details Modal */}
          <PersonDetailsModal
            isOpen={showPersonDetails}
            onClose={() => {
              setShowPersonDetails(false);
              setSelectedPerson(null);
            }}
            person={selectedPerson}
            groups={groups}
          />
        </div>
      </ScreenWrapper>
    );
  }

  if (currentScreen === "groups") {
    return (
      <ScreenWrapper>
        <div className="fixed inset-0 bg-white">
          <GroupsPanel
            isOpen={true}
            onClose={() => navigateToScreen("welcome")}
            onSelectGroup={(group) => {
              setSelectedGroupId(group.id);
              navigateToScreen("camera");
            }}
            selectedGroupId={selectedGroupId}
            groups={groups}
            setGroups={setGroups}
            people={people}
            setPeople={setPeople}
            onShowPersonDetails={(person) => {
              setSelectedPerson(person);
              setShowPersonDetails(true);
            }}
          />
          {/* Person Details Modal */}
          <PersonDetailsModal
            isOpen={showPersonDetails}
            onClose={() => {
              setShowPersonDetails(false);
              setSelectedPerson(null);
            }}
            person={selectedPerson}
            groups={groups}
          />
        </div>
      </ScreenWrapper>
    );
  }

  if (currentScreen === "records") {
    return (
      <ScreenWrapper>
        <div className="fixed inset-0 bg-white flex flex-col">
          {/* Header */}
          <div className="flex-shrink-0 border-b border-gray-200 bg-white px-4 py-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => navigateToScreen("welcome")}
                className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-all duration-200 active:scale-95"
              >
                ←
              </button>
              <div className="text-center flex-1">
                <h2 className="text-gray-900 text-xl">
                  Attendance Records
                </h2>
                <p className="text-gray-500 text-sm">
                  View all patrol history
                </p>
              </div>
              <div className="w-10"></div>
            </div>
          </div>

          {/* Records Content - Full Page */}
          <div className="flex-1 overflow-hidden">
            <SimpleRecords
              records={records}
              onClose={() => navigateToScreen("welcome")}
              people={people}
              groups={groups}
              onShowDetails={(record) => {
                setSelectedRecord(record);
                setShowRecordDetails(true);
              }}
            />
          </div>
        </div>

        {/* Record Details Modal */}
        <RecordDetailsModal
          isOpen={showRecordDetails}
          onClose={() => {
            setShowRecordDetails(false);
            setSelectedRecord(null);
          }}
          record={selectedRecord}
          people={people}
          groups={groups}
        />
      </ScreenWrapper>
    );
  }

  if (currentScreen === "admin") {
    return (
      <ScreenWrapper>
        <div className="fixed inset-0 bg-white">
          <AdminPanel
            isOpen={true}
            onClose={() => navigateToScreen("welcome")}
            people={people}
            groups={groups}
            records={records}
            onShowPersonDetails={(person) => {
              setSelectedPerson(person);
              setShowPersonDetails(true);
            }}
            onShowRecordDetails={(record) => {
              setSelectedRecord(record);
              setShowRecordDetails(true);
            }}
          />
          {/* Person Details Modal */}
          <PersonDetailsModal
            isOpen={showPersonDetails}
            onClose={() => {
              setShowPersonDetails(false);
              setSelectedPerson(null);
            }}
            person={selectedPerson}
            groups={groups}
          />
          {/* Record Details Modal */}
          <RecordDetailsModal
            isOpen={showRecordDetails}
            onClose={() => {
              setShowRecordDetails(false);
              setSelectedRecord(null);
            }}
            record={selectedRecord}
            people={people}
            groups={groups}
          />
        </div>
      </ScreenWrapper>
    );
  }

  if (currentScreen === "test") {
    return (
      <ScreenWrapper>
        <VideoTestPage
          groups={groups}
          people={people}
          onBack={() => navigateToScreen("welcome")}
        />
      </ScreenWrapper>
    );
  }

  // Camera screen (currentScreen === 'camera')
  return (
    <ScreenWrapper>
      <div className="w-full h-screen bg-black relative overflow-hidden">
        {/* Real Face Recognition Camera */}
        <RealFaceCamera
          onFaceCountChange={handleFaceCountChange}
          selectedGroup={selectedGroup}
          people={people}
          isRecording={isRecording}
          onRecognizedIdsChange={handleRecognizedIdsChange}
        />

        {/* Back Button */}
        <div className="absolute top-4 left-4 z-30">
          <button
            onClick={() => navigateToScreen("welcome")}
            className="w-10 h-10 bg-black/60 backdrop-blur-md rounded-full border border-white/30 flex items-center justify-center text-white hover:bg-black/80 transition-all duration-200 active:scale-95"
          >
            ←
          </button>
        </div>

        {/* Status Indicator */}
        <div className="absolute top-4 right-4 z-20 flex flex-col items-end space-y-2">
          <div className="bg-black/60 backdrop-blur-md rounded-full px-3 py-1.5 border border-white/30 shadow-lg">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-white text-xs font-bold no-underline font-normal">
                Scout Check
              </span>
            </div>
          </div>
        </div>

        {/* Face Detection Overlay - Optimized for iPhone 16 Pro */}
        <div className="absolute top-14 left-0 right-0 z-10 p-3">
          <div className="flex flex-col items-center space-y-2">
            {/* Group Name Display - Now Clickable */}
            <button
              onClick={() => setShowGroupSelector(true)}
              className="bg-black/60 backdrop-blur-md rounded-xl px-3 py-2 border border-white/20 shadow-lg hover:bg-black/70 transition-all duration-200 active:scale-95"
            >
              <div className="text-center">
                <div className="text-white font-medium text-base flex items-center space-x-2">
                  <span>{selectedGroupName}</span>
                  <span className="text-white/60 text-sm">
                    ▼
                  </span>
                </div>
              </div>
            </button>

            {/* People Detection Display */}
            <div className="bg-black/60 backdrop-blur-md rounded-xl px-3 py-2.5 border border-white/30 shadow-xl">
              <div className="text-center">
                <div className="text-white/80 text-xs mb-1">
                  Scouts Detected
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <div className="text-white text-xl font-medium tracking-wider">
                    {totalDetectedCount}/{actualGroupSize}
                  </div>
                  {(!isRecording || recordingFinished) &&
                    missingCount > 0 && (
                      <div className="bg-red-500 text-white text-sm font-bold px-2 py-0.5 rounded-full min-w-[20px] h-5 flex items-center justify-center animate-pulse">
                        {missingCount}
                      </div>
                    )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* iPhone-style Record Button - Optimized for iPhone 16 Pro */}
        <div className="absolute bottom-0 left-0 right-0 z-10 p-6 pb-8">
          <div className="flex justify-center items-center space-x-4">
            {/* Main Record Button */}
            <button
              onClick={handleRecord}
              disabled={recordingFinished}
              className={`relative w-18 h-18 bg-white/20 backdrop-blur-md rounded-full border-4 border-white shadow-2xl transition-all duration-200 active:scale-95 hover:bg-white/30 ${
                recordingFinished
                  ? "opacity-50 cursor-not-allowed"
                  : ""
              }`}
            >
              <div
                className={`absolute inset-2 rounded-full transition-all duration-300 ${
                  isRecording ? "bg-white" : "bg-red-500"
                }`}
              >
                {isRecording && (
                  <div className="absolute inset-2 bg-red-500 rounded-sm"></div>
                )}
              </div>
            </button>

            {/* Restart Button - appears after recording finishes */}
            {recordingFinished && (
              <button
                onClick={handleRestart}
                className="relative w-14 h-14 bg-green-500/80 backdrop-blur-md rounded-full border-3 border-white shadow-xl transition-all duration-200 active:scale-95 hover:bg-green-500/90 flex items-center justify-center animate-fade-in"
              >
                <div className="text-white text-base">↻</div>
              </button>
            )}
          </div>
          <div className="h-2"></div>
        </div>

        {/* Group Selector Modal */}
        <GroupSelectorModal
          isOpen={showGroupSelector}
          onClose={() => setShowGroupSelector(false)}
          groups={groups}
          selectedGroupId={selectedGroupId}
          onSelectGroup={(groupId) => {
            setSelectedGroupId(groupId);
            // Reset any ongoing recording states when switching groups
            if (isRecording || recordingFinished) {
              setIsRecording(false);
              setRecordingFinished(false);
              setManualAttendance({});
              setShowMissingPeopleModal(false);
              setPendingRecord(null);
            }
          }}
        />

        {/* Missing People Modal */}
        <MissingPeopleModal
          isOpen={showMissingPeopleModal}
          onClose={() => {
            setShowMissingPeopleModal(false);
            setPendingRecord(null);
            // DON'T clear manual attendance when closing modal
            // setManualAttendance({}); // Remove this line
            // Keep recordingFinished = true so restart button shows
          }}
          people={people}
          selectedGroup={selectedGroup}
          detectedCount={totalDetectedCount}
          autoDetectedIds={Array.from(recognizedSessionIds)}
          manualAttendance={manualAttendance}
          onToggleAttendance={handleToggleAttendance}
          onMarkAll={handleMarkAll}
          onConfirm={handleConfirmAttendance}
          setSelectedPerson={setSelectedPerson}
          setShowPersonDetails={setShowPersonDetails}
        />

        {/* Person Details Modal */}
        <PersonDetailsModal
          isOpen={showPersonDetails}
          onClose={() => {
            setShowPersonDetails(false);
            setSelectedPerson(null);
          }}
          person={selectedPerson}
          groups={groups}
        />

        {/* Face Enrollment Modal */}
        <FaceEnrollmentModal
          isOpen={showEnrollmentModal}
          onClose={() => setShowEnrollmentModal(false)}
          people={people}
          onEnrollmentComplete={(personId) => {
            logger.success('Person enrolled successfully', { personId });
            showNotification(`Successfully enrolled face for recognition!`);
          }}
          selectedGroupId={selectedGroup?.id}
        />

        {/* Face Recognition Initializer - Shows loading status */}
        <FaceRecognitionInitializer />

        {/* Debug Panel - For troubleshooting */}
        <DebugPanel />

        {/* Celebration Animation - Shows after recording completes */}
        <CelebrationAnimation 
          isVisible={showCelebration}
          onComplete={() => setShowCelebration(false)}
        />
      </div>
    </ScreenWrapper>
  );
}