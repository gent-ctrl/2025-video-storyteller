
import React, { useState, useRef, useCallback, ChangeEvent, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';

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


// --- Utility Function ---
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = (error) => reject(error);
  });
};

// --- Main App Component ---
export default function App() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [generatedStory, setGeneratedStory] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    // Cleanup interval on component unmount
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      setVideoFile(file);
      setError(null);
      setGeneratedStory('');
    } else {
      setError('Please select a valid video file.');
      setVideoFile(null);
    }
  };

  const clearFile = () => {
    setVideoFile(null);
    if(fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const handleAnalyze = useCallback(async () => {
    if (!videoFile) {
      setError('Please select a video file first.');
      return;
    }

    if (!process.env.API_KEY) {
        setError("API key is not configured. This application cannot function without it.");
        return;
    }

    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    setIsLoading(true);
    setIsStreaming(false);
    setError(null);
    setGeneratedStory('');
    setProgress(0);

    progressIntervalRef.current = window.setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) {
          if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
          return 95;
        }
        return prev + 5;
      });
    }, 400);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY, vertexai: true });
      const base64Video = await fileToBase64(videoFile);

      const videoPart = {
        inlineData: {
          data: base64Video,
          mimeType: videoFile.type,
        },
      };

      const prompt = `Based on the video, create a news story that strictly follows the format and structure of the example below.

- Invent a plausible location and a date no later than November 2025.
- The title must be 45 characters or less and enclosed in double quotes.
- The main story (between the date and the final disclaimer) must have at least 3 paragraphs.
- The output must be a continuous stream.
- Use a single blank line to separate the title, date, each paragraph, and the final disclaimer.

**EXAMPLE:**

“Chain-Reaction Crash on Icy Hill Leaves Dozens Stranded”

Bozeman, Montana — December 4, 2025

A sheet of invisible black ice turned a quiet mountain roadway into a chaotic crash zone Thursday morning, as car after car slid helplessly down a steep hill, slamming into vehicles already wrecked at the bottom.

The viral video shows the terrifying sequence unfolding in real time: a red sedan loses control first, spinning sideways across the road. A white SUV approaches moments later, taps the brakes, and instantly begins sliding as if on glass, colliding violently with the stranded sedan. Within seconds, another crossover comes down the hill with zero traction, tires locked, skidding directly into the growing pileup.

Drivers exiting their vehicles can be seen slipping on the ice themselves, shouting warnings to oncoming traffic as more cars crest the hill unaware of the danger. Fortunately, authorities report that despite the dramatic footage, injuries were minor—thanks largely to the low speeds and quick response from nearby motorists who helped divert traffic.

Officials are urging drivers to stay off steep grades during freezing rain conditions, as black ice often forms without any visible indication and can render brakes and steering nearly useless.

This video is created using AI, and the story is for your entertainment.''`;

      const textPart = { text: prompt };

      const stream = await ai.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents: { role: 'user', parts: [videoPart, textPart] },
      });

      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      setProgress(100);
      setIsLoading(false);
      setIsStreaming(true);

      let fullText = '';
      for await (const chunk of stream) {
        const chunkText = chunk.text;
        if (chunkText) {
          fullText += chunkText;
          setGeneratedStory(fullText);
        }
      }
      setIsStreaming(false);
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'An unknown error occurred during analysis.');
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      setProgress(0);
      setIsLoading(false);
      setIsStreaming(false);
    }
  }, [videoFile]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
      <main className="w-full max-w-4xl mx-auto bg-slate-800/50 rounded-2xl shadow-2xl shadow-indigo-900/20 backdrop-blur-lg border border-slate-700">
        <div className="p-6 sm:p-8 lg:p-10">
          <header className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 mb-2">
              GT Video Storyteller
            </h1>
            <p className="text-slate-400 text-base">
              Upload a video and watch a compelling news story get crafted about it.
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
                className="hidden"
                aria-hidden="true"
              />
              {!videoFile ? (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-600 rounded-lg hover:border-indigo-500 hover:bg-slate-700/50 transition-all duration-300 cursor-pointer"
                  aria-label="Upload a video file"
                >
                  <UploadIcon className="w-12 h-12 text-slate-500 mb-3" />
                  <span className="font-semibold text-slate-300">Click to upload a video</span>
                  <span className="text-sm text-slate-400">or drag and drop</span>
                </button>
              ) : (
                <div className="w-full flex items-center justify-between p-4 bg-slate-700 rounded-lg border border-slate-600">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <VideoIcon className="w-6 h-6 text-indigo-400 flex-shrink-0" />
                        <span className="font-medium text-slate-200 truncate" title={videoFile.name}>
                            {videoFile.name}
                        </span>
                    </div>
                    <button
                        onClick={clearFile}
                        className="p-1.5 rounded-full hover:bg-slate-600 transition-colors"
                        aria-label="Remove selected file"
                    >
                        <CloseIcon className="w-5 h-5 text-slate-400" />
                    </button>
                </div>
              )}
            </div>

            {/* Action Button */}
            <div>
              <button
                onClick={handleAnalyze}
                disabled={!videoFile || isLoading || isStreaming}
                className="w-full flex items-center justify-center gap-3 py-3 px-6 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 disabled:bg-slate-600 disabled:cursor-not-allowed disabled:shadow-none transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-indigo-500"
              >
                {(isLoading || isStreaming) ? (
                  <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                ) : (
                  <WandIcon className="w-5 h-5" />
                )}
                <span>
                  {isLoading ? 'Analyzing...' : isStreaming ? 'Generating Story...' : 'Generate Story'}
                </span>
              </button>
            </div>

            {/* Progress Bar */}
            {isLoading && (
              <div className="w-full space-y-2 pt-2">
                <div className="flex justify-between mb-1">
                  <span className="text-base font-medium text-indigo-300">Processing Video</span>
                  <span className="text-sm font-medium text-indigo-300">{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2.5">
                  <div
                    className="bg-gradient-to-r from-indigo-500 to-cyan-400 h-2.5 rounded-full transition-all duration-300 ease-linear"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="p-4 bg-red-900/50 border border-red-700 text-red-300 rounded-lg" role="alert">
                <p className="font-medium">Error</p>
                <p className="text-sm">{error}</p>
              </div>
            )}

            {/* Result Display */}
            {(isStreaming || generatedStory) && !isLoading && (
              <div className="bg-slate-900/70 p-6 rounded-lg border border-slate-700 min-h-[200px] max-h-[40vh] overflow-y-auto">
                <div className="text-slate-300 whitespace-pre-wrap font-serif leading-relaxed">
                  {generatedStory}
                  {isStreaming && <span className="inline-block w-2 h-5 bg-indigo-400 animate-pulse ml-1"></span>}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      <footer className="text-center mt-8">
        <p className="text-sm text-slate-500">Powered by GT</p>
      </footer>
    </div>
  );
}
