// Organized console logging utility for FacePace app

const styles = {
  system: 'background: #2563eb; color: white; padding: 2px 6px; border-radius: 3px; font-weight: bold',
  success: 'background: #16a34a; color: white; padding: 2px 6px; border-radius: 3px; font-weight: bold',
  warning: 'background: #ea580c; color: white; padding: 2px 6px; border-radius: 3px; font-weight: bold',
  error: 'background: #dc2626; color: white; padding: 2px 6px; border-radius: 3px; font-weight: bold',
  detection: 'background: #7c3aed; color: white; padding: 2px 6px; border-radius: 3px; font-weight: bold',
  recognition: 'background: #0891b2; color: white; padding: 2px 6px; border-radius: 3px; font-weight: bold',
  count: 'background: #059669; color: white; padding: 2px 6px; border-radius: 3px; font-weight: bold',
};

export const logger = {
  // System initialization and setup
  system: (message: string, data?: any) => {
    console.log(`%c🔧 SYSTEM`, styles.system, message, data !== undefined ? data : '');
  },

  // Successful operations
  success: (message: string, data?: any) => {
    console.log(`%c✅ SUCCESS`, styles.success, message, data !== undefined ? data : '');
  },

  // Warnings
  warning: (message: string, data?: any) => {
    console.warn(`%c⚠️ WARNING`, styles.warning, message, data !== undefined ? data : '');
  },

  // Errors
  error: (message: string, error?: any) => {
    console.error(`%c❌ ERROR`, styles.error, message, error !== undefined ? error : '');
  },

  // Face detection events
  detection: (message: string, count?: number) => {
    console.log(`%c👁️ DETECTION`, styles.detection, message, count !== undefined ? `(${count} faces)` : '');
  },

  // Face recognition events
  recognition: (message: string, data?: any) => {
    console.log(`%c🎯 RECOGNITION`, styles.recognition, message, data !== undefined ? data : '');
  },

  // Attendance counting
  count: (message: string, current: number, total: number) => {
    console.log(`%c📊 COUNT`, styles.count, message, `${current}/${total}`);
  },

  // Group separator for related logs
  group: (title: string, callback: () => void) => {
    console.group(`📦 ${title}`);
    callback();
    console.groupEnd();
  },

  // Clear console with app banner
  clear: () => {
    console.clear();
    console.log('%c🚀 FacePace - Face Recognition Attendance System', 
      'font-size: 16px; font-weight: bold; color: #2563eb; padding: 10px 0;');
    console.log('%cInitialized and ready', 'color: #16a34a; font-weight: bold;');
    console.log('─'.repeat(60));
  },
};

