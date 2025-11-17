export interface RecognizedFace {
  personId: string;
  personName: string;
  confidence: number;
  box: { x: number; y: number; width: number; height: number };
}

const BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://127.0.0.1:8000';

// Reuse a single canvas/context to avoid heavy allocations every frame
let sharedCanvas: HTMLCanvasElement | null = null;
let sharedCtx: CanvasRenderingContext2D | null = null;

async function toDataURLFromElement(el: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement): Promise<string> {
  if (!sharedCanvas) sharedCanvas = document.createElement('canvas');
  if (!sharedCtx) sharedCtx = sharedCanvas.getContext('2d');
  if (!sharedCtx) throw new Error('Canvas 2D not supported');
  
  let w = 0;
  let h = 0;
  
  if (el instanceof HTMLVideoElement) {
    w = el.videoWidth; 
    h = el.videoHeight;
    
    // Ensure video is ready
    if (w === 0 || h === 0 || el.readyState < 2) {
      throw new Error('Video not ready');
    }
    
    sharedCanvas.width = w; 
    sharedCanvas.height = h;
    sharedCtx.drawImage(el, 0, 0, w, h);
  } else if (el instanceof HTMLCanvasElement) {
    w = el.width; h = el.height;
    sharedCanvas.width = w; sharedCanvas.height = h;
    sharedCtx.drawImage(el, 0, 0, w, h);
  } else {
    const img = el as HTMLImageElement;
    w = img.naturalWidth || img.width; 
    h = img.naturalHeight || img.height;
    sharedCanvas.width = w; sharedCanvas.height = h;
    sharedCtx.drawImage(img, 0, 0, w, h);
  }
  
  const dataURL = sharedCanvas.toDataURL('image/jpeg', 0.7);
  
  // Validate the dataURL before returning
  if (!dataURL || dataURL.length < 100) {
    throw new Error('Invalid image data');
  }
  
  return dataURL;
}

class BackendRecognitionService {
  private initialized = false;
  private activeReportId: string | null = null;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    const res = await fetch(`${BASE_URL}/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model_pack: 'buffalo_l', det_width: 640, det_height: 640 })
    });
    if (!res.ok) throw new Error(`Backend init failed: ${res.status}`);
    this.initialized = true;
  }

  async detect(videoOrImage: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement): Promise<{ x: number; y: number; width: number; height: number }[]> {
    const dataURL = await toDataURLFromElement(videoOrImage);
    return this.detectFromDataURL(dataURL);
  }

  async captureFrame(videoOrImage: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement): Promise<string> {
    return toDataURLFromElement(videoOrImage);
  }

  async detectFromDataURL(dataURL: string): Promise<{ x: number; y: number; width: number; height: number }[]> {
    const res = await fetch(`${BASE_URL}/detect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: dataURL })
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.boxes || []) as any[];
  }

  isReady(): boolean { return this.initialized; }

  async enrollFace(personId: string, personName: string, imageEl: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement): Promise<boolean> {
    const dataURL = await toDataURLFromElement(imageEl);
    const res = await fetch(`${BASE_URL}/enroll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ person_id: personId, person_name: personName, image: dataURL })
    });
    if (!res.ok) {
      try {
        const err = await res.json();
        const detail = err?.detail;
        
        // Handle structured quality error
        if (detail && typeof detail === 'object' && detail.message) {
          const reasons = detail.reasons || [];
          let errorMsg = detail.message;
          if (reasons.length > 0) {
            errorMsg += ':\n• ' + reasons.join('\n• ');
          }
          throw new Error(errorMsg);
        }
        
        // Handle simple string error
        if (typeof detail === 'string') {
          throw new Error(detail);
        }
      } catch (e) {
        // If error is already an Error object we threw above, re-throw it
        if (e instanceof Error) {
          throw e;
        }
        // Otherwise fall through to generic error
      }
      throw new Error('Enrollment failed - photo quality may be too low. Try better lighting and get closer to camera.');
    }
    return true;
  }

  async getEmbedding(imageEl: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement): Promise<number[]> {
    const dataURL = await toDataURLFromElement(imageEl);
    const res = await fetch(`${BASE_URL}/embedding`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: dataURL })
    });
    if (!res.ok) {
      throw new Error(`Embedding generation failed: ${res.status}`);
    }
    const json = await res.json();
    return json.embedding || [];
  }

  async scorePhotoQuality(dataURL: string): Promise<{ passed: boolean; reasons: string[]; metrics: any }> {
    const res = await fetch(`${BASE_URL}/photo/quality`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: dataURL })
    });
    if (!res.ok) throw new Error('Quality check failed');
    const json = await res.json();
    return { passed: !!json.passed, reasons: json.reasons || [], metrics: json.metrics || {} };
  }

  async recognizeFaces(videoOrImage: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement, filterByPersonIds?: string[]): Promise<RecognizedFace[]> {
    return this.recognizeFacesWithGroup(videoOrImage, { filterByPersonIds });
  }

  async recognizeFacesWithGroup(
    videoOrImage: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
    opts?: { filterByPersonIds?: string[]; groupId?: string }
  ): Promise<RecognizedFace[]> {
    try {
      const dataURL = await toDataURLFromElement(videoOrImage);
      return this.recognizeFromDataURL(dataURL, opts);
    } catch (error) {
      // Silently fail and return empty array - don't spam console
      return [];
    }
  }

  async recognizeFromDataURL(
    dataURL: string,
    opts?: { filterByPersonIds?: string[]; groupId?: string; reportId?: string; timestamp?: number }
  ): Promise<RecognizedFace[]> {
    try {
      const res = await fetch(`${BASE_URL}/recognize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: dataURL,
          filter_ids: opts?.filterByPersonIds || null,
          group_id: opts?.groupId || null,
          report_id: opts?.reportId || this.activeReportId,
          timestamp: opts?.timestamp,
        })
      });

      if (!res.ok) {
        console.warn('Backend recognition failed:', res.status);
        return [];
      }

      const json = await res.json();
      const faces = (json.faces || []) as Array<any>;

      return faces.map(f => ({
        personId: f.person_id,
        personName: f.person_name,
        confidence: f.confidence,
        box: f.box,
      }));
    } catch (error) {
      // Silently fail and return empty array - don't spam console
      return [];
    }
  }

  async createPerson(personId: string, personName: string): Promise<void> {
    await fetch(`${BASE_URL}/person`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ person_id: personId, person_name: personName })
    });
  }

  async addGroupMember(groupId: string, personId: string): Promise<void> {
    await fetch(`${BASE_URL}/group/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ group_id: groupId, person_id: personId })
    });
  }

  async removeGroupMember(groupId: string, personId: string): Promise<void> {
    await fetch(`${BASE_URL}/group/remove`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ group_id: groupId, person_id: personId })
    });
  }

  async createGroup(groupId: string, groupName: string): Promise<void> {
    await fetch(`${BASE_URL}/group`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ group_id: groupId, group_name: groupName })
    });
  }

  async fetchGroups(): Promise<{ 
    group_id: string; 
    group_name: string; 
    age?: string; 
    guides_info?: string; 
    notes?: string; 
    members: string[] 
  }[]> {
    const res = await fetch(`${BASE_URL}/groups`);
    if (!res.ok) return [];
    const json = await res.json();
    const groups = (json.groups || []) as Array<{ 
      group_id: string; 
      group_name: string; 
      age?: string; 
      guides_info?: string; 
      notes?: string; 
      members: string[] 
    }>;
    return groups;
  }

  async fetchPeople(): Promise<{ person_id: string; person_name: string }[]> {
    const res = await fetch(`${BASE_URL}/people`);
    if (!res.ok) return [];
    const json = await res.json();
    const people = (json.people || []) as Array<{ person_id: string; person_name: string }>;
    return people;
  }

  async deletePerson(personId: string): Promise<void> {
    await fetch(`${BASE_URL}/person/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ person_id: personId })
    });
  }

  async validateFace(imageDataUrl: string): Promise<{
    score: number;
    quality: string;
    message: string;
    face_count: number;
    face_ratio: number;
    angle_score: number;
    size_score: number;
    recommendation: string;
  }> {
    const response = await fetch(`${BASE_URL}/validate-face`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: imageDataUrl })
    });
    
    if (!response.ok) {
      throw new Error(`Face validation failed: ${response.statusText}`);
    }
    
    return await response.json();
  }

  async processVideoFrame(imageDataUrl: string, timestamp: number): Promise<{
    faces: Array<{
      x: number;
      y: number;
      width: number;
      height: number;
      timestamp: number;
    }>;
    timestamp: number;
  }> {
    const response = await fetch(`${BASE_URL}/process-video-frame`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: imageDataUrl, timestamp, report_id: this.activeReportId })
    });
    
    if (!response.ok) {
      throw new Error(`Video frame processing failed: ${response.statusText}`);
    }
    
    return await response.json();
  }

  async recognizeFromVideo(
    videoFile: File,
    groupId: string,
    groupMemberIds: string[],
    onProgress?: (progress: number) => void
  ): Promise<{
    recognizedPeople: Array<{
      personId: string;
      personName: string;
      confidence: number;
      frameCount: number;
    }>;
    framesProcessed: number;
    totalFacesDetected: number;
  }> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      video.src = URL.createObjectURL(videoFile);
      video.muted = true;
      video.playsInline = true;

      const recognitionMap = new Map<string, { name: string; confidences: number[]; frames: number }>();
      let framesProcessed = 0;
      let totalFacesDetected = 0;
      const frameInterval = 0.5; // Process every 0.5 seconds
      let currentTime = 0;

      video.onloadedmetadata = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        processNextFrame();
      };

      const processNextFrame = async () => {
        if (currentTime >= video.duration) {
          // Processing complete
          URL.revokeObjectURL(video.src);
          
          const results = Array.from(recognitionMap.entries()).map(([id, data]) => ({
            personId: id,
            personName: data.name,
            confidence: data.confidences.reduce((a, b) => a + b, 0) / data.confidences.length,
            frameCount: data.frames
          }));

          console.log(`Video processing complete: ${results.length} people recognized in ${framesProcessed} frames`);

          resolve({
            recognizedPeople: results,
            framesProcessed,
            totalFacesDetected
          });
          return;
        }

        video.currentTime = currentTime;
        
        video.onseeked = async () => {
          try {
            // Draw current frame to canvas
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);

            // Call recognize endpoint
            const faces = await this.recognizeFromDataURL(dataUrl, {
              groupId: groupId,
              reportId: this.activeReportId || undefined,
              timestamp: currentTime
            });

            // Also call process-video-frame to save face crops for the report
            if (this.activeReportId) {
              try {
                await this.processVideoFrame(dataUrl, currentTime);
              } catch (e) {
                // Ignore errors in crop saving
              }
            }
            
            framesProcessed++;
            totalFacesDetected += faces.length;

            // Filter to only include people from the selected group
            if (faces.length > 0) {
              for (const face of faces) {
                const personId = face.personId;
                if (personId && groupMemberIds.includes(personId)) {
                  if (!recognitionMap.has(personId)) {
                    recognitionMap.set(personId, {
                      name: face.personName || 'Unknown',
                      confidences: [],
                      frames: 0
                    });
                  }
                  const entry = recognitionMap.get(personId)!;
                  entry.confidences.push(face.confidence || 0);
                  entry.frames++;
                }
              }
            }

            // Update progress
            const progress = (currentTime / video.duration) * 100;
            if (onProgress) {
              onProgress(progress);
            }

            // Move to next frame
            currentTime += frameInterval;
            processNextFrame();
          } catch (error) {
            console.error('Frame processing error:', error);
            // Continue to next frame even if this one fails
            currentTime += frameInterval;
            processNextFrame();
          }
        };
      };

      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        reject(new Error('Failed to load video'));
      };

      video.load();
    });
  }

  // Photo Management Methods
  async uploadPersonPhoto(personId: string, imageDataUrl: string): Promise<{ filename: string; path: string }> {
    const response = await fetch(`${BASE_URL}/person/photo/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ person_id: personId, image: imageDataUrl })
    });
    
    if (!response.ok) {
      throw new Error(`Photo upload failed: ${response.statusText}`);
    }
    
    return await response.json();
  }

  async deletePersonPhoto(personId: string, filename: string): Promise<void> {
    const response = await fetch(`${BASE_URL}/person/photo/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ person_id: personId, filename })
    });
    
    if (!response.ok) {
      throw new Error(`Photo deletion failed: ${response.statusText}`);
    }
  }

  getPersonPhotoUrl(personId: string, filename: string): string {
    return `${BASE_URL}/person/photo/${personId}/${filename}`;
  }

  // Group Management Methods
  async updateGroup(groupId: string, updates: { groupName?: string; age?: string; guidesInfo?: string; notes?: string }): Promise<void> {
    const response = await fetch(`${BASE_URL}/group/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        group_id: groupId, 
        group_name: updates.groupName,
        age: updates.age,
        guides_info: updates.guidesInfo,
        notes: updates.notes
      })
    });
    
    if (!response.ok) {
      throw new Error(`Group update failed: ${response.statusText}`);
    }
  }

  async deleteGroup(groupId: string): Promise<void> {
    const response = await fetch(`${BASE_URL}/group/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ group_id: groupId })
    });
    
    if (!response.ok) {
      throw new Error(`Group deletion failed: ${response.statusText}`);
    }
  }

  // Test report helpers
  async startTestReport(videoName?: string): Promise<string> {
    const res = await fetch(`${BASE_URL}/test-report/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ video_name: videoName || null })
    });
    if (!res.ok) throw new Error('Failed to start test report');
    const json = await res.json();
    this.activeReportId = json.report_id as string;
    return this.activeReportId;
  }

  async finalizeTestReport(): Promise<any> {
    if (!this.activeReportId) return null;
    const res = await fetch(`${BASE_URL}/test-report/finalize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ report_id: this.activeReportId })
    });
    if (!res.ok) throw new Error('Failed to finalize test report');
    const json = await res.json();
    return json;
  }

  getReportDownloadUrl(reportId?: string): string | null {
    const id = reportId || this.activeReportId;
    if (!id) return null;
    return `${BASE_URL}/test-report/download/${id}`;
  }

  async processPendingEnrollment(pendingId: string): Promise<{
    person_id: string
    name: string
    embeddings_count: number
    photos_uploaded: number
    photo_urls: string[]
  }> {
    const res = await fetch(`${BASE_URL}/process_pending_enrollment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pending_id: pendingId })
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || `Failed to process pending enrollment: ${res.status}`);
    }
    
    return await res.json();
  }
}

export const backendRecognitionService = new BackendRecognitionService();


