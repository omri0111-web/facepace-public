import React, { useState, useRef } from 'react';
import { backendRecognitionService } from '../services/BackendRecognitionService';
import { Group, Person } from '../App';

interface VideoTestPageProps {
  groups: Group[];
  people: Person[];
  onBack: () => void;
}

interface RecognitionResult {
  personId: string;
  personName: string;
  confidence: number;
  frameCount: number;
}

export function VideoTestPage({ groups, people, onBack }: VideoTestPageProps) {
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<RecognitionResult[]>([]);
  const [stats, setStats] = useState({ framesProcessed: 0, facesDetected: 0 });
  const [reportId, setReportId] = useState<string | null>(null);
  const [reportDownloadUrl, setReportDownloadUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      setVideoFile(file);
      setResults([]);
      setStats({ framesProcessed: 0, facesDetected: 0 });
    }
  };

  const handleStartTest = async () => {
    if (!videoFile || !selectedGroupId) return;

    const selectedGroup = groups.find(g => g.id === selectedGroupId);
    if (!selectedGroup) return;

    setIsProcessing(true);
    setProgress(0);
    setResults([]);
    setReportDownloadUrl(null);

    try {
      // Start test report
      const reportId = await backendRecognitionService.startTestReport(videoFile.name);
      setReportId(reportId);

      console.log(`Starting video recognition for group "${selectedGroup.name}" with ${selectedGroup.members.length} members`);

      const result = await backendRecognitionService.recognizeFromVideo(
        videoFile,
        selectedGroupId,
        selectedGroup.members,
        (prog) => setProgress(prog)
      );

      setResults(result.recognizedPeople);
      setStats({
        framesProcessed: result.framesProcessed,
        facesDetected: result.totalFacesDetected
      });

      // Finalize test report
      await backendRecognitionService.finalizeTestReport();
      setReportDownloadUrl(backendRecognitionService.getReportDownloadUrl());
    } catch (error) {
      console.error('Video processing error:', error);
      alert('Failed to process video. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const selectedGroup = groups.find(g => g.id === selectedGroupId);

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={onBack}
            className="text-blue-600 hover:text-blue-800 mb-4 flex items-center"
          >
            ← Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Video Recognition Test
          </h1>
          <p className="text-gray-600">
            Upload a video to test face recognition accuracy against your database
          </p>
        </div>

        {/* Upload Area */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Video File
          </label>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/mov,video/webm"
              onChange={handleFileSelect}
              className="hidden"
            />
            {videoFile ? (
              <div>
                <div className="text-4xl mb-2">📹</div>
                <p className="text-gray-900 font-medium">{videoFile.name}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {(videoFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setVideoFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="mt-2 text-sm text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div>
                <div className="text-4xl mb-2">📁</div>
                <p className="text-gray-600">Click to upload video</p>
                <p className="text-sm text-gray-500 mt-1">MP4, MOV, or WebM</p>
              </div>
            )}
          </div>
        </div>

        {/* Group Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Group to Test Against
          </label>
          <select
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Choose a group...</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name} ({group.members.length} members)
              </option>
            ))}
          </select>
        </div>

        {/* Start Button */}
        <button
          onClick={handleStartTest}
          disabled={!videoFile || !selectedGroupId || isProcessing}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {isProcessing ? 'Processing...' : 'Start Test'}
        </button>

        {/* Progress Bar */}
        {isProcessing && (
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-gray-600 text-center mt-2">
              {progress.toFixed(0)}% complete
            </p>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="mt-8 bg-gray-50 rounded-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Recognition Results
            </h2>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {results.length}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  People Recognized
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-green-600">
                  {stats.framesProcessed}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Frames Processed
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-purple-600">
                  {stats.facesDetected}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Total Faces Detected
                </div>
              </div>
            </div>

            {/* Group Info */}
            {selectedGroup && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800">
                  <strong>Group:</strong> {selectedGroup.name}
                </p>
                <p className="text-sm text-blue-800">
                  <strong>Total Members:</strong> {selectedGroup.members.length}
                </p>
                <p className="text-sm text-blue-800">
                  <strong>Recognition Rate:</strong>{' '}
                  {((results.length / selectedGroup.members.length) * 100).toFixed(1)}%
                </p>
              </div>
            )}

            {/* Recognized People List */}
            <div className="space-y-3">
              <h3 className="font-medium text-gray-900">Recognized People:</h3>
              {results.map((result) => (
                <div
                  key={result.personId}
                  className="bg-white rounded-lg p-4 flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium text-gray-900">{result.personName}</p>
                    <p className="text-sm text-gray-500">
                      Detected in {result.frameCount} frame{result.frameCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-green-600">
                      {(result.confidence * 100).toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-500">confidence</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Download Test Report Button */}
        {reportDownloadUrl && (
          <div className="mt-6">
            <a
              href={reportDownloadUrl}
              className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
              download
            >
              📁 Download Test Report (ZIP)
            </a>
            <p className="text-sm text-gray-600 mt-2">
              Contains summary.json and cropped face images
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

