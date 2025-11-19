/**
 * Sync Service - Two-way sync between local storage and Supabase
 * 
 * Strategy:
 * 1. Local storage is always updated immediately (works offline)
 * 2. When online: Auto-save changes to Supabase
 * 3. When online: Sync updates from Supabase in background
 * 4. Offline queue: Store pending changes, sync when back online
 */

import { supabaseDataService } from './SupabaseDataService'
import { LocalStorageService } from './LocalStorageService'
import type { Person, Group } from '../types'

interface PendingChange {
  type: 'create' | 'update' | 'delete'
  entity: 'person' | 'group' | 'group_member'
  id: string
  data?: any
  timestamp: number
}

class SyncService {
  private pendingChanges: PendingChange[] = []
  private isSyncing = false
  private syncInterval: number | null = null

  /**
   * Initialize sync service - start auto-sync if online
   */
  init(userId: string): void {
    // Load pending changes from storage
    this.loadPendingChanges()
    
    // If online, sync pending changes
    if (navigator.onLine) {
      this.syncPendingChanges(userId)
    }
    
    // Listen for online/offline events
    window.addEventListener('online', () => {
      console.log('🌐 Back online - syncing pending changes...')
      this.syncPendingChanges(userId)
    })
    
    window.addEventListener('offline', () => {
      console.log('📵 Gone offline - changes will be queued')
    })
  }

  /**
   * Save person - updates local storage immediately, syncs to Supabase if online
   */
  async savePerson(userId: string, person: Person): Promise<void> {
    // Always save to local storage first (works offline)
    const currentPeople = LocalStorageService.loadPeople(userId) || []
    const existingIndex = currentPeople.findIndex(p => p.id === person.id)
    
    if (existingIndex >= 0) {
      currentPeople[existingIndex] = person
    } else {
      currentPeople.push(person)
    }
    
    LocalStorageService.savePeople(currentPeople, userId)
    
    // Skip Supabase sync if not a valid UUID (old local-only data)
    if (!this.isValidUUID(person.id)) {
      console.log(`💾 Saved person "${person.name}" locally (legacy ID: ${person.id})`)
      return
    }
    
    // If online, save to Supabase immediately
    if (navigator.onLine) {
      try {
        await this.syncPersonToSupabase(userId, person)
        console.log(`✅ Synced person ${person.name} to Supabase`)
      } catch (error) {
        console.warn('⚠️ Failed to sync person to Supabase, queuing:', error)
        this.queueChange('update', 'person', person.id, person)
      }
    } else {
      // Queue for later sync
      this.queueChange('update', 'person', person.id, person)
    }
  }

  /**
   * Delete person - updates local storage immediately, syncs to Supabase if online
   */
  async deletePerson(userId: string, personId: string): Promise<void> {
    // Always update local storage first
    const currentPeople = LocalStorageService.loadPeople(userId) || []
    const filtered = currentPeople.filter(p => p.id !== personId)
    LocalStorageService.savePeople(filtered, userId)
    
    // If online, delete from Supabase immediately
    if (navigator.onLine) {
      try {
        await supabaseDataService.deletePerson(personId)
        console.log(`✅ Deleted person ${personId} from Supabase`)
      } catch (error) {
        console.warn('⚠️ Failed to delete person from Supabase, queuing:', error)
        this.queueChange('delete', 'person', personId)
      }
    } else {
      // Queue for later sync
      this.queueChange('delete', 'person', personId)
    }
  }

  /**
   * Save group - updates local storage immediately, syncs to Supabase if online
   */
  async saveGroup(userId: string, group: Group): Promise<void> {
    // Always save to local storage first
    const currentGroups = LocalStorageService.loadGroups(userId) || []
    const existingIndex = currentGroups.findIndex(g => g.id === group.id)
    
    if (existingIndex >= 0) {
      currentGroups[existingIndex] = group
    } else {
      currentGroups.push(group)
    }
    
    LocalStorageService.saveGroups(currentGroups, userId)
    
    // Skip Supabase sync if not a valid UUID (old local-only data)
    if (!this.isValidUUID(group.id)) {
      console.log(`💾 Saved group "${group.name}" locally (legacy ID: ${group.id})`)
      return
    }
    
    // If online, save to Supabase immediately
    if (navigator.onLine) {
      try {
        await this.syncGroupToSupabase(userId, group)
        console.log(`✅ Synced group ${group.name} to Supabase`)
      } catch (error) {
        console.warn('⚠️ Failed to sync group to Supabase, queuing:', error)
        this.queueChange('update', 'group', group.id, group)
      }
    } else {
      // Queue for later sync
      this.queueChange('update', 'group', group.id, group)
    }
  }

  /**
   * Delete group - updates local storage immediately, syncs to Supabase if online
   */
  async deleteGroup(userId: string, groupId: string): Promise<void> {
    // Always update local storage first
    const currentGroups = LocalStorageService.loadGroups(userId) || []
    const filtered = currentGroups.filter(g => g.id !== groupId)
    LocalStorageService.saveGroups(filtered, userId)
    
    // If online, delete from Supabase immediately
    if (navigator.onLine) {
      try {
        await supabaseDataService.deleteGroup(groupId)
        console.log(`✅ Deleted group ${groupId} from Supabase`)
      } catch (error) {
        console.warn('⚠️ Failed to delete group from Supabase, queuing:', error)
        this.queueChange('delete', 'group', groupId)
      }
    } else {
      // Queue for later sync
      this.queueChange('delete', 'group', groupId)
    }
  }

  /**
   * Add person to group - updates local storage immediately, syncs to Supabase if online
   */
  async addGroupMember(userId: string, groupId: string, personId: string): Promise<void> {
    // Update local storage
    const currentGroups = LocalStorageService.loadGroups(userId) || []
    const group = currentGroups.find(g => g.id === groupId)
    if (group && !group.members.includes(personId)) {
      group.members.push(personId)
      group.memberCount = group.members.length
      LocalStorageService.saveGroups(currentGroups, userId)
    }
    
    // If online, sync to Supabase
    if (navigator.onLine) {
      try {
        await supabaseDataService.addGroupMember(groupId, personId)
        console.log(`✅ Added person ${personId} to group ${groupId} in Supabase`)
      } catch (error) {
        console.warn('⚠️ Failed to sync group member, queuing:', error)
        this.queueChange('update', 'group_member', `${groupId}:${personId}`, { groupId, personId })
      }
    } else {
      this.queueChange('update', 'group_member', `${groupId}:${personId}`, { groupId, personId })
    }
  }

  /**
   * Remove person from group - updates local storage immediately, syncs to Supabase if online
   */
  async removeGroupMember(userId: string, groupId: string, personId: string): Promise<void> {
    // Update local storage
    const currentGroups = LocalStorageService.loadGroups(userId) || []
    const group = currentGroups.find(g => g.id === groupId)
    if (group) {
      group.members = group.members.filter(id => id !== personId)
      group.memberCount = group.members.length
      LocalStorageService.saveGroups(currentGroups, userId)
    }
    
    // If online, sync to Supabase
    if (navigator.onLine) {
      try {
        await supabaseDataService.removeGroupMember(groupId, personId)
        console.log(`✅ Removed person ${personId} from group ${groupId} in Supabase`)
      } catch (error) {
        console.warn('⚠️ Failed to sync group member removal, queuing:', error)
        this.queueChange('delete', 'group_member', `${groupId}:${personId}`)
      }
    } else {
      this.queueChange('delete', 'group_member', `${groupId}:${personId}`)
    }
  }

  /**
   * Sync all data from Supabase to local storage (background sync)
   * 
   * Conflict Resolution Strategy:
   * 1. Supabase is the source of truth
   * 2. Check if local data has pending changes (in queue)
   * 3. If local has pending changes for an item, keep local version and push it to Supabase
   * 4. Otherwise, use Supabase version (it's newer or same)
   */
  async syncFromSupabase(userId: string): Promise<void> {
    if (!navigator.onLine) {
      console.log('📵 Offline - skipping Supabase sync')
      return
    }

    if (this.isSyncing) {
      console.log('🔄 Already syncing, skipping...')
      return
    }

    this.isSyncing = true
    console.log('🔄 Syncing from Supabase...')

    try {
      // First, sync any pending changes TO Supabase (local → cloud)
      await this.syncPendingChanges(userId)

      // Then, sync FROM Supabase (cloud → local)
      const localPeople = LocalStorageService.loadPeople(userId) || []
      const localGroups = LocalStorageService.loadGroups(userId) || []
      
      // Get pending change IDs to know what we're trying to update
      const pendingPersonIds = new Set(
        this.pendingChanges
          .filter(c => c.entity === 'person' && c.type !== 'delete')
          .map(c => c.id)
      )
      const pendingGroupIds = new Set(
        this.pendingChanges
          .filter(c => c.entity === 'group' && c.type !== 'delete')
          .map(c => c.id)
      )

      // Sync people from Supabase
      const supabasePeople = await supabaseDataService.fetchPeople(userId)
      const mergedPeople = supabasePeople.map(supabasePerson => {
        // Check if we have a pending update for this person
        const pendingChange = this.pendingChanges.find(
          c => c.entity === 'person' && c.id === supabasePerson.id && c.type === 'update'
        )
        
        if (pendingChange && pendingChange.data) {
          // We have a pending local change - use local version (will be synced above)
          const localPerson = localPeople.find(p => p.id === supabasePerson.id)
          if (localPerson) {
            console.log(`⚠️ Keeping local version of person ${supabasePerson.name} (has pending changes)`)
            return localPerson
          }
        }
        
        // Use Supabase version (source of truth)
        return {
          id: supabasePerson.id,
          name: supabasePerson.name,
          email: supabasePerson.email || `${supabasePerson.name.toLowerCase().replace(/\s+/g, '.')}@scouts.org`,
          ageGroup: supabasePerson.age_group || '6th Grade',
          age: supabasePerson.age || 11,
          parentName: supabasePerson.parent_name || '',
          parentPhone: supabasePerson.parent_phone || '',
          allergies: supabasePerson.allergies || [],
          guides: [],
          status: 'unknown' as const,
          groups: [],
          photoPaths: supabasePerson.photo_paths || [],
        }
      })

      // Sync groups from Supabase
      const supabaseGroups = await supabaseDataService.fetchGroups(userId)
      const groupIds = supabaseGroups.map(g => g.id)
      const membersByGroup = await supabaseDataService.fetchAllGroupMembers(groupIds)
      
      const mergedGroups = supabaseGroups.map(supabaseGroup => {
        // Check if we have a pending update for this group
        const pendingChange = this.pendingChanges.find(
          c => c.entity === 'group' && c.id === supabaseGroup.id && c.type === 'update'
        )
        
        if (pendingChange && pendingChange.data) {
          // We have a pending local change - use local version
          const localGroup = localGroups.find(g => g.id === supabaseGroup.id)
          if (localGroup) {
            console.log(`⚠️ Keeping local version of group ${supabaseGroup.name} (has pending changes)`)
            return localGroup
          }
        }
        
        // Use Supabase version (source of truth)
        return {
          id: supabaseGroup.id,
          name: supabaseGroup.name,
          description: supabaseGroup.description || '',
          memberCount: membersByGroup[supabaseGroup.id]?.length || 0,
          capacity: 30,
          isActive: true,
          members: membersByGroup[supabaseGroup.id] || [],
          guides: supabaseGroup.guides_info,
          notes: supabaseGroup.notes,
        }
      })

      // Update people with group memberships
      const updatedPeople = mergedPeople.map(person => {
        const personGroups: string[] = []
        Object.entries(membersByGroup).forEach(([groupId, members]) => {
          if (members.includes(person.id)) {
            personGroups.push(groupId)
          }
        })
        return { ...person, groups: personGroups }
      })

      // Save merged data to local storage
      LocalStorageService.saveGroups(mergedGroups, userId)
      LocalStorageService.savePeople(updatedPeople, userId)
      LocalStorageService.updateLastSync()

      console.log(`✅ Synced ${updatedPeople.length} people and ${mergedGroups.length} groups from Supabase`)
    } catch (error) {
      console.error('❌ Failed to sync from Supabase:', error)
    } finally {
      this.isSyncing = false
    }
  }

  /**
   * Sync pending changes when back online
   */
  private async syncPendingChanges(userId: string): Promise<void> {
    if (!navigator.onLine || this.pendingChanges.length === 0) return

    console.log(`🔄 Syncing ${this.pendingChanges.length} pending changes...`)

    const changes = [...this.pendingChanges]
    this.pendingChanges = []

    for (const change of changes) {
      try {
        if (change.type === 'update' && change.entity === 'person' && change.data) {
          await this.syncPersonToSupabase(userId, change.data)
        } else if (change.type === 'delete' && change.entity === 'person') {
          await supabaseDataService.deletePerson(change.id)
        } else if (change.type === 'update' && change.entity === 'group' && change.data) {
          await this.syncGroupToSupabase(userId, change.data)
        } else if (change.type === 'delete' && change.entity === 'group') {
          await supabaseDataService.deleteGroup(change.id)
        } else if (change.entity === 'group_member' && change.data) {
          if (change.type === 'update') {
            await supabaseDataService.addGroupMember(change.data.groupId, change.data.personId)
          } else if (change.type === 'delete') {
            const [groupId, personId] = change.id.split(':')
            await supabaseDataService.removeGroupMember(groupId, personId)
          }
        }
        console.log(`✅ Synced pending change: ${change.entity} ${change.id}`)
      } catch (error) {
        console.warn(`⚠️ Failed to sync pending change, re-queuing:`, error)
        this.pendingChanges.push(change) // Re-queue if failed
      }
    }

    this.savePendingChanges()
  }

  /**
   * Sync person to Supabase
   */
  private async syncPersonToSupabase(userId: string, person: Person): Promise<void> {
    // Skip if person ID is not a valid UUID (old local-only persons)
    if (!this.isValidUUID(person.id)) {
      console.log(`⚠️ Skipping Supabase sync for person "${person.name}" - not a valid UUID: ${person.id}`)
      return
    }

    const personData = {
      name: person.name,
      email: person.email,
      age: person.age,
      age_group: person.ageGroup,
      parent_name: person.parentName,
      parent_phone: person.parentPhone,
      allergies: person.allergies,
      photo_paths: person.photoPaths || [],
    }

    try {
      // Try update first
      await supabaseDataService.updatePerson(person.id, personData)
    } catch (error: any) {
      // If person doesn't exist, create it
      if (error?.code === 'PGRST116' || error?.message?.includes('not found')) {
        await supabaseDataService.createPerson(userId, {
          id: person.id,
          ...personData,
        })
      } else {
        throw error
      }
    }
  }

  /**
   * Check if a string is a valid UUID
   */
  private isValidUUID(id: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    return uuidRegex.test(id)
  }

  /**
   * Sync group to Supabase
   */
  private async syncGroupToSupabase(userId: string, group: Group): Promise<void> {
    // Skip if group ID is not a valid UUID (old local-only groups)
    if (!this.isValidUUID(group.id)) {
      console.log(`⚠️ Skipping Supabase sync for group "${group.name}" - not a valid UUID: ${group.id}`)
      return
    }

    const groupData = {
      name: group.name,
      description: group.description,
      guides_info: group.guides,
      notes: group.notes,
    }

    try {
      // Try update first
      await supabaseDataService.updateGroup(group.id, groupData)
    } catch (error: any) {
      // If group doesn't exist, create it
      if (error?.code === 'PGRST116' || error?.message?.includes('not found')) {
        await supabaseDataService.createGroup(userId, {
          id: group.id,
          ...groupData,
        })
      } else {
        throw error
      }
    }

    // Sync group members
    const currentMembers = group.members || []
    const existingMembers = await supabaseDataService.fetchAllGroupMembers([group.id])
    const existingMemberIds = existingMembers[group.id] || []

    // Add new members
    for (const personId of currentMembers) {
      if (!existingMemberIds.includes(personId)) {
        try {
          await supabaseDataService.addGroupMember(group.id, personId)
        } catch (error) {
          // Ignore duplicate errors
        }
      }
    }

    // Remove old members
    for (const personId of existingMemberIds) {
      if (!currentMembers.includes(personId)) {
        try {
          await supabaseDataService.removeGroupMember(group.id, personId)
        } catch (error) {
          // Ignore errors
        }
      }
    }
  }

  /**
   * Queue a change for later sync
   */
  private queueChange(
    type: 'create' | 'update' | 'delete',
    entity: 'person' | 'group' | 'group_member',
    id: string,
    data?: any
  ): void {
    this.pendingChanges.push({
      type,
      entity,
      id,
      data,
      timestamp: Date.now(),
    })
    this.savePendingChanges()
  }

  /**
   * Save pending changes to local storage
   */
  private savePendingChanges(): void {
    try {
      localStorage.setItem('facepace_pending_changes', JSON.stringify(this.pendingChanges))
    } catch (error) {
      console.error('Failed to save pending changes:', error)
    }
  }

  /**
   * Load pending changes from local storage
   */
  private loadPendingChanges(): void {
    try {
      const stored = localStorage.getItem('facepace_pending_changes')
      if (stored) {
        this.pendingChanges = JSON.parse(stored)
        console.log(`📋 Loaded ${this.pendingChanges.length} pending changes`)
      }
    } catch (error) {
      console.error('Failed to load pending changes:', error)
      this.pendingChanges = []
    }
  }

  /**
   * Get pending changes count
   */
  getPendingChangesCount(): number {
    return this.pendingChanges.length
  }

  /**
   * Clear pending changes (after successful sync)
   */
  clearPendingChanges(): void {
    this.pendingChanges = []
    localStorage.removeItem('facepace_pending_changes')
  }
}

export const syncService = new SyncService()

