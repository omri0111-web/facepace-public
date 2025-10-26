import { useState } from 'react';
import { Person, Group, AttendanceRecordType } from '../App';

interface AttendanceRequest {
  id: string;
  name: string; // e.g., "Bus Check", "Morning Assembly"
  groupIds: string[]; // Array of group IDs this request is sent to
  requiredTime: string; // "now" or specific time like "13:00"
  createdAt: Date;
  completedBy: string[]; // Array of group IDs that have started/completed attendance
  groupStatus: {[groupId: string]: 'started' | 'completed'}; // Track if group started or completed attendance
}

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  people: Person[];
  groups: Group[];
  records: AttendanceRecordType[];
  onShowPersonDetails: (person: Person) => void;
  onShowRecordDetails: (record: AttendanceRecordType) => void;
}

interface GuideData {
  name: string;
  scouts: Person[];
  groups: Array<{
    group: Group;
    scoutCount: number;
    totalCapacity: number;
    lastRecord?: AttendanceRecordType;
  }>;
  recentRecords: AttendanceRecordType[];
  totalRecords: number;
  averageAttendance: number;
}

export function AdminPanel({ 
  isOpen, 
  onClose, 
  people, 
  groups, 
  records,
  onShowPersonDetails,
  onShowRecordDetails 
}: AdminPanelProps) {
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [adminView, setAdminView] = useState<'overview' | 'groups' | 'requests'>('overview');
  const [attendanceRequests, setAttendanceRequests] = useState<AttendanceRequest[]>([
    {
      id: '1',
      name: 'Bus Check',
      groupIds: ['1', '2'],
      requiredTime: 'now',
      createdAt: new Date(Date.now() - 1000 * 60 * 30),
      completedBy: ['1'], // Eagle Patrol completed
      groupStatus: {
        '1': 'completed', // Eagle Patrol completed
        '2': 'started'    // Wolf Pack started but not finished
      }
    },
    {
      id: '2', 
      name: 'Morning Assembly',
      groupIds: ['1', '3', '4'],
      requiredTime: '09:00',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
      completedBy: ['1', '3'], // Eagle Patrol and Bear Cubs completed
      groupStatus: {
        '1': 'completed', // Eagle Patrol completed
        '3': 'completed', // Bear Cubs completed
        '4': 'started'    // Outdoor Explorers started but not finished
      }
    }
  ]);
  const [showNewRequestModal, setShowNewRequestModal] = useState(false);
  const [showRequestDetailsModal, setShowRequestDetailsModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<AttendanceRequest | null>(null);
  const [newRequest, setNewRequest] = useState({
    name: '',
    selectedGroups: [] as string[],
    requiredTime: 'now'
  });

  if (!isOpen) return null;

  // Create enhanced guide data with attendance records
  const createGuideData = (): GuideData[] => {
    const guideMap = new Map<string, GuideData>();

    // Initialize guides from all people's guide assignments
    people.forEach(person => {
      person.guides.forEach(guideName => {
        if (!guideMap.has(guideName)) {
          guideMap.set(guideName, {
            name: guideName,
            scouts: [],
            groups: [],
            recentRecords: [],
            totalRecords: 0,
            averageAttendance: 0
          });
        }
        guideMap.get(guideName)!.scouts.push(person);
      });
    });

    // Calculate group memberships and attendance for each guide
    guideMap.forEach((guideData, guideName) => {
      const groupMemberships = new Map<string, number>();
      
      guideData.scouts.forEach(scout => {
        scout.groups.forEach(groupId => {
          groupMemberships.set(groupId, (groupMemberships.get(groupId) || 0) + 1);
        });
      });

      // Get guide's records (records where they are responsible for the group)
      const guideRecords = records.filter(record => {
        const group = groups.find(g => g.name === record.groupName);
        if (!group) return false;
        
        // Check if this guide has scouts in this group
        const groupScouts = people.filter(person => group.members.includes(person.id));
        return groupScouts.some(scout => scout.guides.includes(guideName));
      });

      guideData.recentRecords = guideRecords.slice(0, 3); // Last 3 records
      guideData.totalRecords = guideRecords.length;
      
      // Calculate average attendance
      if (guideRecords.length > 0) {
        const totalAttendance = guideRecords.reduce((sum, record) => 
          sum + (record.finalPresentCount / record.totalCapacity), 0);
        guideData.averageAttendance = (totalAttendance / guideRecords.length) * 100;
      }

      guideData.groups = Array.from(groupMemberships.entries())
        .map(([groupId, scoutCount]) => {
          const group = groups.find(g => g.id === groupId);
          if (!group) return null;
          
          // Find the most recent record for this group
          const lastRecord = records
            .filter(r => r.groupName === group.name)
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
          
          return {
            group,
            scoutCount,
            totalCapacity: group.members.length,
            lastRecord
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)
        .sort((a, b) => b.scoutCount - a.scoutCount);
    });

    return Array.from(guideMap.values()).sort((a, b) => b.scouts.length - a.scouts.length);
  };

  const guideData = createGuideData();

  // Calculate security and overview stats
  const totalScouts = people.length;
  const totalGuides = guideData.length;
  const activeGroups = groups.filter(g => g.isActive).length;
  const recentRecords = records.slice(0, 5);
  
  // Security tracking
  const securityAlerts = records.filter(record => {
    return record.security?.transportStatus === 'bus' || 
           (record.finalPresentCount / record.totalCapacity) < 0.5;
  }).slice(0, 3);

  const renderOverview = () => (
    <div className="p-4 space-y-4">
      {/* Stats Cards - Optimized for iPhone 16 Pro */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 shadow-sm">
          <div className="text-2xl font-medium text-blue-900">{totalScouts}</div>
          <div className="text-xs text-blue-600 mt-0.5">Total Scouts</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 shadow-sm">
          <div className="text-2xl font-medium text-green-900">{totalGuides}</div>
          <div className="text-xs text-green-600 mt-0.5">Active Guides</div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 shadow-sm">
          <div className="text-2xl font-medium text-purple-900">{activeGroups}</div>
          <div className="text-xs text-purple-600 mt-0.5">Active Groups</div>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 shadow-sm">
          <div className="text-2xl font-medium text-orange-900">{records.length}</div>
          <div className="text-xs text-orange-600 mt-0.5">Total Records</div>
        </div>
      </div>

      {/* Recent Activity - Compact for mobile */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 shadow-sm">
        <h3 className="font-medium text-gray-900 mb-3">Recent Activity</h3>
        <div className="space-y-2">
          {recentRecords.map((record) => (
            <div 
              key={record.id}
              className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors touch-manipulation active:scale-98 shadow-sm"
              onClick={() => onShowRecordDetails(record)}
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 text-sm">{record.groupName}</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {record.finalPresentCount}/{record.totalCapacity} scouts present
                </div>
              </div>
              <div className="text-xs text-gray-400 font-medium">
                {record.timestamp.toLocaleString([], { 
                  month: 'short', 
                  day: 'numeric',
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </div>
            </div>
          ))}
          {recentRecords.length === 0 && (
            <div className="text-center py-4">
              <div className="text-2xl mb-1">📊</div>
              <div className="text-xs text-gray-500">No recent activity</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderGroups = () => (
    <div className="p-5 space-y-4">
      {/* Add Group Button at the top */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium text-gray-900">Scout Groups</h3>
        <button
          onClick={() => {/* TODO: Add group creation logic */}}
          className="py-2 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          ➕ Add Group
        </button>
      </div>

      {groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-80 text-center p-8">
          <div className="text-8xl mb-6">👥</div>
          <h3 className="text-xl font-medium text-gray-900 mb-3">No Groups Found</h3>
          <p className="text-gray-600 text-base max-w-sm">
            Create groups to manage scouts and patrols.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => {
            const groupRecords = records.filter(r => r.groupName === group.name);
            const lastRecord = groupRecords.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
            
            return (
              <div key={group.id} className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className={`w-4 h-4 rounded-full ${group.isActive ? 'bg-green-400' : 'bg-gray-300'}`}></div>
                      <div>
                        <h3 className="font-medium text-gray-900">{group.name}</h3>
                        <p className="text-sm text-gray-600">{group.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-gray-900">{group.members.length}</div>
                      <div className="text-sm text-gray-500">scouts</div>
                    </div>
                  </div>
                  
                  {lastRecord && (
                    <div className="text-sm text-gray-500 mb-3">
                      Last record: {lastRecord.timestamp.toLocaleDateString()} • {lastRecord.finalPresentCount}/{lastRecord.totalCapacity} present
                    </div>
                  )}
                  
                  <div className="flex space-x-2">
                    <button className="flex-1 py-2 px-3 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-sm font-medium hover:bg-purple-100 transition-colors">
                      📤 Send
                    </button>
                    <button className="py-2 px-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors">
                      🗑️ Remove
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );

  const handleCreateRequest = () => {
    if (!newRequest.name || newRequest.selectedGroups.length === 0) return;
    
    const request: AttendanceRequest = {
      id: Date.now().toString(),
      name: newRequest.name,
      groupIds: newRequest.selectedGroups,
      requiredTime: newRequest.requiredTime,
      createdAt: new Date(),
      completedBy: [],
      groupStatus: {}
    };
    
    setAttendanceRequests(prev => [request, ...prev]);
    setNewRequest({ name: '', selectedGroups: [], requiredTime: 'now' });
    setShowNewRequestModal(false);
  };

  const renderRequests = () => (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium text-gray-900">Attendance Requests</h3>
        <button
          onClick={() => setShowNewRequestModal(true)}
          className="py-2 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          ➕ New Request
        </button>
      </div>

      {attendanceRequests.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-80 text-center p-8">
          <div className="text-8xl mb-6">📋</div>
          <h3 className="text-xl font-medium text-gray-900 mb-3">No Requests Yet</h3>
          <p className="text-gray-600 text-base max-w-sm">
            Create attendance requests to send to specific groups.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {attendanceRequests.map((request) => {
            const requestGroups = groups.filter(g => request.groupIds.includes(g.id));
            const totalGroups = requestGroups.length;
            const completedGroups = request.completedBy.length;
            const completionRate = totalGroups > 0 ? (completedGroups / totalGroups) * 100 : 0;
            
            // Categorize groups by status
            const finishedGroups = requestGroups.filter(g => request.completedBy.includes(g.id));
            const pendingGroups = requestGroups.filter(g => 
              request.groupStatus[g.id] === 'started' && !request.completedBy.includes(g.id)
            );
            const notStartedGroups = requestGroups.filter(g => 
              !request.groupStatus[g.id] && !request.completedBy.includes(g.id)
            );
            
            return (
              <div 
                key={request.id} 
                className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden cursor-pointer hover:border-blue-300 hover:shadow-md transition-all duration-200"
                onClick={() => {
                  setSelectedRequest(request);
                  setShowRequestDetailsModal(true);
                }}
              >
                <div className="p-3 sm:p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{request.name}</h4>
                      <div className="text-sm text-gray-600 mt-0.5">
                        {request.requiredTime === 'now' ? 'Immediately' : `At ${request.requiredTime}`}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="text-right">
                        <div className="font-medium text-gray-900 text-base">{completedGroups}/{totalGroups}</div>
                        <div className="text-xs text-gray-500">done</div>
                      </div>
                      <div className="text-gray-400 text-sm">
                        👁️
                      </div>
                    </div>
                  </div>
                  
                  {/* Group status summary */}
                  <div className="mb-2 space-y-1">
                    {/* Finished groups */}
                    {finishedGroups.length > 0 && (
                      <div className="text-xs">
                        <span className="text-green-700 font-medium">Finished:</span>
                        <span className="text-green-600 ml-1">
                          {finishedGroups.map(g => g.name).join(', ')}
                        </span>
                      </div>
                    )}
                    
                    {/* Pending groups */}
                    {pendingGroups.length > 0 && (
                      <div className="text-xs">
                        <span className="text-yellow-700 font-medium">Pending:</span>
                        <span className="text-yellow-600 ml-1">
                          {pendingGroups.map(g => g.name).join(', ')}
                        </span>
                      </div>
                    )}
                    
                    {/* Haven't started groups */}
                    {notStartedGroups.length > 0 && (
                      <div className="text-xs">
                        <span className="text-red-700 font-medium">Haven't started:</span>
                        <span className="text-red-600 ml-1">
                          {notStartedGroups.map(g => g.name).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <div className="text-gray-500 text-xs">
                      {request.createdAt.toLocaleString([], { 
                        month: 'short', 
                        day: 'numeric',
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </div>
                    <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      completionRate === 100 ? 'bg-green-100 text-green-800' :
                      completionRate > 0 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {completionRate.toFixed(0)}%
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Request Modal */}
      {showNewRequestModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md sm:w-full max-h-[95vh] overflow-hidden flex flex-col">
            <div className="p-3 sm:p-4 border-b border-gray-100">
              <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-3 sm:hidden"></div>
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-lg">New Request</h3>
                <button
                  onClick={() => setShowNewRequestModal(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Request Name</label>
                <input
                  type="text"
                  value={newRequest.name}
                  onChange={(e) => setNewRequest(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Bus Check, Morning Assembly"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Required Time</label>
                <select
                  value={newRequest.requiredTime}
                  onChange={(e) => setNewRequest(prev => ({ ...prev, requiredTime: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                >
                  <option value="now">Now</option>
                  <option value="08:00">08:00</option>
                  <option value="09:00">09:00</option>
                  <option value="10:00">10:00</option>
                  <option value="11:00">11:00</option>
                  <option value="12:00">12:00</option>
                  <option value="13:00">13:00</option>
                  <option value="14:00">14:00</option>
                  <option value="15:00">15:00</option>
                  <option value="16:00">16:00</option>
                  <option value="17:00">17:00</option>
                  <option value="18:00">18:00</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Groups</label>
                <div className="space-y-2 max-h-44 overflow-y-auto border border-gray-200 rounded-lg p-2">
                  {groups.map(group => (
                    <label key={group.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={newRequest.selectedGroups.includes(group.id)}
                        onChange={(e) => {
                          setNewRequest(prev => ({
                            ...prev,
                            selectedGroups: e.target.checked 
                              ? [...prev.selectedGroups, group.id]
                              : prev.selectedGroups.filter(id => id !== group.id)
                          }));
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 text-sm">{group.name}</div>
                        <div className="text-xs text-gray-500">{group.members.length} scouts • {group.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="p-3 sm:p-4 border-t border-gray-100">
              <button
                onClick={handleCreateRequest}
                disabled={!newRequest.name || newRequest.selectedGroups.length === 0}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-base"
              >
                Send Request
              </button>
              <div className="h-3 sm:hidden"></div>
            </div>
          </div>
        </div>
      )}

      {/* Request Details Modal */}
      {showRequestDetailsModal && selectedRequest && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md sm:w-full max-h-[95vh] overflow-hidden flex flex-col">
            <div className="p-3 sm:p-4 border-b border-gray-100">
              <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-3 sm:hidden"></div>
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-lg">{selectedRequest.name} Records</h3>
                <button
                  onClick={() => {
                    setShowRequestDetailsModal(false);
                    setSelectedRequest(null);
                  }}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                >
                  ✕
                </button>
              </div>
              <div className="mt-1 space-y-1">
                <div className="text-sm text-gray-600">
                  Required: {selectedRequest.requiredTime === 'now' ? 'Immediately' : `At ${selectedRequest.requiredTime}`}
                </div>
                <div className="text-xs text-gray-500">
                  Created {selectedRequest.createdAt.toLocaleString([], { 
                    month: 'short', 
                    day: 'numeric',
                    hour: '2-digit', 
                    minute: '2-digit'
                  })}
                </div>
                <div className="text-sm font-medium text-blue-600">
                  {selectedRequest.completedBy.length}/{selectedRequest.groupIds.length} groups completed
                </div>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {/* Attendance Records for this request */}
              <div className="p-3 sm:p-4">
                <h4 className="font-medium text-gray-900 mb-3">Attendance Records</h4>
                
                {/* Filter records by groups in this request */}
                {(() => {
                  const requestGroupNames = groups
                    .filter(g => selectedRequest.groupIds.includes(g.id))
                    .map(g => g.name);
                  
                  const requestRecords = records.filter(record => 
                    requestGroupNames.includes(record.groupName)
                  ).slice(0, 10); // Latest 10 records
                  
                  if (requestRecords.length === 0) {
                    return (
                      <div className="text-center py-8">
                        <div className="text-4xl mb-2">📋</div>
                        <div className="text-sm text-gray-500">No attendance records yet</div>
                        <div className="text-xs text-gray-400 mt-1">Records will appear when groups complete attendance</div>
                      </div>
                    );
                  }
                  
                  return (
                    <div className="space-y-3">
                      {requestRecords.map((record) => {
                        const group = groups.find(g => g.name === record.groupName);
                        const completionRate = Math.round((record.finalPresentCount / record.totalCapacity) * 100);
                        
                        return (
                          <div
                            key={record.id}
                            className="bg-gray-50 border border-gray-100 rounded-xl p-3 cursor-pointer hover:bg-gray-100 transition-colors"
                            onClick={() => onShowRecordDetails(record)}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="font-medium text-gray-900">
                                {record.finalPresentCount}/{record.totalCapacity} scouts
                              </div>
                              <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full font-medium">
                                {record.groupName}
                              </div>
                            </div>
                            
                            <div className="text-xs text-gray-500 mb-2">
                              {record.timestamp.toLocaleString([], { 
                                weekday: 'short',
                                month: 'short', 
                                day: 'numeric',
                                hour: '2-digit', 
                                minute: '2-digit'
                              })}
                              {record.guideName && (
                                <span className="ml-2">• by {record.guideName}</span>
                              )}
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <div className={`text-xs px-2 py-1 rounded-full font-medium ${
                                  completionRate >= 80 ? 'bg-green-100 text-green-700' :
                                  completionRate >= 60 ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-red-100 text-red-700'
                                }`}>
                                  {completionRate}% present
                                </div>
                                {record.manualAttendance && Object.keys(record.manualAttendance).length > 0 && (
                                  <div className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded-full">
                                    Manual: {Object.values(record.manualAttendance).filter(s => s === 'present').length}
                                  </div>
                                )}
                              </div>
                              <div className="text-xs text-gray-400">
                                👁️ Details
                              </div>
                            </div>
                            
                            {record.activity && (
                              <div className="text-xs text-gray-600 mt-1 bg-gray-100 px-2 py-1 rounded">
                                {record.activity}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
              
              {/* Group Status Summary - Show status of all groups */}
              <div className="border-t border-gray-100 bg-gray-50 p-3 sm:p-4">
                <h4 className="font-medium text-gray-900 mb-3">Status Summary</h4>
                <div className="grid grid-cols-1 gap-2">
                  {/* Completed Groups */}
                  {selectedRequest.completedBy.length > 0 && (
                    <div className="p-2 bg-green-50 rounded-lg border border-green-200">
                      <div className="text-sm text-green-700 font-medium mb-1">
                        ✓ {selectedRequest.completedBy.length} Completed
                      </div>
                      <div className="text-xs text-green-600">
                        {groups
                          .filter(g => selectedRequest.completedBy.includes(g.id))
                          .map(g => g.name)
                          .join(', ')}
                      </div>
                    </div>
                  )}
                  
                  {/* Started Groups */}
                  {(() => {
                    const startedNotCompleted = groups.filter(g => 
                      selectedRequest.groupIds.includes(g.id) && 
                      selectedRequest.groupStatus[g.id] === 'started' && 
                      !selectedRequest.completedBy.includes(g.id)
                    );
                    
                    return startedNotCompleted.length > 0 && (
                      <div className="p-2 bg-yellow-50 rounded-lg border border-yellow-200">
                        <div className="text-sm text-yellow-700 font-medium mb-1">
                          ⏳ {startedNotCompleted.length} Started
                        </div>
                        <div className="text-xs text-yellow-600">
                          {startedNotCompleted.map(g => g.name).join(', ')}
                        </div>
                      </div>
                    );
                  })()}
                  
                  {/* Pending Groups */}
                  {(() => {
                    const pendingGroups = groups.filter(g => 
                      selectedRequest.groupIds.includes(g.id) && 
                      !selectedRequest.groupStatus[g.id] && 
                      !selectedRequest.completedBy.includes(g.id)
                    );
                    
                    return pendingGroups.length > 0 && (
                      <div className="p-2 bg-red-50 rounded-lg border border-red-200">
                        <div className="text-sm text-red-700 font-medium mb-1">
                          🕐 {pendingGroups.length} Pending
                        </div>
                        <div className="text-xs text-red-600">
                          {pendingGroups.map(g => g.name).join(', ')}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
            
            <div className="flex-shrink-0 pb-4 sm:pb-0">
              <div className="h-4 sm:hidden"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-white">
      {/* Header - Optimized for iPhone 16 Pro */}
      <div className="bg-white border-b border-gray-200 p-3 flex flex-col">
        <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-3 sm:hidden"></div>
        
        {/* Title - Always visible */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-medium text-gray-900">Admin Control Center</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
          >
            ✕
          </button>
        </div>
        
        {/* Navigation Tabs */}
        <div className="flex bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => setAdminView('overview')}
            className={`flex-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
              adminView === 'overview' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setAdminView('groups')}
            className={`flex-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
              adminView === 'groups' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Groups
          </button>
          <button
            onClick={() => setAdminView('requests')}
            className={`flex-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
              adminView === 'requests' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Requests
          </button>
        </div>
      </div>

      {/* Content - Safe area for iPhone 16 Pro */}
      <div className="flex-1 overflow-y-auto pb-safe">
        {adminView === 'overview' && renderOverview()}
        {adminView === 'groups' && renderGroups()}
        {adminView === 'requests' && renderRequests()}
      </div>
    </div>
  );
}