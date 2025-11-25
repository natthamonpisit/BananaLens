import React, { useState, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import ImageUploader from './components/ImageUploader';
import BeforeAfter from './components/BeforeAfter';
import { ViewMode, FilterSettings, PhotoItem, EditMode } from './types';
import { analyzeImageAndGetSettings, fileToGenerativePart, generativeEditImage } from './services/geminiService';

const defaultSettings: FilterSettings = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  sepia: 0,
  grayscale: 0,
  hueRotate: 0,
  blur: 0,
  warmth: 0
};

const App: React.FC = () => {
  // --- API KEY CHECK ---
  // If API KEY is missing (e.g. forgot to set in Vercel), show an error immediately.
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === 'undefined' || apiKey === '') {
      return (
          <div className="min-h-screen bg-[#121212] flex flex-col items-center justify-center p-6 text-center">
              <div className="bg-red-500/10 border border-red-500 rounded-2xl p-8 max-w-lg">
                  <h1 className="text-3xl font-bold text-red-500 mb-4">Missing API Key</h1>
                  <p className="text-gray-300 mb-6">
                      The application cannot start because the <code className="bg-black/30 px-2 py-1 rounded text-white">API_KEY</code> environment variable is missing.
                  </p>
                  <ul className="text-left text-sm text-gray-400 space-y-2 list-disc pl-5 mb-6">
                      <li>Go to your <strong>Vercel Project Settings</strong>.</li>
                      <li>Click <strong>Environment Variables</strong>.</li>
                      <li>Add Key: <code className="text-white">API_KEY</code></li>
                      <li>Add Value: Your <code className="text-white">AIza...</code> key.</li>
                      <li>Redeploy the project.</li>
                  </ul>
                  <a href="https://vercel.com/dashboard" target="_blank" rel="noreferrer" className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-xl font-bold transition-colors">
                      Go to Vercel Dashboard
                  </a>
              </div>
          </div>
      );
  }

  const [view, setView] = useState<ViewMode>(ViewMode.HOME);
  const [isSidebarOpen, setSidebarOpen] = useState(false); // Mobile
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false); // Desktop
  
  // Editor State
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [originalImageForUndo, setOriginalImageForUndo] = useState<string | null>(null); // To support Undo
  const [currentSettings, setCurrentSettings] = useState<FilterSettings>(defaultSettings);
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiReasoning, setAiReasoning] = useState<string>("");
  const [showCompare, setShowCompare] = useState(false);
  
  // Edit Mode (Color vs Magic)
  const [editMode, setEditMode] = useState<EditMode>(EditMode.COLOR);

  // Inputs
  const [promptText, setPromptText] = useState("");
  const [refImage, setRefImage] = useState<string | null>(null);

  // Collection & Export State
  const [collection, setCollection] = useState<PhotoItem[]>([]);
  const [exportSelection, setExportSelection] = useState<Set<string>>(new Set());

  const handleImageSelect = async (file: File) => {
    try {
      const base64 = await fileToGenerativePart(file);
      const fullBase64 = `data:${file.type};base64,${base64}`;
      setCurrentImage(fullBase64);
      setOriginalImageForUndo(fullBase64); // Initial state
      setCurrentSettings(defaultSettings);
      setAiReasoning("");
      setShowCompare(false);
      setEditMode(EditMode.COLOR);
    } catch (error) {
      console.error("Error loading image", error);
    }
  };

  const handleResetImage = () => {
      setCurrentImage(null);
      setOriginalImageForUndo(null);
      setCurrentSettings(defaultSettings);
      setAiReasoning("");
      setShowCompare(false);
      setPromptText("");
      setRefImage(null);
  };

  const handleUndo = () => {
      if (originalImageForUndo) {
          setCurrentImage(originalImageForUndo);
          setAiReasoning("Reverted to original image.");
      }
  };

  const handleRefImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
     if(e.target.files && e.target.files[0]) {
         const base64 = await fileToGenerativePart(e.target.files[0]);
         setRefImage(`data:${e.target.files[0].type};base64,${base64}`);
     }
  }

  const handleCastSpell = async () => {
    if (!currentImage) return;

    setIsProcessing(true);
    setAiReasoning("Nano Banana is working its magic...");

    try {
      const cleanBase64 = currentImage.split(',')[1];

      if (editMode === EditMode.COLOR) {
          // --- COLOR GRADE MODE ---
          const cleanRefBase64 = refImage ? refImage.split(',')[1] : undefined;
          const result = await analyzeImageAndGetSettings(cleanBase64, promptText, cleanRefBase64);
          setCurrentSettings(prev => ({...prev, ...result.suggestedSettings}));
          setAiReasoning(result.reasoning);

      } else {
          // --- MAGIC EDIT MODE ---
          // Save current state for Undo before applying change
          setOriginalImageForUndo(currentImage);
          
          const newImageBase64 = await generativeEditImage(cleanBase64, promptText);
          setCurrentImage(`data:image/jpeg;base64,${newImageBase64}`);
          setAiReasoning("Magic edit applied successfully!");
      }

      setShowCompare(false); 
    } catch (error: any) {
      console.error("AI Error", error);
      let errorMsg = "Oops! The spell fizzled. Please try again.";
      if (error.message?.includes("403")) {
          errorMsg = "Access Denied (403): Please check 'Website restrictions' in Google Cloud Console.";
      }
      setAiReasoning(errorMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveToCollection = () => {
    if (!currentImage) return;
    const newItem: PhotoItem = {
        id: Date.now().toString() + Math.random().toString().slice(2,6),
        originalUrl: currentImage, // Saves the current state (including magic edits)
        name: `Photo ${collection.length + 1}`,
        timestamp: Date.now(),
        settings: currentSettings // Saves current CSS filters
    };
    setCollection([newItem, ...collection]);
    alert("Saved to collection!");
  };

  const processAndDownloadImage = (item: PhotoItem) => {
      return new Promise<void>((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.src = item.originalUrl;
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            if (ctx) {
                const s = item.settings;
                ctx.filter = `brightness(${s.brightness}%) contrast(${s.contrast}%) saturate(${s.saturation}%) sepia(${s.sepia}%) grayscale(${s.grayscale}%) hue-rotate(${s.hueRotate}deg) blur(${s.blur}px)`;
                ctx.drawImage(img, 0, 0);
                
                const link = document.createElement('a');
                link.download = `bananalens-${item.name.replace(/\s+/g, '-').toLowerCase()}.png`;
                link.href = canvas.toDataURL();
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
            resolve();
        };
        img.onerror = () => resolve(); // Fail safely
      });
  };

  const handleSingleExport = () => {
      if (!currentImage) return;
      const tempItem: PhotoItem = {
          id: 'temp',
          originalUrl: currentImage,
          name: 'edit',
          timestamp: Date.now(),
          settings: currentSettings
      };
      processAndDownloadImage(tempItem);
  };

  const handleBatchExport = async () => {
      if (exportSelection.size === 0) return;
      
      // Select items to export
      const itemsToExport = collection.filter(item => exportSelection.has(item.id));
      
      let processed = 0;
      for (const item of itemsToExport) {
          await processAndDownloadImage(item);
          processed++;
          // Small delay to prevent browser choking on multiple downloads
          await new Promise(r => setTimeout(r, 500));
      }
      
      setExportSelection(new Set()); // Clear selection
      alert(`Exported ${processed} photos.`);
  };

  // --- Batch Import Logic ---
  const handleBatchImport = useCallback(async (files: FileList) => {
      const newItems: PhotoItem[] = [];
      
      for (let i = 0; i < files.length; i++) {
          const file = files[i];
          try {
              const base64 = await fileToGenerativePart(file);
              newItems.push({
                  id: Date.now().toString() + Math.random().toString().slice(2,8) + i,
                  originalUrl: `data:${file.type};base64,${base64}`,
                  name: file.name.split('.')[0] || `Photo ${collection.length + i + 1}`,
                  timestamp: Date.now(),
                  settings: defaultSettings
              });
          } catch (e) {
              console.error("Failed to import file", file.name, e);
          }
      }
      
      setCollection(prev => [...newItems, ...prev]);
      alert(`Imported ${newItems.length} photos to your collection.`);
      setView(ViewMode.COLLECTION);
  }, [collection.length]);

  const toggleExportSelection = (id: string) => {
      const newSet = new Set(exportSelection);
      if (newSet.has(id)) {
          newSet.delete(id);
      } else {
          newSet.add(id);
      }
      setExportSelection(newSet);
  };


  // --- View Renderers ---

  const renderHome = () => (
    <div className="flex flex-col h-full w-full max-w-6xl mx-auto p-4 md:p-6 space-y-4">
      {/* Main Workspace */}
      <div className="flex-1 flex flex-col items-center justify-center min-h-0 relative bg-dark-surface/50 rounded-3xl border border-dark-border overflow-hidden p-8">
        
        {!currentImage ? (
          <ImageUploader onImageSelected={handleImageSelect} />
        ) : (
          <>
            {/* Top Right Controls */}
            <div className="absolute top-6 right-6 z-40 flex gap-2">
                {/* Undo Button (Only visible if we have changes in Magic Mode or want to revert) */}
                {editMode === EditMode.MAGIC && currentImage !== originalImageForUndo && (
                    <button
                        onClick={handleUndo}
                        className="bg-black/50 hover:bg-white/20 text-white px-4 py-2 rounded-lg backdrop-blur-md flex items-center gap-2 transition-colors border border-white/10 shadow-lg"
                        title="Undo Magic Edit"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>
                        Undo
                    </button>
                )}
                
                {/* Upload New Button */}
                <button
                onClick={handleResetImage}
                className="bg-black/50 hover:bg-banana-500 text-white px-4 py-2 rounded-lg backdrop-blur-md flex items-center gap-2 transition-colors border border-white/10 shadow-lg"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    Upload New
                </button>
            </div>

            <div className="relative flex items-center justify-center max-w-full max-h-full shadow-2xl">
                {/* Unified Viewer Component */}
                <BeforeAfter 
                    originalUrl={currentImage} 
                    settings={currentSettings} 
                    isCompareActive={showCompare}
                />
                
                {/* Overlay Loading State */}
                {isProcessing && (
                    <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-50 backdrop-blur-sm rounded-lg">
                        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-banana-500 mb-4"></div>
                        <p className="text-banana-400 font-medium animate-pulse">Nano Banana is casting a spell...</p>
                    </div>
                )}
            </div>
          </>
        )}
      </div>

      {/* Controls Area - Always Visible */}
      <div className="w-full max-w-4xl mx-auto animate-fade-in-up shrink-0">
          
          {/* Unified Controls */}
          <div className={`bg-dark-surface p-6 rounded-2xl border border-dark-border space-y-6 shadow-lg transition-opacity ${!currentImage ? 'opacity-80' : ''}`}>
              
              {/* Top Row: Header, Mode Switch & Inputs */}
              <div className="space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-4">
                          <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
                              Magic Controls
                          </h3>
                          
                          {/* Mode Toggle */}
                          <div className="bg-black/40 p-1 rounded-lg flex items-center border border-white/10">
                              <button
                                  onClick={() => setEditMode(EditMode.COLOR)}
                                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${editMode === EditMode.COLOR ? 'bg-banana-500 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                              >
                                  🎨 Color
                              </button>
                              <button
                                  onClick={() => setEditMode(EditMode.MAGIC)}
                                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1 ${editMode === EditMode.MAGIC ? 'bg-banana-500 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                              >
                                  ✨ Magic Edit
                              </button>
                          </div>
                      </div>

                       {aiReasoning && !isProcessing && (
                           <span className="text-xs text-banana-400 bg-banana-500/10 px-2 py-1 rounded-full border border-banana-500/20 hidden md:inline-block">Applied</span>
                       )}
                  </div>

                  <div className="flex flex-col md:flex-row gap-3">
                      <div className="flex-1 relative">
                          <input 
                              type="text" 
                              placeholder={editMode === EditMode.COLOR ? "Describe a style (e.g. 'Cyberpunk city', 'Warm vintage film')" : "Describe what to edit (e.g. 'Remove pimples', 'Add sunglasses')"}
                              className="w-full bg-black/30 border border-dark-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-banana-500 transition-colors text-white pr-10"
                              value={promptText}
                              onChange={(e) => setPromptText(e.target.value)}
                          />
                          {editMode === EditMode.COLOR && (
                              <label className="absolute right-2 top-2 p-1 bg-dark-surface hover:bg-white/10 rounded cursor-pointer text-gray-400 hover:text-white" title="Add Reference Image">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><image x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                                  <input type="file" accept="image/*" className="hidden" onChange={handleRefImageSelect} />
                              </label>
                          )}
                      </div>
                      {refImage && editMode === EditMode.COLOR && (
                          <div className="h-11 w-11 relative group shrink-0">
                              <img src={refImage} className="h-full w-full rounded-lg object-cover border border-banana-500" alt="ref" />
                              <button 
                                  onClick={() => setRefImage(null)}
                                  className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"
                              >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                              </button>
                          </div>
                      )}
                  </div>
              </div>

              {/* Bottom Row: Actions */}
              <div className="flex flex-col md:flex-row gap-4">
                   {/* Cast Spell Button (Main) */}
                  <button 
                      onClick={handleCastSpell}
                      disabled={isProcessing || !currentImage}
                      className="flex-1 py-4 bg-gradient-to-r from-banana-500 to-banana-600 hover:from-banana-400 hover:to-banana-500 text-white font-bold rounded-xl shadow-lg shadow-banana-500/20 transform hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
                  >
                       <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
                      {isProcessing ? "Analyzing..." : (editMode === EditMode.MAGIC ? "Magic Edit" : "Cast a Spell")}
                  </button>

                  {/* Square Buttons (Tools) */}
                  <div className="flex gap-3 justify-center">
                      <button 
                          onClick={() => setShowCompare(!showCompare)}
                          disabled={!currentImage}
                          title={showCompare ? "Hide Comparison" : "Compare Before/After"}
                          className={`p-0 w-[56px] h-[56px] rounded-xl border transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed
                          ${showCompare 
                              ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.3)]' 
                              : 'bg-black/30 text-gray-300 border-dark-border hover:bg-dark-border hover:text-white'
                          }`}
                      >
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12h20"/><path d="M2 12l5-5"/><path d="M2 12l5 5"/><path d="M22 12l-5-5"/><path d="M22 12l-5 5"/></svg>
                      </button>

                      <button 
                          onClick={handleSaveToCollection}
                          disabled={!currentImage}
                          title="Save to Collection"
                          className="p-0 w-[56px] h-[56px] bg-black/30 hover:bg-dark-border text-gray-300 hover:text-white rounded-xl border border-dark-border transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                      </button>

                      <button 
                          onClick={handleSingleExport}
                          disabled={!currentImage}
                          title="Export Image"
                          className="p-0 w-[56px] h-[56px] bg-black/30 hover:bg-dark-border text-gray-300 hover:text-white rounded-xl border border-dark-border transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                      </button>
                  </div>
              </div>

              {aiReasoning && (
                  <div className="p-3 bg-black/20 rounded-lg text-sm text-gray-300 italic border-l-2 border-banana-500">
                      "{aiReasoning}"
                  </div>
              )}
          </div>
      </div>
    </div>
  );

  const renderCollection = () => (
    <div className="p-8 w-full max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-white mb-6">My Collection</h2>
        {collection.length === 0 ? (
            <div className="text-center py-20 text-gray-500">
                <p>No photos saved yet.</p>
                <button 
                    onClick={() => setView(ViewMode.HOME)} 
                    className="mt-4 text-banana-500 hover:underline"
                >
                    Start Editing
                </button>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {collection.map(item => (
                    <div key={item.id} className="bg-dark-surface rounded-xl overflow-hidden border border-dark-border group relative flex flex-col">
                        <div className="aspect-square relative overflow-hidden bg-black/20">
                             <img 
                                src={item.originalUrl} 
                                alt={item.name} 
                                className="w-full h-full object-cover"
                                style={{
                                    filter: `brightness(${item.settings.brightness}%) contrast(${item.settings.contrast}%) saturate(${item.settings.saturation}%) sepia(${item.settings.sepia}%) grayscale(${item.settings.grayscale}%) hue-rotate(${item.settings.hueRotate}deg) blur(${item.settings.blur}px)`
                                }}
                             />
                             <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                 <button 
                                    className="p-3 bg-white text-black rounded-full hover:bg-banana-400 font-medium flex items-center gap-2"
                                    onClick={() => {
                                        setCurrentImage(item.originalUrl);
                                        setCurrentSettings(item.settings);
                                        setView(ViewMode.HOME);
                                    }}
                                 >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                                    Edit
                                 </button>
                             </div>
                        </div>
                        <div className="p-3">
                            <p className="text-white font-medium truncate">{item.name}</p>
                            <p className="text-xs text-gray-500">{new Date(item.timestamp).toLocaleDateString()}</p>
                        </div>
                    </div>
                ))}
            </div>
        )}
    </div>
  );

  const renderImport = () => (
      <div className="flex flex-col items-center justify-center h-full p-8 max-w-4xl mx-auto w-full">
           <h2 className="text-3xl font-bold text-white mb-2">Import Photos</h2>
           <p className="text-gray-400 mb-8">Add multiple photos to your collection to edit later.</p>
           
           <div 
             className="w-full h-96 border-4 border-dashed border-banana-500/30 rounded-3xl flex flex-col items-center justify-center bg-dark-surface hover:bg-dark-surface/80 transition-colors cursor-pointer group relative overflow-hidden"
             onDragOver={(e) => e.preventDefault()}
             onDrop={(e) => {
                 e.preventDefault();
                 if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                     handleBatchImport(e.dataTransfer.files);
                 }
             }}
           >
              <input 
                type="file" 
                accept="image/*" 
                multiple
                onChange={(e) => e.target.files && handleBatchImport(e.target.files)} 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="z-0 flex flex-col items-center space-y-4 group-hover:scale-105 transition-transform duration-300">
                <div className="p-6 bg-banana-500/10 rounded-full text-banana-500">
                    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                </div>
                <h3 className="text-2xl font-bold text-white">Drop photos here</h3>
                <p className="text-gray-400">or click to browse multiple files</p>
              </div>
           </div>
      </div>
  );

  const renderExport = () => (
    <div className="p-8 w-full max-w-6xl mx-auto flex flex-col h-full">
        <div className="flex items-center justify-between mb-6">
            <div>
                <h2 className="text-3xl font-bold text-white">Batch Export</h2>
                <p className="text-gray-400">Select photos to download them.</p>
            </div>
            {exportSelection.size > 0 && (
                <button 
                    onClick={handleBatchExport}
                    className="bg-banana-500 hover:bg-banana-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Download ({exportSelection.size})
                </button>
            )}
        </div>

        {collection.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-gray-500">
                <p>No photos in collection.</p>
            </div>
        ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {collection.map(item => {
                    const isSelected = exportSelection.has(item.id);
                    return (
                        <div 
                            key={item.id} 
                            onClick={() => toggleExportSelection(item.id)}
                            className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${isSelected ? 'border-banana-500 ring-2 ring-banana-500/50' : 'border-transparent hover:border-gray-600'}`}
                        >
                             <img 
                                src={item.originalUrl} 
                                alt={item.name} 
                                className="w-full h-full object-cover"
                                style={{
                                    filter: `brightness(${item.settings.brightness}%) contrast(${item.settings.contrast}%) saturate(${item.settings.saturation}%) sepia(${item.settings.sepia}%) grayscale(${item.settings.grayscale}%) hue-rotate(${item.settings.hueRotate}deg) blur(${item.settings.blur}px)`
                                }}
                             />
                             <div className={`absolute top-2 right-2 w-6 h-6 rounded-full border-2 flex items-center justify-center ${isSelected ? 'bg-banana-500 border-banana-500' : 'bg-black/40 border-white'}`}>
                                 {isSelected && <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                             </div>
                        </div>
                    );
                })}
            </div>
        )}
    </div>
  );

  return (
    <div className="min-h-screen bg-dark-bg flex font-sans">
      <Sidebar 
        currentView={view} 
        setView={setView} 
        isOpen={isSidebarOpen} 
        toggleOpen={() => setSidebarOpen(!isSidebarOpen)} 
        isCollapsed={isSidebarCollapsed}
        toggleCollapse={() => setSidebarCollapsed(!isSidebarCollapsed)}
      />
      
      <main className={`flex-1 relative min-h-screen flex flex-col pt-16 md:pt-0 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'md:ml-0' : 'md:ml-64'}`}>
        {view === ViewMode.HOME && renderHome()}
        {view === ViewMode.COLLECTION && renderCollection()}
        {view === ViewMode.IMPORT && renderImport()}
        {view === ViewMode.EXPORT && renderExport()}
      </main>
    </div>
  );
};

export default App;