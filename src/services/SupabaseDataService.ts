import { supabase } from '../lib/supabase'
import type { Person, Group, GroupMember, FaceEmbedding, EnrollmentLink } from '../lib/supabase'

/**
 * SupabaseDataService handles all data CRUD operations via Supabase
 * Face recognition operations still go through BackendRecognitionService -> Railway
 */
class SupabaseDataService {
  // ============================================================================
  // PEOPLE OPERATIONS
  // ============================================================================

  /**
   * Fetch all people for the current user
   */
  async fetchPeople(userId: string): Promise<Person[]> {
    const { data, error } = await supabase
      .from('persons')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching people:', error)
      throw error
    }
    
    return data || []
  }

  /**
   * Create a new person
   */
  async createPerson(userId: string, personData: {
    id?: string // Optional: can provide custom UUID
    name: string
    email?: string
    age?: number
    age_group?: string
    parent_name?: string
    parent_phone?: string
    allergies?: string[]
    photo_paths?: string[] // Photo URLs from storage
  }): Promise<Person> {
    const { data, error } = await supabase
      .from('persons')
      .insert({
        id: personData.id, // If provided, uses custom UUID
        user_id: userId,
        name: personData.name,
        email: personData.email || null,
        age: personData.age || null,
        age_group: personData.age_group || null,
        parent_name: personData.parent_name || null,
        parent_phone: personData.parent_phone || null,
        allergies: personData.allergies || [],
        photo_paths: personData.photo_paths || []
      })
      .select()
      .single()
    
    if (error) {
      console.error('Error creating person:', error)
      throw error
    }
    
    return data
  }

  /**
   * Update a person
   */
  async updatePerson(personId: string, updates: Partial<Person>): Promise<Person> {
    const { data, error } = await supabase
      .from('persons')
      .update(updates)
      .eq('id', personId)
      .select()
      .single()
    
    if (error) {
      console.error('Error updating person:', error)
      throw error
    }
    
    return data
  }

  /**
   * Delete a person (also deletes their photos and embeddings via CASCADE)
   */
  async deletePerson(personId: string): Promise<void> {
    // Delete photos from storage
    const { data: person } = await supabase
      .from('persons')
      .select('user_id, photo_paths')
      .eq('id', personId)
      .single()
    
    if (person && person.photo_paths && person.photo_paths.length > 0) {
      // Delete all photos for this person
      const photoPaths = person.photo_paths.map((path: string) => 
        `${person.user_id}/${personId}/${path.split('/').pop()}`
      )
      
      await supabase.storage
        .from('face-photos')
        .remove(photoPaths)
    }
    
    // Delete person record (CASCADE will delete embeddings and group memberships)
    const { error } = await supabase
      .from('persons')
      .delete()
      .eq('id', personId)
    
    if (error) {
      console.error('Error deleting person:', error)
      throw error
    }
  }

  /**
   * Get a single person by ID
   */
  async getPerson(personId: string): Promise<Person | null> {
    const { data, error } = await supabase
      .from('persons')
      .select('*')
      .eq('id', personId)
      .single()
    
    if (error) {
      console.error('Error fetching person:', error)
      return null
    }
    
    return data
  }

  // ============================================================================
  // PHOTO OPERATIONS
  // ============================================================================

  /**
   * Upload a photo for a person
   * Returns the public URL of the uploaded photo
   * Note: The person record doesn't need to exist yet - photos can be uploaded first
   */
  async uploadPersonPhoto(
    userId: string,
    personId: string,
    photoFile: File | Blob,
    photoId?: string
  ): Promise<string> {
    const timestamp = Date.now()
    const filename = photoId || `photo_${timestamp}.jpg`
    const filepath = `${userId}/${personId}/${filename}`
    
    const { data, error } = await supabase.storage
      .from('face-photos')
      .upload(filepath, photoFile, {
        cacheControl: '3600',
        upsert: false
      })
    
    if (error) {
      console.error('Error uploading photo:', error)
      throw error
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('face-photos')
      .getPublicUrl(filepath)
    
    return publicUrl
  }

  /**
   * Delete a photo for a person
   */
  async deletePersonPhoto(userId: string, personId: string, photoUrl: string): Promise<void> {
    // Extract filepath from URL
    const filepath = photoUrl.split('/').slice(-3).join('/')
    
    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('face-photos')
      .remove([filepath])
    
    if (storageError) {
      console.error('Error deleting photo from storage:', storageError)
    }
    
    // Update person's photo_paths
    const { data: person } = await supabase
      .from('persons')
      .select('photo_paths')
      .eq('id', personId)
      .single()
    
    if (person) {
      const updatedPhotoPaths = (person.photo_paths || []).filter(
        (path: string) => path !== photoUrl
      )
      
      await supabase
        .from('persons')
        .update({ photo_paths: updatedPhotoPaths })
        .eq('id', personId)
    }
  }

  /**
   * Get photo URL for display
   * If photo is already a full URL, returns it. Otherwise constructs the URL.
   */
  getPersonPhotoUrl(userId: string, personId: string, photoPath: string): string {
    // If already a full URL, return as is
    if (photoPath.startsWith('http')) {
      return photoPath
    }
    
    // Otherwise construct the storage URL
    const filepath = `${userId}/${personId}/${photoPath}`
    const { data: { publicUrl } } = supabase.storage
      .from('face-photos')
      .getPublicUrl(filepath)
    
    return publicUrl
  }

  // ============================================================================
  // GROUPS OPERATIONS
  // ============================================================================

  /**
   * Fetch all groups for the current user
   */
  async fetchGroups(userId: string): Promise<Group[]> {
    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching groups:', error)
      throw error
    }
    
    return data || []
  }

  /**
   * Create a new group
   */
  async createGroup(userId: string, groupData: {
    id?: string
    name: string
    description?: string
    age?: string
    guides_info?: any
    notes?: string
    capacity?: number
  }): Promise<Group> {
    const { data, error } = await supabase
      .from('groups')
      .insert({
        id: groupData.id,
        user_id: userId,
        name: groupData.name,
        description: groupData.description || null,
        age: groupData.age || null,
        guides_info: groupData.guides_info || null,
        notes: groupData.notes || null,
        capacity: groupData.capacity || 0,
        is_active: true
      })
      .select()
      .single()
    
    if (error) {
      console.error('Error creating group:', error)
      throw error
    }
    
    return data
  }

  /**
   * Update a group
   */
  async updateGroup(groupId: string, updates: Partial<Group>): Promise<Group> {
    const { data, error } = await supabase
      .from('groups')
      .update(updates)
      .eq('id', groupId)
      .select()
      .single()
    
    if (error) {
      console.error('Error updating group:', error)
      throw error
    }
    
    return data
  }

  /**
   * Delete a group (also deletes group memberships via CASCADE)
   */
  async deleteGroup(groupId: string): Promise<void> {
    const { error } = await supabase
      .from('groups')
      .delete()
      .eq('id', groupId)
    
    if (error) {
      console.error('Error deleting group:', error)
      throw error
    }
  }

  // ============================================================================
  // GROUP MEMBERSHIP OPERATIONS
  // ============================================================================

  /**
   * Get all members of a group
   */
  async getGroupMembers(groupId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('group_members')
      .select('person_id')
      .eq('group_id', groupId)
    
    if (error) {
      console.error('Error fetching group members:', error)
      throw error
    }
    
    return data.map(m => m.person_id)
  }

  /**
   * Add a person to a group
   */
  async addGroupMember(groupId: string, personId: string): Promise<void> {
    const { error } = await supabase
      .from('group_members')
      .insert({
        group_id: groupId,
        person_id: personId
      })
    
    if (error) {
      // Ignore duplicate key error (already a member)
      if (!error.message.includes('duplicate')) {
        console.error('Error adding group member:', error)
        throw error
      }
    }
  }

  /**
   * Remove a person from a group
   */
  async removeGroupMember(groupId: string, personId: string): Promise<void> {
    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('person_id', personId)
    
    if (error) {
      console.error('Error removing group member:', error)
      throw error
    }
  }

  /**
   * Get all groups a person belongs to
   */
  async getPersonGroups(personId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('person_id', personId)
    
    if (error) {
      console.error('Error fetching person groups:', error)
      throw error
    }
    
    return data.map(m => m.group_id)
  }

  // ============================================================================
  // FACE EMBEDDINGS OPERATIONS
  // ============================================================================

  /**
   * Store a face embedding
   */
  async storeFaceEmbedding(
    personId: string,
    embedding: number[],
    photoUrl: string,
    qualityScore?: number
  ): Promise<FaceEmbedding> {
    const { data, error } = await supabase
      .from('face_embeddings')
      .insert({
        person_id: personId,
        embedding: embedding,
        photo_url: photoUrl,
        quality_score: qualityScore || null
      })
      .select()
      .single()
    
    if (error) {
      console.error('Error storing face embedding:', error)
      throw error
    }
    
    return data
  }

  /**
   * Get all face embeddings for a person
   */
  async getPersonEmbeddings(personId: string): Promise<FaceEmbedding[]> {
    const { data, error } = await supabase
      .from('face_embeddings')
      .select('*')
      .eq('person_id', personId)
    
    if (error) {
      console.error('Error fetching embeddings:', error)
      throw error
    }
    
    return data || []
  }

  /**
   * Get all face embeddings for a user (across all their people)
   */
  async getUserEmbeddings(userId: string): Promise<(FaceEmbedding & { person_name: string })[]> {
    const { data, error } = await supabase
      .from('face_embeddings')
      .select(`
        *,
        persons!inner (
          name,
          user_id
        )
      `)
      .eq('persons.user_id', userId)
    
    if (error) {
      console.error('Error fetching user embeddings:', error)
      throw error
    }
    
    return data.map((item: any) => ({
      ...item,
      person_name: item.persons.name
    })) || []
  }

  /**
   * Delete an embedding
   */
  async deleteEmbedding(embeddingId: string): Promise<void> {
    const { error } = await supabase
      .from('face_embeddings')
      .delete()
      .eq('id', embeddingId)
    
    if (error) {
      console.error('Error deleting embedding:', error)
      throw error
    }
  }

  // ============================================================================
  // ENROLLMENT LINKS OPERATIONS
  // ============================================================================

  /**
   * Create an enrollment link
   */
  async createEnrollmentLink(
    userId: string,
    linkCode: string,
    groupId?: string,
    expiresAt?: Date,
    maxUses?: number
  ): Promise<EnrollmentLink> {
    const { data, error } = await supabase
      .from('enrollment_links')
      .insert({
        link_code: linkCode,
        user_id: userId,
        group_id: groupId || null,
        expires_at: expiresAt?.toISOString() || null,
        max_uses: maxUses || null
      })
      .select()
      .single()
    
    if (error) {
      console.error('Error creating enrollment link:', error)
      throw error
    }
    
    return data
  }

  /**
   * Get enrollment link by code
   */
  async getEnrollmentLink(linkCode: string): Promise<EnrollmentLink | null> {
    const { data, error } = await supabase
      .from('enrollment_links')
      .select('*')
      .eq('link_code', linkCode)
      .single()
    
    if (error) {
      console.error('Error fetching enrollment link:', error)
      return null
    }
    
    // Check if expired
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return null
    }
    
    // Check if max uses reached
    if (data.max_uses && data.used_count >= data.max_uses) {
      return null
    }
    
    return data
  }

  /**
   * Increment used count for an enrollment link
   */
  async incrementEnrollmentLinkUsage(linkId: string): Promise<void> {
    const { error } = await supabase.rpc('increment_enrollment_usage', { link_id: linkId })
    
    // If RPC doesn't exist, do it manually
    if (error && error.message.includes('not found')) {
      const { data: link } = await supabase
        .from('enrollment_links')
        .select('used_count')
        .eq('id', linkId)
        .single()
      
      if (link) {
        await supabase
          .from('enrollment_links')
          .update({ used_count: link.used_count + 1 })
          .eq('id', linkId)
      }
    } else if (error) {
      console.error('Error incrementing enrollment link usage:', error)
    }
  }

  /**
   * Get all enrollment links for a user
   */
  async getUserEnrollmentLinks(userId: string): Promise<EnrollmentLink[]> {
    const { data, error } = await supabase
      .from('enrollment_links')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching enrollment links:', error)
      throw error
    }
    
    return data || []
  }

  /**
   * Delete an enrollment link
   */
  async deleteEnrollmentLink(linkId: string): Promise<void> {
    const { error } = await supabase
      .from('enrollment_links')
      .delete()
      .eq('id', linkId)
    
    if (error) {
      console.error('Error deleting enrollment link:', error)
      throw error
    }
  }
}

// Export singleton instance
export const supabaseDataService = new SupabaseDataService()

