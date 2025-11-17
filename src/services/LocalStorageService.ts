/**
 * Local Storage Service
 * Manages offline caching of people and groups data
 */

import { Person } from '../types/person';
import { Group } from '../types/group';

const STORAGE_KEYS = {
  PEOPLE: 'facepace_people',
  GROUPS: 'facepace_groups',
  LAST_SYNC: 'facepace_last_sync',
  USER_ID: 'facepace_user_id',
};

export class LocalStorageService {
  /**
   * Save people to local storage
   */
  static savePeople(people: Person[], userId: string): void {
    try {
      const data = {
        userId,
        people,
        timestamp: Date.now(),
      };
      localStorage.setItem(STORAGE_KEYS.PEOPLE, JSON.stringify(data));
      console.log(`💾 Saved ${people.length} people to local storage`);
    } catch (error) {
      console.error('Failed to save people to local storage:', error);
    }
  }

  /**
   * Load people from local storage
   */
  static loadPeople(userId: string): Person[] | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PEOPLE);
      if (!stored) return null;

      const data = JSON.parse(stored);
      
      // Check if data belongs to current user
      if (data.userId !== userId) {
        console.log('🔒 Local storage data belongs to different user');
        return null;
      }

      // Convert date strings back to Date objects
      const people = data.people.map((person: any) => ({
        ...person,
        lastSeen: person.lastSeen ? new Date(person.lastSeen) : undefined,
      }));

      console.log(`📂 Loaded ${people.length} people from local storage`);
      return people;
    } catch (error) {
      console.error('Failed to load people from local storage:', error);
      return null;
    }
  }

  /**
   * Save groups to local storage
   */
  static saveGroups(groups: Group[], userId: string): void {
    try {
      const data = {
        userId,
        groups,
        timestamp: Date.now(),
      };
      localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(data));
      console.log(`💾 Saved ${groups.length} groups to local storage`);
    } catch (error) {
      console.error('Failed to save groups to local storage:', error);
    }
  }

  /**
   * Load groups from local storage
   */
  static loadGroups(userId: string): Group[] | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.GROUPS);
      if (!stored) return null;

      const data = JSON.parse(stored);
      
      // Check if data belongs to current user
      if (data.userId !== userId) {
        console.log('🔒 Local storage data belongs to different user');
        return null;
      }

      // Convert date strings back to Date objects
      const groups = data.groups.map((group: any) => ({
        ...group,
        lastSession: group.lastSession ? new Date(group.lastSession) : undefined,
      }));

      console.log(`📂 Loaded ${groups.length} groups from local storage`);
      return groups;
    } catch (error) {
      console.error('Failed to load groups from local storage:', error);
      return null;
    }
  }

  /**
   * Update last sync timestamp
   */
  static updateLastSync(): void {
    localStorage.setItem(STORAGE_KEYS.LAST_SYNC, Date.now().toString());
  }

  /**
   * Get last sync timestamp
   */
  static getLastSync(): number | null {
    const stored = localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
    return stored ? parseInt(stored) : null;
  }

  /**
   * Clear all local storage (for sign out)
   */
  static clear(): void {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
    console.log('🧹 Cleared local storage');
  }

  /**
   * Check if we're online
   */
  static isOnline(): boolean {
    return navigator.onLine;
  }
}

