import { useState } from 'react';
import { Person, Group, AttendanceRecordType } from '../App';

interface GuideData {
  name: string;
  scouts: Person[];
  groups: Array<{
    group: Group;
    scoutCount: number;
    totalCapacity: number;
  }>;
}

interface HierarchyPanelProps {
  isOpen: boolean;
  onClose: () => void;
  people: Person[];
  groups: Group[];
  records: AttendanceRecordType[];
  onShowPersonDetails: (person: Person) => void;
  onShowRecordDetails: (record: AttendanceRecordType) => void;
}

export function HierarchyPanel({ 
  isOpen, 
  onClose, 
  people, 
  groups, 
  records,
  onShowPersonDetails,
  onShowRecordDetails 
}: HierarchyPanelProps) {
  const [selectedGuide, setSelectedGuide] = useState<string | null>(null);
  const [adminView, setAdminView] = useState<'overview' | 'guides' | 'security' | 'reports'>('overview');

  if (!isOpen) return null;

  // Create guide data structure
  const createGuideData = (): GuideData[] => {
    const guideMap = new Map<string, GuideData>();

    // Initialize guides from all people's guide assignments
    people.forEach(person => {
      person.guides.forEach(guideName => {
        if (!guideMap.has(guideName)) {
          guideMap.set(guideName, {
            name: guideName,
            scouts: [],
            groups: []
          });
        }
        guideMap.get(guideName)!.scouts.push(person);
      });
    });

    // Calculate group memberships for each guide
    guideMap.forEach((guideData, guideName) => {
      const groupMemberships = new Map<string, number>();
      
      guideData.scouts.forEach(scout => {
        scout.groups.forEach(groupId => {
          groupMemberships.set(groupId, (groupMemberships.get(groupId) || 0) + 1);
        });
      });

      guideData.groups = Array.from(groupMemberships.entries())
        .map(([groupId, scoutCount]) => {
          const group = groups.find(g => g.id === groupId);
          if (!group) return null;
          
          return {
            group,
            scoutCount,
            totalCapacity: group.members.length
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)
        .sort((a, b) => b.scoutCount - a.scoutCount); // Sort by most scouts first
    });

    return Array.from(guideMap.values()).sort((a, b) => b.scouts.length - a.scouts.length);
  };

  const guideData = createGuideData();

  // Calculate overall stats
  const totalScouts = people.length;
  const totalGuides = guideData.length;
  const activeGroups = groups.filter(g => g.isActive).length;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-medium text-xl text-gray-900">Guide Hierarchy</h2>
            <p className="text-sm text-gray-600 mt-1">
              {totalGuides} guides • {totalScouts} scouts • {activeGroups} active groups
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {guideData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="text-6xl mb-4">👥</div>
            <h3 className="font-medium text-lg text-gray-900 mb-2">No Guides Found</h3>
            <p className="text-gray-600 text-sm max-w-sm">
              Add scouts with assigned guides to see the hierarchy here.
            </p>
          </div>
        ) : (
          <div className="h-full overflow-y-auto">
            <div className="p-4 space-y-4">
              {guideData.map((guide) => (
                <div
                  key={guide.name}
                  className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden"
                >
                  {/* Guide Header */}
                  <div 
                    className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-100 cursor-pointer hover:from-blue-100 hover:to-purple-100 transition-colors"
                    onClick={() => setSelectedGuide(selectedGuide === guide.name ? null : guide.name)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                          <span className="text-white font-medium text-lg">
                            {guide.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-medium text-lg text-gray-900">{guide.name}</h3>
                          <p className="text-sm text-gray-600">
                            {guide.scouts.length} scout{guide.scouts.length !== 1 ? 's' : ''} • {guide.groups.length} group{guide.groups.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="text-right">
                          <div className="text-sm font-medium text-blue-600">
                            Total: {guide.scouts.length}
                          </div>
                        </div>
                        <div className={`transform transition-transform ${
                          selectedGuide === guide.name ? 'rotate-180' : ''
                        }`}>
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Group Summary Cards */}
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {guide.groups.map((groupData) => (
                        <div
                          key={groupData.group.id}
                          className="bg-white/80 backdrop-blur-sm border border-white/60 rounded-xl p-3"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-gray-900 text-sm">
                                {groupData.group.name}
                              </div>
                              <div className="text-xs text-gray-600 mt-0.5">
                                {groupData.group.description}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-medium text-blue-600">
                                {groupData.scoutCount}/{groupData.totalCapacity}
                              </div>
                              <div className={`w-2 h-2 rounded-full ${
                                groupData.group.isActive ? 'bg-green-400' : 'bg-gray-300'
                              }`}></div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Expanded Scout List */}
                  {selectedGuide === guide.name && (
                    <div className="p-4 bg-gray-50">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-gray-900">Assigned Scouts</h4>
                          <div className="text-sm text-gray-600">
                            {guide.scouts.length} total
                          </div>
                        </div>
                        
                        {guide.groups.map((groupData) => {
                          const groupScouts = guide.scouts.filter(scout => 
                            scout.groups.includes(groupData.group.id)
                          );
                          
                          if (groupScouts.length === 0) return null;
                          
                          return (
                            <div key={groupData.group.id} className="mb-4">
                              <div className="flex items-center space-x-2 mb-2">
                                <div className={`w-3 h-3 rounded-full ${
                                  groupData.group.isActive ? 'bg-green-400' : 'bg-gray-300'
                                }`}></div>
                                <span className="font-medium text-sm text-gray-700">
                                  {groupData.group.name} ({groupScouts.length})
                                </span>
                              </div>
                              
                              <div className="grid grid-cols-1 gap-2">
                                {groupScouts.map((scout) => (
                                  <div
                                    key={scout.id}
                                    className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-200 hover:bg-blue-50/50 transition-colors cursor-pointer"
                                    onClick={() => onShowPersonDetails(scout)}
                                  >
                                    <div className="flex items-center space-x-3">
                                      <div className="w-10 h-10 rounded-full bg-gray-200 border-2 border-gray-300 overflow-hidden flex-shrink-0">
                                        {scout.avatar ? (
                                          <img 
                                            src={scout.avatar} 
                                            alt={scout.name}
                                            className="w-full h-full object-cover"
                                          />
                                        ) : (
                                          <div className="w-full h-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center">
                                            <span className="text-white font-medium text-sm">
                                              {scout.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                      
                                      <div className="flex-1 min-w-0">
                                        <div className="font-medium text-gray-900 text-sm truncate">
                                          {scout.name}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-0.5">
                                          {scout.ageGroup} • Age {scout.age}
                                        </div>
                                        {scout.allergies.length > 0 && (
                                          <div className="flex items-center mt-1">
                                            <span className="text-xs text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                                              {scout.allergies.length} allergie{scout.allergies.length !== 1 ? 's' : ''}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    
                                    <div className="flex items-center space-x-2">
                                      <div className={`w-3 h-3 rounded-full ${
                                        scout.status === 'present' ? 'bg-green-400' :
                                        scout.status === 'absent' ? 'bg-red-400' : 'bg-yellow-400'
                                      }`} title={`Status: ${scout.status}`}></div>
                                      <button className="text-blue-600 hover:text-blue-800 text-xs">
                                        👁️ View
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                        
                        {/* Scouts not in any groups */}
                        {(() => {
                          const scoutsWithoutGroups = guide.scouts.filter(scout => scout.groups.length === 0);
                          if (scoutsWithoutGroups.length === 0) return null;
                          
                          return (
                            <div className="mb-4">
                              <div className="flex items-center space-x-2 mb-2">
                                <div className="w-3 h-3 rounded-full bg-gray-300"></div>
                                <span className="font-medium text-sm text-gray-700">
                                  No Groups ({scoutsWithoutGroups.length})
                                </span>
                              </div>
                              
                              <div className="grid grid-cols-1 gap-2">
                                {scoutsWithoutGroups.map((scout) => (
                                  <div
                                    key={scout.id}
                                    className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-200 hover:bg-blue-50/50 transition-colors cursor-pointer"
                                    onClick={() => onShowPersonDetails(scout)}
                                  >
                                    <div className="flex items-center space-x-3">
                                      <div className="w-10 h-10 rounded-full bg-gray-200 border-2 border-gray-300 overflow-hidden flex-shrink-0">
                                        {scout.avatar ? (
                                          <img 
                                            src={scout.avatar} 
                                            alt={scout.name}
                                            className="w-full h-full object-cover"
                                          />
                                        ) : (
                                          <div className="w-full h-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center">
                                            <span className="text-white font-medium text-sm">
                                              {scout.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                      
                                      <div className="flex-1 min-w-0">
                                        <div className="font-medium text-gray-900 text-sm truncate">
                                          {scout.name}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-0.5">
                                          {scout.ageGroup} • Age {scout.age}
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <div className="flex items-center space-x-2">
                                      <div className={`w-3 h-3 rounded-full ${
                                        scout.status === 'present' ? 'bg-green-400' :
                                        scout.status === 'absent' ? 'bg-red-400' : 'bg-yellow-400'
                                      }`} title={`Status: ${scout.status}`}></div>
                                      <button className="text-blue-600 hover:text-blue-800 text-xs">
                                        👁️ View
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {/* Bottom padding for mobile safe area */}
            <div className="h-20"></div>
          </div>
        )}
      </div>
    </div>
  );
}