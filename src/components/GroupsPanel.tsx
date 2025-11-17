import React, { useState, useEffect, useRef } from 'react';
import { backendRecognitionService } from '../services/BackendRecognitionService';
import { supabaseDataService } from '../services/SupabaseDataService';
import { useAuth } from '../hooks/useAuth';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';

interface Person {
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
  status: 'present' | 'absent' | 'unknown';
  avatar?: string;
  photoPaths?: string[]; // Array of photo filenames stored in backend
  groups: string[]; // Array of group IDs this person belongs to
}

interface Guide {
  name: string;
  phone: string;
}

interface Group {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  capacity: number;
  isActive: boolean;
  lastSession?: Date;
  members: string[];
  age?: string;
  guides?: Guide[];
  guidesInfo?: string;
  notes?: string;
  subGroups?: string[];
  joinLink?: string;
  parentGroup?: string;
}

interface GroupsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectGroup: (group: Group) => void;
  selectedGroupId?: string;
  groups: Group[];
  setGroups: (groups: Group[]) => void;
  people: Person[];
  setPeople: (people: Person[]) => void;
  onShowPersonDetails?: (person: Person) => void;
}

export function GroupsPanel({ 
  isOpen, 
  onClose, 
  onSelectGroup, 
  selectedGroupId, 
  groups, 
  setGroups, 
  people, 
  setPeople,
  onShowPersonDetails
}: GroupsPanelProps) {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'edit' | 'members'>('list');
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [newGroupForm, setNewGroupForm] = useState({
    name: '',
    age: '',
    guides: [{ name: '', phone: '' }],
    notes: '',
    capacity: 10,
    parentGroup: ''
  });
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [addMembersSearchTerm, setAddMembersSearchTerm] = useState('');
  const [showAllPeople, setShowAllPeople] = useState(false);

  // Track if we're in the middle of an update to prevent scroll jumps
  const isUpdatingRef = useRef(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Sync selectedGroup and editingGroup with groups prop changes
  // Only update if the group was deleted, not on every change
  useEffect(() => {
    // Skip updates if we're in the middle of an operation
    if (isUpdatingRef.current) {
      isUpdatingRef.current = false;
      return;
    }

    if (selectedGroup) {
      const updatedGroup = groups.find(g => g.id === selectedGroup.id);
      if (!updatedGroup) {
        // Group was deleted, clear selection
        setSelectedGroup(null);
        setViewMode('list');
      }
    }
    if (editingGroup) {
      const updatedGroup = groups.find(g => g.id === editingGroup.id);
      if (!updatedGroup) {
        // Group was deleted, clear editing
        setEditingGroup(null);
        setViewMode('list');
      }
    }
  }, [groups]);

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectGroup = (group: Group) => {
    onSelectGroup(group);
  };

  const handleViewMembers = (group: Group) => {
    setSelectedGroup(group);
    setViewMode('members');
  };

  const handleEditGroup = (group: Group) => {
    // Parse guidesInfo if it exists but guides array doesn't
    let guides = group.guides;
    if (!guides && group.guidesInfo) {
      try {
        guides = JSON.parse(group.guidesInfo);
      } catch {
        guides = [{ name: '', phone: '' }];
      }
    }
    if (!guides || guides.length === 0) {
      guides = [{ name: '', phone: '' }];
    }
    setEditingGroup({ ...group, guides });
    setViewMode('edit');
  };

  const handleSaveGroup = async () => {
    if (!editingGroup) return;

    // Save scroll position before update
    const scrollPosition = scrollContainerRef.current?.scrollTop || 0;

    // Set flag to prevent useEffect from triggering
    isUpdatingRef.current = true;

    // Filter out empty guides and update guidesInfo
    const validGuides = editingGroup.guides?.filter(g => g.name.trim() || g.phone.trim()) || [];
    const updatedGroup = {
      ...editingGroup,
      guides: validGuides.length > 0 ? validGuides : undefined,
      guidesInfo: validGuides.length > 0 ? JSON.stringify(validGuides) : undefined
    };

    const updatedGroups = groups.map(group => 
      group.id === updatedGroup.id ? updatedGroup : group
    );
    setGroups(updatedGroups);
    
    // Persist to backend
    try {
      await backendRecognitionService.updateGroup(updatedGroup.id, {
        groupName: updatedGroup.name,
        age: updatedGroup.age,
        guidesInfo: updatedGroup.guidesInfo,
        notes: updatedGroup.notes
      });
    } catch (error) {
      console.error('Failed to save group to backend:', error);
    }
    
    setViewMode('list');
    setEditingGroup(null);
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm('Are you sure you want to delete this group? This action cannot be undone.')) {
      return;
    }

    // Save scroll position before update
    const scrollPosition = scrollContainerRef.current?.scrollTop || 0;

    // Set flag to prevent useEffect from triggering
    isUpdatingRef.current = true;

    // Remove group from state
    const updatedGroups = groups.filter(g => g.id !== groupId);
    setGroups(updatedGroups);

    // Remove group from all people's groups arrays
    const updatedPeople = people.map(person => ({
      ...person,
      groups: person.groups.filter(gid => gid !== groupId)
    }));
    setPeople(updatedPeople);

    // Delete from backend
    try {
      await backendRecognitionService.deleteGroup(groupId);
    } catch (error) {
      console.error('Failed to delete group from backend:', error);
    }
    
    setViewMode('list');
    setEditingGroup(null);
  };

  const handleCreateGroup = async () => {
    if (!newGroupForm.name) return;
    if (!user) {
      console.error('No user logged in');
      return;
    }

    // Save scroll position before update
    const scrollPosition = scrollContainerRef.current?.scrollTop || 0;

    // Set flag to prevent useEffect from triggering
    isUpdatingRef.current = true;

    // Filter out empty guides
    const validGuides = newGroupForm.guides.filter(g => g.name.trim() || g.phone.trim());

    // Generate UUID for group
    const groupId = crypto.randomUUID();

    const newGroup: Group = {
      id: groupId,
      name: newGroupForm.name,
      description: '',
      age: newGroupForm.age,
      guides: validGuides.length > 0 ? validGuides : undefined,
      guidesInfo: validGuides.length > 0 ? JSON.stringify(validGuides) : undefined,
      notes: newGroupForm.notes,
      capacity: newGroupForm.capacity,
      memberCount: 0, // Keep for backwards compatibility
      isActive: true,
      members: [],
      subGroups: [],
      joinLink: generateJoinLink(),
      parentGroup: newGroupForm.parentGroup || undefined
    };

    try {
      // Save to Supabase
      console.log(`💾 Saving group "${newGroup.name}" to Supabase...`);
      await supabaseDataService.createGroup(user.id, {
        id: groupId,
        name: newGroup.name,
        description: newGroup.description,
        age: newGroup.age,
        guides_info: validGuides.length > 0 ? validGuides : null,
        notes: newGroup.notes,
        capacity: newGroup.capacity
      });
      console.log(`✅ Group saved to Supabase!`);

      // If it's a subgroup, add to parent's subGroups array
      if (newGroupForm.parentGroup) {
        const updatedGroups = groups.map(group => {
          if (group.id === newGroupForm.parentGroup) {
            return {
              ...group,
              subGroups: [...(group.subGroups || []), newGroup.id]
            };
          }
          return group;
        });
        setGroups([...updatedGroups, newGroup]);
      } else {
        setGroups([...groups, newGroup]);
      }

      setNewGroupForm({ name: '', age: '', guides: [{ name: '', phone: '' }], notes: '', capacity: 10, parentGroup: '' });
      setShowCreateForm(false);
      
      // Persist to backend (local)
      backendRecognitionService.createGroup(newGroup.id, newGroup.name).catch(() => {});
    } catch (error) {
      console.error('❌ Failed to create group:', error);
      alert('Failed to create group. Please try again.');
    }
  };

  const handleRemoveFromGroup = async (personId: string, groupId: string) => {
    // Save scroll position before update
    const scrollPosition = scrollContainerRef.current?.scrollTop || 0;

    // Set flag to prevent useEffect from triggering
    isUpdatingRef.current = true;

    try {
      // Save to Supabase
      console.log(`💾 Removing person ${personId} from group ${groupId} in Supabase...`);
      await supabaseDataService.removeGroupMember(groupId, personId);
      console.log(`✅ Person removed from group in Supabase!`);

      // Remove person from group members
      const updatedGroups = groups.map(group => {
        if (group.id === groupId) {
          return {
            ...group,
            members: group.members.filter(id => id !== personId)
          };
        }
        return group;
      });

      // Remove group from person's groups
      const updatedPeople = people.map(person => {
        if (person.id === personId) {
          return {
            ...person,
            groups: person.groups.filter(id => id !== groupId)
          };
        }
        return person;
      });

      setGroups(updatedGroups);
      setPeople(updatedPeople);
    } catch (error) {
      console.error('❌ Failed to remove person from group:', error);
      alert('Failed to remove person from group. Please try again.');
    }
    
    // Update local state to reflect changes immediately
    if (selectedGroup && selectedGroup.id === groupId) {
      setSelectedGroup({
        ...selectedGroup,
        members: selectedGroup.members.filter(id => id !== personId)
      });
    }
    if (editingGroup && editingGroup.id === groupId) {
      setEditingGroup({
        ...editingGroup,
        members: editingGroup.members.filter(id => id !== personId)
      });
    }

    // Restore scroll position after React updates
    requestAnimationFrame(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = scrollPosition;
      }
    });

    // Persist to backend
    backendRecognitionService.removeGroupMember(groupId, personId).catch(() => {});
  };

  const handleAddToGroup = async (personId: string, groupId: string) => {
    // Save scroll position before update
    const scrollPosition = scrollContainerRef.current?.scrollTop || 0;

    // Set flag to prevent useEffect from triggering
    isUpdatingRef.current = true;

    try {
      // Check if person is already in group
      const group = groups.find(g => g.id === groupId);
      if (group && group.members.includes(personId)) {
        console.log(`ℹ️  Person ${personId} is already in group ${groupId}`);
        return; // Already added, no need to proceed
      }

      // Save to Supabase
      console.log(`💾 Adding person ${personId} to group ${groupId} in Supabase...`);
      await supabaseDataService.addGroupMember(groupId, personId);
      console.log(`✅ Person added to group in Supabase!`);

      // Add person to group
      const updatedGroups = groups.map(group => {
        if (group.id === groupId && !group.members.includes(personId)) {
          return {
            ...group,
            members: [...group.members, personId]
          };
        }
        return group;
      });

      // Add group to person's groups
      const updatedPeople = people.map(person => {
        if (person.id === personId && !person.groups.includes(groupId)) {
          return {
            ...person,
            groups: [...person.groups, groupId]
          };
        }
        return person;
      });

      setGroups(updatedGroups);
      setPeople(updatedPeople);
    } catch (error) {
      console.error('❌ Failed to add person to group:', error);
      alert('Failed to add person to group. Please try again.');
    }
    
    // Update local state to reflect changes immediately
    if (selectedGroup && selectedGroup.id === groupId && !selectedGroup.members.includes(personId)) {
      setSelectedGroup({
        ...selectedGroup,
        members: [...selectedGroup.members, personId]
      });
    }
    if (editingGroup && editingGroup.id === groupId && !editingGroup.members.includes(personId)) {
      setEditingGroup({
        ...editingGroup,
        members: [...editingGroup.members, personId]
      });
    }

    // Restore scroll position after React updates
    requestAnimationFrame(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = scrollPosition;
      }
    });

    // Persist to backend
    backendRecognitionService.addGroupMember(groupId, personId).catch(() => {});
  };

  const generateJoinLink = (groupId?: string) => {
    if (!user?.id) return '';
    const targetGroupId = groupId || selectedGroup?.id || '';
    return `${window.location.origin}/enroll/${user.id}/${targetGroupId}`;
  };

  const copyJoinLink = (groupId?: string) => {
    const link = generateJoinLink(groupId);
    if (!link) {
      alert('Unable to generate link. Please make sure you are signed in.');
      return;
    }
    
    navigator.clipboard.writeText(link);
    // Simple notification without alert
    const notification = document.createElement('div');
    notification.textContent = '✅ Enrollment link copied to clipboard!';
    notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50';
    document.body.appendChild(notification);
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 2000);
  };

  const getGroupMembers = (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return [];
    return people.filter(person => group.members.includes(person.id));
  };

  const getAvailablePeople = (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return [];
    return people.filter(person => !group.members.includes(person.id));
  };

  const getFilteredAvailablePeople = (groupId: string) => {
    const availablePeople = getAvailablePeople(groupId);
    
    // If there's a search term, always filter by it
    if (addMembersSearchTerm) {
      return availablePeople.filter(person =>
        person.name.toLowerCase().includes(addMembersSearchTerm.toLowerCase()) ||
        person.email.toLowerCase().includes(addMembersSearchTerm.toLowerCase()) ||
        person.ageGroup.toLowerCase().includes(addMembersSearchTerm.toLowerCase()) ||
        person.guides.some(guide => guide.toLowerCase().includes(addMembersSearchTerm.toLowerCase()))
      );
    }
    
    // If showing all people and no search term, return all available people
    if (showAllPeople) {
      return availablePeople;
    }
    
    // If not showing all and no search term, return empty (default behavior)
    return [];
  };

  if (!isOpen) return null;

  // Members View
  if (viewMode === 'members' && selectedGroup) {
    const groupMembers = getGroupMembers(selectedGroup.id);
    const availablePeople = getAvailablePeople(selectedGroup.id);
    const filteredAvailablePeople = getFilteredAvailablePeople(selectedGroup.id);

    return (
      <div className="h-full flex flex-col bg-white">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-white sticky top-0 z-10">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1 mr-4">
              <h3 className="text-lg font-semibold mb-1">{selectedGroup.name}</h3>
              <p className="text-sm text-gray-600">{selectedGroup.description}</p>
            </div>
            <div className="flex space-x-2 flex-shrink-0">
              <Button 
                onClick={() => setViewMode('list')} 
                variant="ghost" 
                size="sm"
                className="h-8 w-8 p-0"
              >
                ←
              </Button>
              <Button onClick={onClose} variant="ghost" size="sm" className="h-8 w-8 p-0">
                ✕
              </Button>
            </div>
          </div>
        </div>
          
        {/* Content */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-6">
            <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
              <span className="text-sm font-medium">Members: {groupMembers.length}</span>
              <Button
                onClick={() => copyJoinLink(selectedGroup.id)}
                variant="outline"
                size="sm"
                className="text-xs h-8"
              >
                📋 Share Link
              </Button>
            </div>

            {/* Group Information */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 space-y-3">
              <div>
                <h4 className="text-sm font-semibold mb-2 text-blue-900">Age Group</h4>
                <p className="text-sm text-gray-700">{selectedGroup.age || 'Not specified'}</p>
              </div>
              <div>
                <h4 className="text-sm font-semibold mb-2 text-blue-900">Guides</h4>
                {selectedGroup.guides && selectedGroup.guides.length > 0 ? (
                  <div className="space-y-2">
                    {selectedGroup.guides.map((guide, index) => (
                      <div key={index} className="bg-white p-2 rounded border border-blue-200">
                        <div className="text-sm font-medium text-gray-900">{guide.name}</div>
                        {guide.phone && (
                          <a 
                            href={`tel:${guide.phone}`}
                            className="text-sm text-blue-600 hover:text-blue-800 underline"
                          >
                            📞 {guide.phone}
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-700">Not specified</p>
                )}
              </div>
              {selectedGroup.notes && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 text-blue-900">Notes</h4>
                  <p className="text-sm text-gray-700 whitespace-pre-line">{selectedGroup.notes}</p>
                </div>
              )}
            </div>

            {/* Current Members */}
            <div>
              <h4 className="text-base font-semibold mb-4">Current Members</h4>
              <div className="space-y-3">
                {groupMembers.map(person => (
                  <div key={person.id} className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <Avatar className="w-12 h-12 flex-shrink-0">
                      <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${person.name}`} />
                      <AvatarFallback>{person.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <span className="text-base font-medium">{person.name}</span>
                      <div className="text-sm text-gray-600">{person.ageGroup} • {person.guides.join(', ')}</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {onShowPersonDetails && (
                        <Button
                          onClick={() => onShowPersonDetails(person)}
                          variant="outline"
                          size="sm"
                          className="text-blue-600 hover:text-blue-800 text-xs h-8 px-2"
                        >
                          👁️
                        </Button>
                      )}
                      <Button
                        onClick={() => handleRemoveFromGroup(person.id, selectedGroup.id)}
                        variant="outline"
                        size="sm"
                        className="text-red-500 hover:text-red-700 text-xs h-8"
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
                {groupMembers.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    <div className="text-3xl mb-2">👥</div>
                    <div className="text-sm">No members in this group yet</div>
                  </div>
                )}
              </div>
            </div>

            {/* Add Members */}
            {availablePeople.length > 0 && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-base font-semibold">Add Members</h4>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">
                      {addMembersSearchTerm ? filteredAvailablePeople.length : availablePeople.length} available
                    </span>
                    <button
                      onClick={() => {
                        setShowAllPeople(!showAllPeople);
                      }}
                      className={`w-8 h-8 rounded-full border-2 transition-all duration-200 flex items-center justify-center text-sm font-medium ${
                        showAllPeople
                          ? 'bg-blue-500 border-blue-500 text-white'
                          : 'bg-white border-gray-300 text-gray-600 hover:border-blue-400 hover:text-blue-600'
                      }`}
                      title={showAllPeople ? 'Hide all people' : 'Show all people'}
                    >
                      {showAllPeople ? '−' : '+'}
                    </button>
                  </div>
                </div>
                
                {/* Search Input - always visible */}
                <div className="mb-4">
                  <Input
                    placeholder="Search people by name, email, or department..."
                    value={addMembersSearchTerm}
                    onChange={(e) => setAddMembersSearchTerm(e.target.value)}
                    className="w-full h-10"
                  />
                </div>

                {/* Available People List - show when expanded or searching */}
                {(showAllPeople || addMembersSearchTerm) ? (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {filteredAvailablePeople.map(person => (
                      <div key={person.id} className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors">
                        <Avatar className="w-10 h-10 flex-shrink-0">
                          <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${person.name}`} />
                          <AvatarFallback className="text-xs">{person.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{person.name}</div>
                          <div className="text-xs text-gray-600">{person.ageGroup} • {person.guides.join(', ')}</div>
                          <div className="text-xs text-gray-500 truncate">{person.email}</div>
                        </div>
                        <div className="flex items-center space-x-2 flex-shrink-0">
                          {onShowPersonDetails && (
                            <Button
                              onClick={() => onShowPersonDetails(person)}
                              variant="outline"
                              size="sm"
                              className="text-blue-600 hover:text-blue-800 text-xs h-8 w-8 p-0"
                            >
                              👁️
                            </Button>
                          )}
                          <Button
                            onClick={() => {
                              handleAddToGroup(person.id, selectedGroup.id);
                              // Optionally clear search after adding
                              // setAddMembersSearchTerm('');
                            }}
                            variant="outline"
                            size="sm"
                            className="text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200 text-xs h-8 px-3"
                          >
                            + Add
                          </Button>
                        </div>
                      </div>
                    ))}
                    
                    {filteredAvailablePeople.length === 0 && addMembersSearchTerm && (
                      <div className="text-center text-gray-500 py-8">
                        <div className="text-2xl mb-2">🔍</div>
                        <div className="text-sm">No people found matching "{addMembersSearchTerm}"</div>
                        <div className="text-xs text-gray-400 mt-1">Try different search terms</div>
                      </div>
                    )}
                    
                    {filteredAvailablePeople.length === 0 && !addMembersSearchTerm && showAllPeople && (
                      <div className="text-center text-gray-500 py-8">
                        <div className="text-2xl mb-2">✅</div>
                        <div className="text-sm">All people have been added to this group</div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Helper text when collapsed and not searching */
                  <div className="text-center text-gray-500 py-6 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
                    <div className="text-xl mb-2">🔍</div>
                    <div className="text-sm">Start typing above to search people</div>
                    <div className="text-xs text-gray-400 mt-1">Or click the <strong>+</strong> button to browse all {availablePeople.length} available people</div>
                  </div>
                )}

                {availablePeople.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    <div className="text-2xl mb-2">✅</div>
                    <div className="text-sm">All people have been added to this group</div>
                  </div>
                )}
              </div>
            )}

            {/* Subgroups */}
            {selectedGroup.subGroups && selectedGroup.subGroups.length > 0 && (
              <div>
                <h4 className="text-base font-semibold mb-4">Subgroups</h4>
                <div className="space-y-3">
                  {selectedGroup.subGroups.map(subGroupId => {
                    const subGroup = groups.find(g => g.id === subGroupId);
                    return subGroup ? (
                      <div key={subGroupId} className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <span className="text-base font-medium">{subGroup.name}</span>
                        <Button
                          onClick={() => handleViewMembers(subGroup)}
                          variant="outline"
                          size="sm"
                          className="text-xs h-8"
                        >
                          View
                        </Button>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Bottom Actions */}
        <div className="p-4 border-t border-gray-200 bg-white">
          <Button 
            className="w-full h-12" 
            variant="outline"
            onClick={() => handleEditGroup(selectedGroup)}
          >
            ⚙️ Edit Group Settings
          </Button>
        </div>
      </div>
    );
  }

  // Edit Group View
  if (viewMode === 'edit' && editingGroup) {
    return (
      <div className="h-full flex flex-col bg-white">
        <div className="p-4 border-b border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium">Edit Group</h3>
            <div className="flex space-x-2">
              <Button 
                onClick={() => setViewMode('list')} 
                variant="ghost" 
                size="sm"
                className="h-8 w-8 p-0"
              >
                ←
              </Button>
              <Button onClick={onClose} variant="ghost" size="sm" className="h-8 w-8 p-0">
                ✕
              </Button>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <label className="text-sm font-medium">Group Name</label>
            <Input
              value={editingGroup.name}
              onChange={(e) => setEditingGroup({...editingGroup, name: e.target.value})}
              className="mt-1"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium">Age</label>
            <Input
              value={editingGroup.age || ''}
              onChange={(e) => setEditingGroup({...editingGroup, age: e.target.value})}
              className="mt-1"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium">Guides</label>
            <div className="mt-2 space-y-2">
              {(editingGroup.guides || [{ name: '', phone: '' }]).map((guide, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder="Guide Name"
                    value={guide.name}
                    onChange={(e) => {
                      const newGuides = [...(editingGroup.guides || [])];
                      newGuides[index].name = e.target.value;
                      setEditingGroup({...editingGroup, guides: newGuides});
                    }}
                    className="flex-1"
                  />
                  <Input
                    placeholder="Phone"
                    value={guide.phone}
                    onChange={(e) => {
                      const newGuides = [...(editingGroup.guides || [])];
                      newGuides[index].phone = e.target.value;
                      setEditingGroup({...editingGroup, guides: newGuides});
                    }}
                    className="flex-1"
                  />
                  {(editingGroup.guides?.length || 0) > 1 && (
                    <Button
                      onClick={() => {
                        const newGuides = (editingGroup.guides || []).filter((_, i) => i !== index);
                        setEditingGroup({...editingGroup, guides: newGuides});
                      }}
                      variant="outline"
                      size="sm"
                      className="text-red-500"
                    >
                      ✕
                    </Button>
                  )}
                </div>
              ))}
              <Button
                onClick={() => setEditingGroup({...editingGroup, guides: [...(editingGroup.guides || []), { name: '', phone: '' }]})}
                variant="outline"
                size="sm"
                className="w-full"
              >
                + Add Guide
              </Button>
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium">Notes</label>
            <Textarea
              value={editingGroup.notes || ''}
              onChange={(e) => setEditingGroup({...editingGroup, notes: e.target.value})}
              rows={3}
              className="mt-1"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={editingGroup.isActive}
              onChange={(e) => setEditingGroup({...editingGroup, isActive: e.target.checked})}
            />
            <label className="text-sm">Active Group</label>
          </div>
          
          {editingGroup.joinLink && (
            <div>
              <label className="text-sm font-medium">Join Link</label>
              <div className="flex space-x-2 mt-1">
                <Input value={editingGroup.joinLink} readOnly />
                <Button
                  onClick={() => copyJoinLink(editingGroup.joinLink!)}
                  variant="outline"
                  size="sm"
                >
                  Copy
                </Button>
              </div>
            </div>
          )}
        </div>
        
        <div className="p-4 border-t border-gray-200 space-y-2">
          <div className="flex space-x-2">
            <Button onClick={handleSaveGroup} className="flex-1">
              Save Changes
            </Button>
            <Button 
              onClick={() => setViewMode('list')}
              variant="outline"
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
          <Button 
            onClick={() => editingGroup && handleDeleteGroup(editingGroup.id)}
            variant="outline"
            className="w-full text-red-600 hover:text-red-800 hover:bg-red-50 border-red-300"
          >
            🗑️ Delete Group
          </Button>
        </div>
      </div>
    );
  }

  // Main Groups List View
  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Attendance Groups</h3>
          <Button onClick={onClose} variant="ghost" size="sm" className="h-8 w-8 p-0">
            ✕
          </Button>
        </div>
        <Input
          placeholder="Search groups..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full"
        />
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">
          <div className="flex justify-between text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
            <span>Total Groups: {groups.length}</span>
            <span>Active: {groups.filter(g => g.isActive).length}</span>
          </div>
          
          {filteredGroups.map((group) => (
            <div 
              key={group.id} 
              className={`p-4 rounded-lg border-2 transition-colors ${
                selectedGroupId === group.id 
                  ? 'bg-blue-50 border-blue-300' 
                  : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1 mr-3">
                  <div className="font-semibold text-base mb-1">{group.name}</div>
                  <div className="text-sm text-gray-600">{group.description}</div>
                </div>
                <div className="flex flex-col items-end space-y-2 flex-shrink-0">
                  <Badge variant={group.isActive ? "default" : "secondary"} className="text-xs">
                    {group.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                  {selectedGroupId === group.id && (
                    <Badge variant="outline" className="text-xs bg-blue-100 border-blue-300">
                      Selected
                    </Badge>
                  )}
                </div>
              </div>
              
              <div className="flex justify-between items-center text-sm mb-4 bg-white p-3 rounded border">
                <div className="font-medium text-gray-700">
                  {group.members.length} members
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${
                    group.members.length > 0 ? 'bg-green-400' : 'bg-gray-400'
                  }`}></div>
                  <span className="text-xs text-gray-600 font-medium">
                    {group.members.length > 0 ? 'Active' : 'Empty'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3">
                <Button
                  onClick={() => handleSelectGroup(group)}
                  variant="outline"
                  size="sm"
                  className="text-xs h-10"
                >
                  ✓ Select
                </Button>
                <Button
                  onClick={() => handleViewMembers(group)}
                  variant="outline"
                  size="sm"
                  className="text-xs h-10"
                >
                  👥 Members
                </Button>
              </div>
              
              <div className="flex justify-between items-center">
                <Button
                  onClick={() => handleEditGroup(group)}
                  variant="ghost"
                  size="sm"
                  className="text-xs h-8"
                >
                  ✏️ Edit
                </Button>
                {group.lastSession && (
                  <div className="text-xs text-gray-500">
                    {group.lastSession.toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {filteredGroups.length === 0 && (
            <div className="text-center text-gray-500 py-12">
              <div className="text-4xl mb-4">🏢</div>
              <div className="text-lg font-medium mb-2">No groups found</div>
              <div className="text-sm">Try adjusting your search terms</div>
            </div>
          )}
        </div>
      </div>
      
      {/* Bottom Actions */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <Button 
          className="w-full h-12 text-base" 
          variant="outline"
          onClick={() => setShowCreateForm(true)}
        >
          ➕ Create New Group
        </Button>
      </div>

      {/* Create Group Form */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md bg-white">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-6">Create New Group</h3>
              <div className="space-y-4">
                <Input
                  placeholder="Group Name"
                  value={newGroupForm.name}
                  onChange={(e) => setNewGroupForm({...newGroupForm, name: e.target.value})}
                  className="h-12"
                />
                <Input
                  placeholder="Age"
                  value={newGroupForm.age}
                  onChange={(e) => setNewGroupForm({...newGroupForm, age: e.target.value})}
                  className="h-12"
                />
                
                {/* Guides Section */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Guides</label>
                  {newGroupForm.guides.map((guide, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <Input
                        placeholder="Guide Name"
                        value={guide.name}
                        onChange={(e) => {
                          const newGuides = [...newGroupForm.guides];
                          newGuides[index].name = e.target.value;
                          setNewGroupForm({...newGroupForm, guides: newGuides});
                        }}
                        className="flex-1"
                      />
                      <Input
                        placeholder="Phone"
                        value={guide.phone}
                        onChange={(e) => {
                          const newGuides = [...newGroupForm.guides];
                          newGuides[index].phone = e.target.value;
                          setNewGroupForm({...newGroupForm, guides: newGuides});
                        }}
                        className="flex-1"
                      />
                      {newGroupForm.guides.length > 1 && (
                        <Button
                          onClick={() => {
                            const newGuides = newGroupForm.guides.filter((_, i) => i !== index);
                            setNewGroupForm({...newGroupForm, guides: newGuides});
                          }}
                          variant="outline"
                          size="sm"
                          className="text-red-500"
                        >
                          ✕
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    onClick={() => setNewGroupForm({...newGroupForm, guides: [...newGroupForm.guides, { name: '', phone: '' }]})}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    + Add Guide
                  </Button>
                </div>
                
                <Textarea
                  placeholder="Notes"
                  value={newGroupForm.notes}
                  onChange={(e) => setNewGroupForm({...newGroupForm, notes: e.target.value})}
                  rows={3}
                  className="resize-none"
                />
              </div>
              <div className="flex space-x-3 mt-6">
                <Button onClick={handleCreateGroup} className="flex-1 h-12">
                  Create Group
                </Button>
                <Button 
                  onClick={() => setShowCreateForm(false)}
                  variant="outline"
                  className="flex-1 h-12"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}