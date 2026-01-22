import React, { useState, useRef, useCallback, ChangeEvent, useEffect } from 'react';

// --- Type Definitions ---
interface VideoFile {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed';
  story?: string;
  error?: string;
  progress: number;
}

interface JobResponse {
  jobId: string;
  videos: Array<{ id: string; name: string; status: string }>;
}

// --- Helper Icons ---
const UploadIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
  </svg>
);

const VideoIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9A2.25 2.25 0 0 0 13.5 5.25h-9A2.25 2.25 0 0 0 2.25 7.5v9A2.25 2.25 0 0 0 4.5 18.75Z" />
  </svg>
);

const CloseIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
  </svg>
);

const WandIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 0 0-2.122.568l-4.242 4.242a1.5 1.5 0 0 0 2.122 2.122l4.242-4.242a3 3 0 0 0-.568-2.122ZM11.94 12l.568-.568a3 3 0 0 0-4.242-4.242L6.343 8.134a3 3 0 0 0 4.242 4.242l1.355-1.355Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.243-4.243m0 0-1.355-1.355a3 3 0 0 0-4.242-4.242L6.343 12l4.243 4.243 1.355 1.355a3 3 0 0 0 4.242 4.242Z" />
  </svg>
);

const CopyIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
  </svg>
);

const CheckIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
  </svg>
);

const CheckCircleIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

const ExclamationCircleIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
  </svg>
);

// --- API Client ---
const API_BASE_URL = 'https://2025-video-storyteller-backend.onrender.com/api';

async function uploadVideos(files: File[]): Promise<JobResponse> {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('videos', file);
  });

  const response = await fetch(`${API_BASE_URL}/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Upload failed');
  }

  return response.json();
}

async function getJobStatus(jobId: string) {
  const response = await fetch(`${API_BASE_URL}/job/${jobId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch job status');
  }
  return response.json();
}

// --- Main App Component ---
export default function App() {
  const [videoFiles, setVideoFiles] = useState<VideoFile[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedVideoId, setExpandedVideoId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollingIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter((file) => file.type.startsWith('video/'));

    if (validFiles.length !== files.length) {
      setError('Some files were not valid video files and were skipped.');
    } else {
      setError(null);
    }

    if (validFiles.length === 0) {
      return;
    }

    const newVideoFiles: VideoFile[] = validFiles.map((file) => ({
      id: crypto.randomUUID(),
      file,
      status: 'pending',
      progress: 0,
    }));

    setVideoFiles((prev) => [...prev, ...newVideoFiles]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const files = Array.from(e.dataTransfer.files);
    const validFiles = files.filter((file) => file.type.startsWith('video/'));

    if (validFiles.length !== files.length) {
      setError('Some files were not valid video files and were skipped.');
    } else {
      setError(null);
    }

    if (validFiles.length === 0) {
      return;
    }

    const newVideoFiles: VideoFile[] = validFiles.map((file) => ({
      id: crypto.randomUUID(),
      file,
      status: 'pending',
      progress: 0,
    }));

    setVideoFiles((prev) => [...prev, ...newVideoFiles]);
  };

  const removeVideo = (id: string) => {
    setVideoFiles((prev) => prev.filter((v) => v.id !== id));
  };

  const clearAll = () => {
    setVideoFiles([]);
    setJobId(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
  };

  const pollJobStatus = useCallback(async (jobId: string) => {
    try {
      const job = await getJobStatus(jobId);

      setVideoFiles((prev) =>
        prev.map((vf) => {
          const serverVideo = job.videos.find((v: any) => v.originalName === vf.file.name);
          if (serverVideo) {
            return {
              ...vf,
              status: serverVideo.status,
              story: serverVideo.story,
              error: serverVideo.error,
              progress: serverVideo.status === 'completed' ? 100 : serverVideo.status === 'processing' ? 50 : 0,
            };
          }
          return vf;
        })
      );

      // Check if all are done
      const allDone = job.videos.every((v: any) => v.status === 'completed' || v.status === 'failed');
      if (allDone) {
        setIsProcessing(false);
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
        }
      }
    } catch (err: any) {
      console.error('Polling error:', err);
    }
  }, []);

  const handleUploadAndProcess = useCallback(async () => {
    if (videoFiles.length === 0) {
      setError('Please select at least one video file.');
      return;
    }

    if (videoFiles.length > 10) {
      setError('Maximum 10 videos allowed per batch.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Update all to uploading
      setVideoFiles((prev) =>
        prev.map((vf) => ({ ...vf, status: 'uploading' as const, progress: 25 }))
      );

      const files = videoFiles.map((vf) => vf.file);
      const response = await uploadVideos(files);
      setJobId(response.jobId);

      // Update all to processing
      setVideoFiles((prev) =>
        prev.map((vf) => ({ ...vf, status: 'processing' as const, progress: 50 }))
      );

      // Start polling
      pollingIntervalRef.current = window.setInterval(() => {
        pollJobStatus(response.jobId);
      }, 3000);

      // Initial poll
      pollJobStatus(response.jobId);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during upload.');
      setIsProcessing(false);
      setVideoFiles((prev) =>
        prev.map((vf) => ({ ...vf, status: 'failed' as const, error: err.message }))
      );
    }
  }, [videoFiles, pollJobStatus]);

  const getStatusIcon = (status: VideoFile['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-5 h-5 text-green-400" />;
      case 'failed':
        return <ExclamationCircleIcon className="w-5 h-5 text-red-400" />;
      case 'processing':
      case 'uploading':
        return <div className="w-5 h-5 border-2 border-t-transparent border-indigo-400 rounded-full animate-spin"></div>;
      default:
        return <VideoIcon className="w-5 h-5 text-slate-400" />;
    }
  };

  const getStatusText = (status: VideoFile['status']) => {
    switch (status) {
      case 'pending':
        return 'Ready';
      case 'uploading':
        return 'Uploading...';
      case 'processing':
        return 'Processing...';
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
    }
  };

  const copyToClipboard = (text: string, videoId: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(videoId);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
      <main className="w-full max-w-6xl mx-auto bg-slate-800/50 rounded-2xl shadow-2xl shadow-indigo-900/20 backdrop-blur-lg border border-slate-700">
        <div className="p-6 sm:p-8 lg:p-10">
          <header className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 mb-2">
              2025 Video Storyteller
            </h1>
            <p className="text-slate-400 text-base">
              Upload up to 10 videos and watch compelling news stories get crafted about them.
            </p>
          </header>

          <div className="space-y-6">
            {/* File Upload Section */}
            <div className="space-y-4">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="video/*"
                multiple
                className="hidden"
                aria-hidden="true"
              />
              {videoFiles.length === 0 ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  className="w-full flex flex-col items-center justify-center p-12 border-2 border-dashed border-slate-600 rounded-lg hover:border-indigo-500 hover:bg-slate-700/50 transition-all duration-300 cursor-pointer"
                  aria-label="Upload video files"
                >
                  <UploadIcon className="w-16 h-16 text-slate-500 mb-4" />
                  <span className="font-semibold text-slate-300 text-lg">Click to upload videos</span>
                  <span className="text-sm text-slate-400">or drag and drop</span>
                  <span className="text-xs text-slate-500 mt-2">Maximum 10 videos (MP4, WebM, MOV)</span>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-300">
                      {videoFiles.length} video{videoFiles.length !== 1 ? 's' : ''} selected
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isProcessing || videoFiles.length >= 10}
                        className="px-3 py-1.5 text-sm bg-slate-700 text-slate-300 rounded-md hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Add More
                      </button>
                      <button
                        onClick={clearAll}
                        disabled={isProcessing}
                        className="px-3 py-1.5 text-sm bg-slate-700 text-slate-300 rounded-md hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {videoFiles.map((video) => (
                      <div key={video.id} className="flex flex-col">
                        <div
                          className={`flex items-center justify-between p-4 bg-slate-700/50 rounded-lg border border-slate-600 ${
                            video.status === 'completed' ? 'cursor-pointer hover:bg-slate-700' : ''
                          }`}
                          onClick={() => {
                            if (video.status === 'completed' && video.story) {
                              setExpandedVideoId(expandedVideoId === video.id ? null : video.id);
                            }
                          }}
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {getStatusIcon(video.status)}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-slate-200 truncate" title={video.file.name}>
                                  {video.file.name}
                                </span>
                                <span className="text-xs text-slate-400 flex-shrink-0">
                                  ({(video.file.size / 1024 / 1024).toFixed(1)} MB)
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-slate-400">{getStatusText(video.status)}</span>
                                {video.error && (
                                  <span className="text-xs text-red-400">- {video.error}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {video.status === 'completed' && video.story && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyToClipboard(video.story || '', video.id);
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors text-sm flex-shrink-0"
                                title="Copy story to clipboard"
                              >
                                {copiedId === video.id ? (
                                  <>
                                    <CheckIcon className="w-4 h-4" />
                                    <span>Copied!</span>
                                  </>
                                ) : (
                                  <>
                                    <CopyIcon className="w-4 h-4" />
                                    <span>Copy</span>
                                  </>
                                )}
                              </button>
                            )}
                            {video.status === 'pending' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeVideo(video.id);
                                }}
                                disabled={isProcessing}
                                className="p-1.5 rounded-full hover:bg-slate-600 transition-colors disabled:opacity-50"
                                aria-label="Remove video"
                              >
                                <CloseIcon className="w-5 h-5 text-slate-400" />
                              </button>
                            )}
                          </div>
                        </div>
                        
                        {/* Expanded Story Content */}
                        {expandedVideoId === video.id && video.story && (
                          <div className="mt-2 p-6 bg-slate-900/70 rounded-lg border border-slate-700">
                            <div className="text-slate-300 whitespace-pre-wrap font-serif leading-relaxed">
                              {video.story}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Action Button */}
            <div>
              <button
                onClick={handleUploadAndProcess}
                disabled={videoFiles.length === 0 || isProcessing}
                className="w-full flex items-center justify-center gap-3 py-3 px-6 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 disabled:bg-slate-600 disabled:cursor-not-allowed disabled:shadow-none transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-indigo-500"
              >
                {isProcessing ? (
                  <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                ) : (
                  <WandIcon className="w-5 h-5" />
                )}
                <span>
                  {isProcessing ? 'Processing...' : 'Generate Stories'}
                </span>
              </button>
            </div>

            {/* Error Display */}
            {error && (
              <div className="p-4 bg-red-900/50 border border-red-700 text-red-300 rounded-lg" role="alert">
                <p className="font-medium">Error</p>
                <p className="text-sm">{error}</p>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}


