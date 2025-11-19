import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { AddPersonModal } from './AddPersonModal';
import { backendRecognitionService } from '../services/BackendRecognitionService';
import { supabaseDataService } from '../services/SupabaseDataService';
import { syncService } from '../services/SyncService';
import { useAuth } from '../hooks/useAuth';
import { logger } from '../utils/logger';

// Helper function to get person's photo URL for avatar
const getPersonPhotoUrl = (person: Person): string => {
  if (person.photoPaths && person.photoPaths.length > 0) {
    // For now, use dicebear as fallback (photos need signed URLs which are loaded on-demand)
    // In the detail modal, we use signed URLs loaded via useEffect
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${person.name}`;
  }
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${person.name}`;
};

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

interface PeoplePanelProps {
  isOpen: boolean;
  onClose: () => void;
  people: Person[];
  setPeople: (people: Person[]) => void;
  groups: Group[];
  setGroups: (groups: Group[]) => void;
  onShowPersonDetails?: (person: Person) => void;
}

export function PeoplePanel({ isOpen, onClose, people, setPeople, groups, setGroups, onShowPersonDetails }: PeoplePanelProps) {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddPersonModal, setShowAddPersonModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [editingPhotos, setEditingPhotos] = useState<Person | null>(null);
  // Store signed URLs for person photos (maps public URL -> signed URL)
  const [signedPhotoUrls, setSignedPhotoUrls] = useState<{[key: string]: string}>({});
  // Store full quality metrics for each photo
  const [photoQualityMetrics, setPhotoQualityMetrics] = useState<{[key: string]: {
    face_width_px: number;
    sharpness: number;
    brightness: number;
    contrast: number;
    roll_abs: number | null;
    passed: boolean;
  }}>({});
  const [uploadNotes, setUploadNotes] = useState<string[]>([]);
  const [showPhotoCamera, setShowPhotoCamera] = useState(false);
  const [photoCameraStream, setPhotoCameraStream] = useState<MediaStream | null>(null);
  const photoCameraVideoRef = useRef<HTMLVideoElement>(null);
  
  // Advanced filters
  const [showFilters, setShowFilters] = useState(false);
  const [ageFilter, setAgeFilter] = useState({ min: '', max: '' });
  const [ageGroupFilter, setAgeGroupFilter] = useState('');
  const [guideFilter, setGuideFilter] = useState('');
  const [allergyFilter, setAllergyFilter] = useState('');
  const [groupFilter, setGroupFilter] = useState<string[]>([]);
  const [newPersonForm, setNewPersonForm] = useState({
    name: '',
    email: '',
    department: '',
    groupId: ''
  });
  const [joinLink, setJoinLink] = useState('');
  const [showJoinLinkForm, setShowJoinLinkForm] = useState(false);

  // Track if we're in the middle of an update to prevent scroll jumps
  const isUpdatingRef = useRef(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Load signed URLs and quality metrics for existing photos when opening photo management
  useEffect(() => {
    if (!editingPhotos) {
      // Clear metrics and signed URLs when closing photo management
      setPhotoQualityMetrics({});
      setUploadNotes([]);
      setSignedPhotoUrls({});
      return;
    }
    
    if (!editingPhotos.photoPaths || editingPhotos.photoPaths.length === 0) {
      return;
    }
    
    // Load signed URLs and quality metrics
    const loadPhotosAndMetrics = async () => {
      try {
        // First, get signed URLs for all photos (authenticated access)
        const signedUrls = await supabaseDataService.getPersonPhotosSignedUrls(editingPhotos.photoPaths!);
        const urlMap: {[key: string]: string} = {};
        editingPhotos.photoPaths!.forEach((publicUrl, index) => {
          urlMap[publicUrl] = signedUrls[index];
        });
        setSignedPhotoUrls(urlMap);
        
        // Then load quality metrics for photos that don't have them yet
        const photosNeedingMetrics = editingPhotos.photoPaths!.filter(
          path => !photoQualityMetrics[path]
        );
        
        if (photosNeedingMetrics.length === 0) {
          return;
        }
        
        for (const publicUrl of photosNeedingMetrics) {
          try {
            const signedUrl = urlMap[publicUrl];
            if (!signedUrl) continue;
            
            // Create an image element and load the signed URL
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            await new Promise((resolve, reject) => {
              img.onload = resolve;
              img.onerror = reject;
              img.src = signedUrl;
            });
            
            // Convert image to base64 using canvas
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) continue;
            
            ctx.drawImage(img, 0, 0);
            const dataURL = canvas.toDataURL('image/jpeg', 0.9);
            
            // Get quality metrics
            try {
              const quality = await backendRecognitionService.scorePhotoQuality(dataURL);
              setPhotoQualityMetrics(prevMetrics => {
                // Check again to avoid overwriting if already set
                if (prevMetrics[publicUrl]) return prevMetrics;
                return {
                  ...prevMetrics,
                  [publicUrl]: {
                    face_width_px: quality.metrics?.face_width_px || 0,
                    sharpness: quality.metrics?.sharpness || 0,
                    brightness: quality.metrics?.brightness || 0,
                    contrast: quality.metrics?.contrast || 0,
                    roll_abs: quality.metrics?.roll_abs || null,
                    passed: quality.passed
                  }
                };
              });
            } catch (err) {
              // Skip if quality check fails
              console.warn('Failed to get quality metrics for photo:', publicUrl, err);
            }
          } catch (err) {
            // Skip if image load fails
            console.warn('Failed to load photo for quality check:', publicUrl, err);
          }
        }
      } catch (error) {
        console.error('Error loading photos and metrics:', error);
      }
    };
    
    loadPhotosAndMetrics();
  }, [editingPhotos?.id, editingPhotos?.photoPaths?.join(',')]);

  // Sync selectedPerson with people prop changes
  // Only update if the person was deleted, not on every change
  useEffect(() => {
    // Skip updates if we're in the middle of an operation
    if (isUpdatingRef.current) {
      isUpdatingRef.current = false;
      return;
    }

    if (selectedPerson) {
      const updatedPerson = people.find(p => p.id === selectedPerson.id);
      if (!updatedPerson) {
        // Person was deleted, clear selection
        setSelectedPerson(null);
      }
    }
  }, [people, selectedPerson]);

  const filteredPeople = people.filter(person => {
    // Text search
    const matchesSearch = searchTerm === '' || 
      person.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      person.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      person.ageGroup.toLowerCase().includes(searchTerm.toLowerCase()) ||
      person.guides.some(guide => guide.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Age filter
    const matchesAge = (!ageFilter.min || person.age >= parseInt(ageFilter.min)) &&
                       (!ageFilter.max || person.age <= parseInt(ageFilter.max));
    
    // Age group filter
    const matchesAgeGroup = !ageGroupFilter || person.ageGroup === ageGroupFilter;
    
    // Guide filter
    const matchesGuide = !guideFilter || person.guides.some(g => g.toLowerCase().includes(guideFilter.toLowerCase()));
    
    // Allergy filter
    const matchesAllergy = !allergyFilter || person.allergies.some(a => a.toLowerCase().includes(allergyFilter.toLowerCase()));
    
    // Group filter
    const matchesGroup = groupFilter.length === 0 || groupFilter.some(gId => person.groups.includes(gId));
    
    return matchesSearch && matchesAge && matchesAgeGroup && matchesGuide && matchesAllergy && matchesGroup;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-500';
      case 'absent': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'present': return 'default';
      case 'absent': return 'destructive';
      default: return 'secondary';
    }
  };

  const handleAddPerson = async (personData: { 
    id: string; // CRITICAL: This ID must match the enrollment ID!
    name: string; 
    email: string;
    ageGroup: string;
    age: number;
    parentName: string;
    parentPhone: string;
    allergies: string[];
    faceData: string;
    avatar?: string;
    photoPaths?: string[];
  }) => {
    if (!user) {
      logger.error('Cannot add person: user not authenticated');
      return;
    }

    try {
      // NOTE: Backend already saved person to Supabase via /enroll_person_direct
      // We just need to fetch the complete data and add to local state
      
      logger.system('Fetching person from Supabase (already saved by backend)...');

      // Fetch the person from Supabase to get the complete data (including photo URLs)
      const supabasePerson = await supabaseDataService.getPerson(personData.id);
      
      if (!supabasePerson) {
        throw new Error('Person not found in Supabase after enrollment');
      }

      // Update local state with complete data from Supabase
      const newPerson: Person = {
        id: supabasePerson.id,
        name: supabasePerson.name,
        email: supabasePerson.email || '',
        ageGroup: supabasePerson.age_group || '',
        age: supabasePerson.age || 0,
        parentName: supabasePerson.parent_name || '',
        parentPhone: supabasePerson.parent_phone || '',
        allergies: supabasePerson.allergies || [],
        guides: [],
        status: 'unknown',
        groups: [],
        avatar: personData.avatar,
        photoPaths: supabasePerson.photo_paths || [],
      };

      // Save to local storage via SyncService (will sync to Supabase if online)
      await syncService.savePerson(user.id, newPerson);
      
      logger.success('Person added', { id: supabasePerson.id, name: supabasePerson.name });
      setPeople([newPerson, ...people]);
      setShowAddPersonModal(false);
    } catch (error) {
      logger.error('Failed to add person to UI', error);
      console.error('Error adding person:', error);
    }
  };

  const handleRemovePerson = async (personId: string) => {
    try {
      // Use SyncService - updates local storage immediately, syncs to Supabase if online
      await syncService.deletePerson(user.id, personId);
      
      // Remove person from all groups in local state
      const updatedGroups = groups.map(group => ({
        ...group,
        members: group.members.filter(id => id !== personId),
        memberCount: group.members.filter(id => id !== personId).length
      }));
      
      // Remove person from people list
      const updatedPeople = people.filter(p => p.id !== personId);
      
      setGroups(updatedGroups);
      setPeople(updatedPeople);

      logger.success('Person deleted', { personId });
    } catch (error) {
      logger.error('Failed to delete person', error);
      console.error('Delete error:', error);
    }
  };

  const handleAddToGroup = (personId: string, groupId: string) => {
    // Save scroll position before update
    const scrollPosition = scrollContainerRef.current?.scrollTop || 0;

    // Set flag to prevent useEffect from triggering
    isUpdatingRef.current = true;

    // Add person to group
    const updatedGroups = groups.map(group => {
      if (group.id === groupId && !group.members.includes(personId)) {
        return {
          ...group,
          members: [...group.members, personId],
          memberCount: group.members.length + 1
        };
      }
      return group;
    });

    // Update person's groups
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

    // Update local state to reflect changes immediately
    if (selectedPerson && selectedPerson.id === personId && !selectedPerson.groups.includes(groupId)) {
      setSelectedPerson({
        ...selectedPerson,
        groups: [...selectedPerson.groups, groupId]
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

  const handleRemoveFromGroup = (personId: string, groupId: string) => {
    // Save scroll position before update
    const scrollPosition = scrollContainerRef.current?.scrollTop || 0;

    // Set flag to prevent useEffect from triggering
    isUpdatingRef.current = true;

    // Remove person from group
    const updatedGroups = groups.map(group => {
      if (group.id === groupId) {
        return {
          ...group,
          members: group.members.filter(id => id !== personId),
          memberCount: group.members.filter(id => id !== personId).length
        };
      }
      return group;
    });

    // Update person's groups
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

    // Update local state to reflect changes immediately
    if (selectedPerson && selectedPerson.id === personId) {
      setSelectedPerson({
        ...selectedPerson,
        groups: selectedPerson.groups.filter(id => id !== groupId)
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

  const handleCreatePersonFromLink = () => {
    if (!newPersonForm.name || !newPersonForm.email) return;

    const newPerson: Person = {
      id: Date.now().toString(),
      name: newPersonForm.name,
      email: newPersonForm.email,
      ageGroup: '6th Grade',
      guides: [],
      age: 11,
      parentName: '',
      parentPhone: '',
      allergies: [],
      status: 'unknown',
      groups: newPersonForm.groupId ? [newPersonForm.groupId] : []
    };

    // Add to selected group if specified
    if (newPersonForm.groupId) {
      const updatedGroups = groups.map(group => {
        if (group.id === newPersonForm.groupId) {
          return {
            ...group,
            members: [...group.members, newPerson.id],
            memberCount: group.members.length + 1
          };
        }
        return group;
      });
      setGroups(updatedGroups);
    }

    setPeople([newPerson, ...people]);
    setNewPersonForm({ name: '', email: '', department: '', groupId: '' });
    setShowJoinLinkForm(false);
  };

  const generateJoinLink = () => {
    const baseUrl = window.location.origin;
    const linkId = Math.random().toString(36).substring(2, 15);
    return `${baseUrl}/join/${linkId}`;
  };

  if (!isOpen) return null;

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">People Database</h3>
          <div className="flex space-x-2">
            <Button 
              onClick={() => setEditMode(!editMode)} 
              variant="ghost" 
              size="sm"
              className="h-8 w-8 p-0"
            >
              {editMode ? '✓' : '✏️'}
            </Button>
            <Button onClick={onClose} variant="ghost" size="sm" className="h-8 w-8 p-0">
              ✕
            </Button>
          </div>
        </div>
        <Input
          placeholder="Search people..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full mb-2"
        />
        
        {/* Advanced Filters Toggle */}
        <Button
          onClick={() => setShowFilters(!showFilters)}
          variant="outline"
          size="sm"
          className="w-full"
        >
          {showFilters ? '▼' : '▶'} Advanced Filters
        </Button>
        
        {/* Advanced Filters Panel */}
        {showFilters && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Min age"
                type="number"
                value={ageFilter.min}
                onChange={(e) => setAgeFilter({ ...ageFilter, min: e.target.value })}
                className="text-sm"
              />
              <Input
                placeholder="Max age"
                type="number"
                value={ageFilter.max}
                onChange={(e) => setAgeFilter({ ...ageFilter, max: e.target.value })}
                className="text-sm"
              />
            </div>
            
            <Select value={ageGroupFilter || 'all'} onValueChange={(val) => setAgeGroupFilter(val === 'all' ? '' : val)}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Age Group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Age Groups</SelectItem>
                <SelectItem value="6th Grade">6th Grade</SelectItem>
                <SelectItem value="7th Grade">7th Grade</SelectItem>
                <SelectItem value="8th Grade">8th Grade</SelectItem>
                <SelectItem value="9th Grade">9th Grade</SelectItem>
              </SelectContent>
            </Select>
            
            <Input
              placeholder="Filter by guide..."
              value={guideFilter}
              onChange={(e) => setGuideFilter(e.target.value)}
              className="text-sm"
            />
            
            <Input
              placeholder="Filter by allergy..."
              value={allergyFilter}
              onChange={(e) => setAllergyFilter(e.target.value)}
              className="text-sm"
            />
            
            {/* Clear Filters Button */}
            <Button
              onClick={() => {
                setAgeFilter({ min: '', max: '' });
                setAgeGroupFilter('');
                setGuideFilter('');
                setAllergyFilter('');
                setGroupFilter([]);
              }}
              variant="ghost"
              size="sm"
              className="w-full text-xs"
            >
              Clear All Filters
            </Button>
          </div>
        )}
      </div>
      
      {/* Content */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-3">
          <div className="flex justify-between text-sm text-gray-600 mb-4 bg-gray-50 p-3 rounded-lg">
            <span>Total: {people.length}</span>
            <span>Present: {people.filter(p => p.status === 'present').length}</span>
          </div>
          
          {filteredPeople.map((person) => (
            <div key={person.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-start space-x-3">
                <div className="relative flex-shrink-0">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={getPersonPhotoUrl(person)} />
                    <AvatarFallback>{person.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                  </Avatar>
                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${getStatusColor(person.status)}`}></div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-base mb-1">{person.name}</div>
                  {/* Email moved to details section */}
                  <div className="text-sm text-gray-600 mb-2">{person.ageGroup} • {person.guides.join(', ')}</div>
                  {person.lastSeen && (
                    <div className="text-xs text-gray-500">
                      Last seen: {person.lastSeen.toLocaleTimeString()}
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center space-x-2">
                      <Badge variant={getStatusBadgeVariant(person.status)} className="text-xs">
                        {person.status}
                      </Badge>
                      {onShowPersonDetails && (
                        <Button
                          onClick={() => onShowPersonDetails(person)}
                          variant="outline"
                          size="sm"
                          className="text-blue-600 hover:text-blue-800 text-xs h-7 px-2"
                        >
                          👁️ Details
                        </Button>
                      )}
                      <Button
                        onClick={() => setEditingPhotos(person)}
                        variant="outline"
                        size="sm"
                        className="text-green-600 hover:text-green-800 text-xs h-7 px-2"
                      >
                        📷 Photos
                      </Button>
                    </div>
                    {editMode && (
                      <Button
                        onClick={() => handleRemovePerson(person.id)}
                        variant="outline"
                        size="sm"
                        className="text-red-500 hover:text-red-700 text-xs h-7"
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Group Management */}
              {editMode && (
                <div className="mt-4 pt-4 border-t border-gray-300">
                  <div className="text-sm font-medium text-gray-700 mb-3">Groups:</div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {person.groups.map(groupId => {
                      const group = groups.find(g => g.id === groupId);
                      return group ? (
                        <Badge key={groupId} variant="outline" className="text-xs px-2 py-1">
                          {group.name}
                          <button
                            onClick={() => handleRemoveFromGroup(person.id, groupId)}
                            className="ml-2 text-red-500 hover:text-red-700 font-bold"
                          >
                            ×
                          </button>
                        </Badge>
                      ) : null;
                    })}
                  </div>
                  <Select onValueChange={(groupId) => handleAddToGroup(person.id, groupId)}>
                    <SelectTrigger className="w-full h-10">
                      <SelectValue placeholder="Add to group..." />
                    </SelectTrigger>
                    <SelectContent>
                      {groups
                        .filter(group => !person.groups.includes(group.id))
                        .map(group => (
                          <SelectItem key={group.id} value={group.id}>
                            {group.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          ))}
          
          {filteredPeople.length === 0 && (
            <div className="text-center text-gray-500 py-12">
              <div className="text-4xl mb-4">👤</div>
              <div className="text-lg font-medium mb-2">No people found</div>
              <div className="text-sm">Try adjusting your search terms</div>
            </div>
          )}
        </div>
      </div>
      
      {/* Bottom Actions */}
      <div className="p-4 border-t border-gray-200 bg-white space-y-3">
        <Button 
          className="w-full h-12 text-base" 
          variant="outline"
          onClick={() => {
            if (!navigator.onLine) {
              alert('📵 You need an internet connection to add new people. Please connect and try again.');
              return;
            }
            setShowAddPersonModal(true);
          }}
        >
          📷 Add New Person (Camera)
        </Button>
        

        
        <Button 
          className="w-full h-12 text-base" 
          variant="outline"
          onClick={() => setJoinLink(generateJoinLink())}
        >
          📤 Generate Join Link
        </Button>
        
        {joinLink && (
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="text-sm font-medium mb-2">Join Link:</div>
            <div className="break-all text-blue-600 text-sm mb-3 bg-white p-2 rounded border">{joinLink}</div>
            <Button
              onClick={() => navigator.clipboard.writeText(joinLink)}
              variant="outline"
              size="sm"
              className="w-full"
            >
              📋 Copy Link
            </Button>
          </div>
        )}
      </div>

      {/* Add Person via Link Form */}
      {showJoinLinkForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md bg-white">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-6">Add Person</h3>
              <div className="space-y-4">
                <Input
                  placeholder="Full Name"
                  value={newPersonForm.name}
                  onChange={(e) => setNewPersonForm({...newPersonForm, name: e.target.value})}
                  className="h-12"
                />
                <Input
                  placeholder="Email"
                  type="email"
                  value={newPersonForm.email}
                  onChange={(e) => setNewPersonForm({...newPersonForm, email: e.target.value})}
                  className="h-12"
                />
                <Input
                  placeholder="Department"
                  value={newPersonForm.department}
                  onChange={(e) => setNewPersonForm({...newPersonForm, department: e.target.value})}
                  className="h-12"
                />
                <Select onValueChange={(value) => setNewPersonForm({...newPersonForm, groupId: value})}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select group (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map(group => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex space-x-3 mt-6">
                <Button onClick={handleCreatePersonFromLink} className="flex-1 h-12">
                  Add Person
                </Button>
                <Button 
                  onClick={() => setShowJoinLinkForm(false)}
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

      {/* Photo Editing Modal */}
      {editingPhotos && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold">📷 Manage Photos - {editingPhotos.name}</h3>
                <Button onClick={() => setEditingPhotos(null)} variant="ghost" size="sm">
                  ✕
                </Button>
              </div>

              {/* Photo Quality Summary - Always show to prevent layout shift */}
              <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200 min-h-[100px]">
                <div className="text-sm font-medium text-blue-900 mb-3">📊 Photo Quality Summary</div>
                {editingPhotos.photoPaths && editingPhotos.photoPaths.length > 0 ? (
                  Object.keys(photoQualityMetrics).length > 0 ? (
                      <>
                        {(() => {
                        const allMetrics = Object.values(photoQualityMetrics) as Array<{
                          face_width_px: number;
                          sharpness: number;
                          brightness: number;
                          contrast: number;
                          roll_abs: number | null;
                          passed: boolean;
                        }>;
                        const widths = allMetrics.map(m => m.face_width_px);
                        const sharpness = allMetrics.map(m => m.sharpness);
                        const brightness = allMetrics.map(m => m.brightness);
                        const contrast = allMetrics.map(m => m.contrast);
                        const passedCount = allMetrics.filter(m => m.passed).length;
                        const totalPhotos = editingPhotos.photoPaths.length;
                        
                        // Calculate overall quality score (0-100)
                        // Combine multiple factors
                        const avgWidth = widths.reduce((a, b) => a + b, 0) / widths.length;
                        const minWidth = Math.min(...widths);
                        const avgSharpness = sharpness.reduce((a, b) => a + b, 0) / sharpness.length;
                        const avgBrightness = brightness.reduce((a, b) => a + b, 0) / brightness.length;
                        const avgContrast = contrast.reduce((a, b) => a + b, 0) / contrast.length;
                        
                        // Face size score (0-25): min width matters most
                        const sizeScore = Math.min(25, (minWidth / 160) * 25); // 160px = 100% of size score
                        
                        // Sharpness score (0-25): threshold is 100, good is 200+
                        const sharpnessScore = Math.min(25, (avgSharpness / 200) * 25);
                        
                        // Brightness score (0-15): ideal is 130 (middle of 60-200)
                        const brightnessScore = avgBrightness < 60 || avgBrightness > 200 
                          ? 0 
                          : Math.min(15, 15 - Math.abs(avgBrightness - 130) / 130 * 15);
                        
                        // Contrast score (0-10): threshold is 30, good is 50+
                        const contrastScore = Math.min(10, (avgContrast / 50) * 10);
                        
                        // Pass rate score (0-25): based on how many photos pass
                        const passRateScore = (passedCount / totalPhotos) * 25;
                        
                        const overallScore = Math.round(sizeScore + sharpnessScore + brightnessScore + contrastScore + passRateScore);
                        const scoreColor = overallScore >= 80 ? 'text-green-700' : overallScore >= 60 ? 'text-yellow-700' : 'text-red-700';
                        const scoreBg = overallScore >= 80 ? 'bg-green-100' : overallScore >= 60 ? 'bg-yellow-100' : 'bg-red-100';
                        
                        return (
                          <>
                            {/* Overall Quality Score */}
                            <div className={`mb-3 p-3 rounded-lg ${scoreBg} border-2 ${overallScore >= 80 ? 'border-green-300' : overallScore >= 60 ? 'border-yellow-300' : 'border-red-300'}`}>
                              <div className="flex items-center justify-between">
                                <div className="text-sm font-semibold text-gray-700">Overall Quality Score</div>
                                <div className={`text-2xl font-bold ${scoreColor}`}>{overallScore}/100</div>
                              </div>
                              <div className="text-xs text-gray-600 mt-1">
                                {overallScore >= 80 ? '✅ Excellent - Ready for recognition' : 
                                 overallScore >= 60 ? '⚠️ Good - Consider adding more photos' : 
                                 '❌ Needs improvement - Add better quality photos'}
                              </div>
                            </div>
                            
                            {/* Detailed Metrics */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                              <div>
                                <div className="text-blue-700 font-medium">Photos</div>
                                <div className="text-blue-900">{totalPhotos} total • {passedCount} passing</div>
                              </div>
                              <div>
                                <div className="text-blue-700 font-medium">Face Size</div>
                                <div className="text-blue-900">Avg: {Math.round(avgWidth)}px • Min: {Math.round(minWidth)}px</div>
                              </div>
                              <div>
                                <div className="text-blue-700 font-medium">Sharpness</div>
                                <div className="text-blue-900">Avg: {Math.round(avgSharpness)} • Best: {Math.round(Math.max(...sharpness))}</div>
                              </div>
                              <div>
                                <div className="text-blue-700 font-medium">Lighting</div>
                                <div className="text-blue-900">Bright: {Math.round(avgBrightness)} • Contrast: {Math.round(avgContrast)}</div>
                              </div>
                            </div>
                          </>
                        );
                        })()}
                      </>
                    ) : (
                    <div className="text-xs text-blue-600">Quality metrics will appear after photos are checked</div>
                  )
                ) : (
                  <div className="text-xs text-blue-600">No photos yet. Upload or capture photos to see quality metrics.</div>
                    )}
                  </div>

              {/* Current Photos Gallery - Reserve space to prevent jumps */}
              <div className="mb-6">
                <h4 className="text-sm font-medium mb-3">Current Photos ({editingPhotos.photoPaths?.length || 0})</h4>
                <div className="grid grid-cols-2 gap-4 min-h-[100px]">
                  {editingPhotos.photoPaths && editingPhotos.photoPaths.length > 0 ? (
                    editingPhotos.photoPaths.map((photoPath, index) => (
                      <div key={index} className="relative aspect-square">
                        <img
                          src={signedPhotoUrls[photoPath] || photoPath}
                          alt={`Photo ${index + 1}`}
                          className="w-full h-full object-cover rounded-lg border-2 border-gray-200"
                        />
                        {photoQualityMetrics[photoPath] && (
                          <div className={`absolute bottom-1 left-1 text-white text-[10px] px-1.5 py-0.5 rounded font-medium ${
                            photoQualityMetrics[photoPath].passed ? 'bg-green-600' : 'bg-red-600'
                          }`}>
                            {photoQualityMetrics[photoPath].passed ? '✓' : '✗'}
                          </div>
                        )}
                        <Button
                          onClick={async () => {
                            if (!confirm('Delete this photo?')) return;
                            try {
                              await backendRecognitionService.deletePersonPhoto(editingPhotos.id, photoPath);
                              const updatedPhotoPaths = editingPhotos.photoPaths?.filter((_, i) => i !== index) || [];
                              const updatedPerson = { ...editingPhotos, photoPaths: updatedPhotoPaths };
                              setEditingPhotos(updatedPerson);
                              setPeople(people.map(p => p.id === editingPhotos.id ? updatedPerson : p));
                              // Remove metrics from state
                              setPhotoQualityMetrics(prev => {
                                const newMetrics = { ...prev };
                                delete newMetrics[photoPath];
                                return newMetrics;
                              });
                            } catch (error) {
                              logger.error('Failed to delete photo', error);
                            }
                          }}
                          variant="destructive"
                          size="sm"
                          className="absolute top-1 right-1 h-7 w-7 p-0 text-white font-bold"
                        >
                          ✕
                        </Button>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-8 text-center py-8 text-gray-500">
                      No photos yet. Add some below!
                    </div>
                  )}
                </div>
              </div>

              {/* Add New Photo */}
              <div className="border-t pt-6">
                {!showPhotoCamera ? (
                  <>
                    <h4 className="text-sm font-medium mb-3">Add New Photos</h4>
                    
                    <div className="grid grid-cols-2 gap-3 mb-4">
                  {/* Upload Photo Button */}
                  <label className="cursor-pointer">
                    <div className="flex items-center justify-center h-12 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors">
                      📤 Upload Photos
                    </div>
                    <Input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={async (e) => {
                        const files = e.target.files;
                        if (!files || files.length === 0) return;

                        for (const file of Array.from(files) as File[]) {
                          try {
                            const reader = new FileReader();
                            reader.onload = async (event) => {
                              const imageDataUrl = event.target?.result as string;
                              
                              // Validate photo quality
                              const quality = await backendRecognitionService.scorePhotoQuality(imageDataUrl);
                              if (!quality.passed) {
                                // Record rejection note
                                setUploadNotes(prev => [
                                  `Rejected: ${[...(quality.reasons||[])].join('; ')}`,
                                  ...prev
                                ].slice(0,5));
                                return;
                              }
                              // Accepted note
                              setUploadNotes(prev => [
                                `Accepted (width ${Math.round(quality.metrics?.face_width_px||0)}px, sharp ${Math.round(quality.metrics?.sharpness||0)})`,
                                ...prev
                              ].slice(0,5));
                              
                              // Upload photo
                              const result = await backendRecognitionService.uploadPersonPhoto(editingPhotos.id, imageDataUrl);
                              
                              // Store full quality metrics
                              setPhotoQualityMetrics(prev => ({
                                ...prev,
                                [result.filename]: {
                                  face_width_px: quality.metrics?.face_width_px || 0,
                                  sharpness: quality.metrics?.sharpness || 0,
                                  brightness: quality.metrics?.brightness || 0,
                                  contrast: quality.metrics?.contrast || 0,
                                  roll_abs: quality.metrics?.roll_abs || null,
                                  passed: quality.passed
                                }
                              }));
                              
                              // Update local state
                              const updatedPhotoPaths = [...(editingPhotos.photoPaths || []), result.filename];
                              const updatedPerson = { ...editingPhotos, photoPaths: updatedPhotoPaths };
                              setEditingPhotos(updatedPerson);
                              setPeople(people.map(p => p.id === editingPhotos.id ? updatedPerson : p));
                            };
                            reader.readAsDataURL(file);
                          } catch (error) {
                            logger.error('Failed to upload photo', error);
                            setUploadNotes(prev => ['Failed to upload photo. Please try again.', ...prev].slice(0,5));
                          }
                        }
                        
                        e.target.value = '';
                      }}
                    />
                  </label>

                  {/* Take Photo Button */}
                  <Button
                    onClick={async () => {
                      setShowPhotoCamera(true);
                      try {
                        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
                        setPhotoCameraStream(stream);
                        if (photoCameraVideoRef.current) {
                          photoCameraVideoRef.current.srcObject = stream;
                        }
                      } catch (error) {
                        logger.error('Failed to start camera', error);
                        alert('Could not access camera');
                        setShowPhotoCamera(false);
                      }
                    }}
                    className="h-12 bg-green-500 hover:bg-green-600"
                  >
                    📷 Take Photo
                  </Button>
                </div>
                
                    <p className="text-xs text-gray-600">
                      💡 Tip: Upload multiple photos from different angles for better face recognition accuracy. Photos are scored 0-100 for quality.
                    </p>
                  </>
                ) : (
                  <>
                    <h4 className="text-sm font-medium mb-3">📷 Take Photo</h4>
                    
                    {/* Reserve fixed height for camera to prevent layout jump */}
                    <div className="relative bg-black rounded-lg overflow-hidden mb-3 h-[300px]">
                      <video
                        ref={photoCameraVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        onClick={async () => {
                          const video = photoCameraVideoRef.current;
                          if (!video || !photoCameraStream) {
                            // Start camera if not running yet
                            try {
                              const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
                              setPhotoCameraStream(stream);
                              if (photoCameraVideoRef.current) {
                                photoCameraVideoRef.current.srcObject = stream;
                              }
                            } catch (error) {
                              logger.error('Failed to start camera', error);
                              setUploadNotes(prev => ['Could not access camera', ...prev].slice(0,5));
                            }
                            return;
                          }
                          
                          // Capture photo from video
                          const canvas = document.createElement('canvas');
                          canvas.width = video.videoWidth;
                          canvas.height = video.videoHeight;
                          const ctx = canvas.getContext('2d');
                          if (!ctx) return;
                          
                          ctx.drawImage(video, 0, 0);
                          const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);
                          
                          try {
                            // Validate photo quality
                            const quality = await backendRecognitionService.scorePhotoQuality(imageDataUrl);
                            if (!quality.passed) {
                              setUploadNotes(prev => [
                                `Rejected: ${[...(quality.reasons||[])].join('; ')}`,
                                ...prev
                              ].slice(0,5));
                              return;
                            }
                            setUploadNotes(prev => [
                              `Accepted (width ${Math.round(quality.metrics?.face_width_px||0)}px, sharp ${Math.round(quality.metrics?.sharpness||0)})`,
                              ...prev
                            ].slice(0,5));
                            
                            // Upload photo
                            const result = await backendRecognitionService.uploadPersonPhoto(editingPhotos.id, imageDataUrl);
                            
                            // Store full quality metrics
                            setPhotoQualityMetrics(prev => ({
                              ...prev,
                              [result.filename]: {
                                face_width_px: quality.metrics?.face_width_px || 0,
                                sharpness: quality.metrics?.sharpness || 0,
                                brightness: quality.metrics?.brightness || 0,
                                contrast: quality.metrics?.contrast || 0,
                                roll_abs: quality.metrics?.roll_abs || null,
                                passed: quality.passed
                              }
                            }));
                            
                            // Update local state
                            const updatedPhotoPaths = [...(editingPhotos.photoPaths || []), result.filename];
                            const updatedPerson = { ...editingPhotos, photoPaths: updatedPhotoPaths };
                            setEditingPhotos(updatedPerson);
                            setPeople(people.map(p => p.id === editingPhotos.id ? updatedPerson : p));
                            
                            // Close camera
                            if (photoCameraStream) {
                              photoCameraStream.getTracks().forEach(track => track.stop());
                              setPhotoCameraStream(null);
                            }
                            setShowPhotoCamera(false);
                          } catch (error) {
                            logger.error('Failed to capture photo', error);
                            setUploadNotes(prev => ['Failed to capture photo. Please try again.', ...prev].slice(0,5));
                          }
                        }}
                        type="button"
                        className="h-12 bg-blue-500 hover:bg-blue-600"
                      >
                        📸 Capture
                      </Button>
                      
                      <Button
                        onClick={() => {
                          if (photoCameraStream) {
                            photoCameraStream.getTracks().forEach(track => track.stop());
                            setPhotoCameraStream(null);
                          }
                          setShowPhotoCamera(false);
                        }}
                        variant="outline"
                        className="h-12"
                      >
                        Cancel
                      </Button>
                    </div>
                  </>
                )}
              </div>

              {/* Recent quality notes - Reserve space to prevent layout jump */}
              <div className="mt-3 min-h-[60px]">
                {uploadNotes.length > 0 && (
                  <div className="text-xs text-gray-800 bg-yellow-50 border border-yellow-200 p-2 rounded">
                    {uploadNotes.map((n,i)=>(
                      <div key={i}>• {n}</div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end mt-6">
                <Button onClick={() => setEditingPhotos(null)} className="px-6">
                  Done
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      <AddPersonModal
        isOpen={showAddPersonModal}
        onClose={() => setShowAddPersonModal(false)}
        onAddPerson={handleAddPerson}
      />
    </div>
  );
}