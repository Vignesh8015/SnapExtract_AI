
import React, { useState, useEffect, useRef } from 'react';
import { AppTab, ExtractedItem, ImageSize, ChatMessage } from './types';
import { gemini } from './services/geminiService';
import { jsPDF } from 'jspdf';
import { 
  CameraIcon, 
  TableCellsIcon, 
  PhotoIcon, 
  ChatBubbleLeftRightIcon,
  PlusIcon,
  TrashIcon,
  ArrowPathIcon,
  ClipboardIcon,
  ArrowTopRightOnSquareIcon,
  KeyIcon,
  CodeBracketIcon,
  TvIcon,
  GlobeAltIcon,
  UserGroupIcon,
  LockClosedIcon,
  ArrowRightIcon,
  ArrowDownTrayIcon,
  DocumentDuplicateIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.EXTRACTION);
  const [extractedItems, setExtractedItems] = useState<ExtractedItem[]>([]);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genPrompt, setGenPrompt] = useState('');
  const [genSize, setGenSize] = useState<ImageSize>('1K');
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showCamera, setShowCamera] = useState(false);

  // Persistence: Load history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('snap_extract_history');
    if (saved) {
      try {
        setExtractedItems(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }

    const checkKey = async () => {
      if (window.aistudio) {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(selected);
      }
    };
    checkKey();

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = (event) => {
              setUploadedImages(prev => [...prev, event.target?.result as string]);
            };
            reader.readAsDataURL(blob);
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  // Persistence: Save history to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('snap_extract_history', JSON.stringify(extractedItems));
  }, [extractedItems]);

  const handleOpenKeySelector = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setHasApiKey(true);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (let i = 0; i < files.length; i++) {
      const reader = new FileReader();
      reader.onloadend = () => setUploadedImages(prev => [...prev, reader.result as string]);
      reader.readAsDataURL(files[i]);
    }
  };

  const startCamera = async () => {
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      alert("Camera access denied");
      setShowCamera(false);
    }
  };

  const takePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(videoRef.current, 0, 0);
      setUploadedImages(prev => [...prev, canvas.toDataURL('image/png')]);
      stopCamera();
    }
  };

  const stopCamera = () => {
    const stream = videoRef.current?.srcObject as MediaStream;
    stream?.getTracks().forEach(track => track.stop());
    setShowCamera(false);
  };

  const handleError = (err: any) => {
    console.error(err);
    if (err.message?.includes("Requested entity was not found")) {
      setHasApiKey(false);
      alert("API Key error: Please ensure you select a key from a paid GCP project.");
    } else {
      alert("An unexpected error occurred. Please try again.");
    }
  };

  const handleScan = async () => {
    if (uploadedImages.length === 0) return;
    setIsScanning(true);
    try {
      const results = await gemini.extractFromImages(uploadedImages);
      setExtractedItems(prev => [...results, ...prev]);
      setUploadedImages([]); 
    } catch (err) {
      handleError(err);
    } finally {
      setIsScanning(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!genPrompt.trim() || isGenerating) return;
    setIsGenerating(true);
    try {
      const url = await gemini.generateImage(genPrompt, genSize);
      if (url) {
        setGeneratedImages(prev => [url, ...prev]);
      }
    } catch (err) {
      handleError(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.text("SnapExtract AI - Data Export", 20, 20);
    doc.setFontSize(12);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 20, 30);
    
    let y = 45;
    extractedItems.forEach((item, index) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.setFont("helvetica", "bold");
      doc.text(`${index + 1}. [${item.category}] ${item.title}`, 20, y);
      y += 7;
      doc.setFont("helvetica", "normal");
      const splitContent = doc.splitTextToSize(item.content, 170);
      doc.text(splitContent, 25, y);
      y += (splitContent.length * 6) + 5;
      if (item.link) {
        doc.setTextColor(0, 0, 255);
        doc.text(`Link: ${item.link}`, 25, y);
        doc.setTextColor(0, 0, 0);
        y += 10;
      } else {
        y += 5;
      }
    });
    
    doc.save("snapextract_export.pdf");
  };

  const copyAllToClipboard = () => {
    const text = extractedItems.map(item => (
      `[${item.category}] ${item.title}\n${item.content}${item.link ? '\nLink: ' + item.link : ''}\n------------------`
    )).join('\n\n');
    navigator.clipboard.writeText(text);
    alert("All items copied to clipboard!");
  };

  const clearHistory = () => {
    if (confirm("Are you sure you want to clear your extraction history?")) {
      setExtractedItems([]);
      localStorage.removeItem('snap_extract_history');
    }
  };

  const renderIcon = (category: string) => {
    switch (category) {
      case 'Code Snippet': return <CodeBracketIcon className="w-5 h-5 text-purple-500" />;
      case 'YouTube Channel': return <TvIcon className="w-5 h-5 text-red-500" />;
      case 'AI Tool': return <PlusIcon className="w-5 h-5 text-indigo-500" />;
      case 'Website': return <GlobeAltIcon className="w-5 h-5 text-blue-500" />;
      case 'Social Media': return <UserGroupIcon className="w-5 h-5 text-pink-500" />;
      default: return <ClipboardIcon className="w-5 h-5 text-slate-500" />;
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
  };

  if (!hasApiKey) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white font-inter">
        <div className="max-w-md w-full text-center space-y-8">
          <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-indigo-500/20 mb-8">
            <LockClosedIcon className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-black tracking-tight">Access Restricted</h1>
            <p className="text-slate-400 font-medium">To use the high-performance Gemini 3 models, you must provide your own API key from a paid GCP project.</p>
          </div>
          <button 
            onClick={handleOpenKeySelector}
            className="w-full bg-white text-slate-900 py-4 px-8 rounded-2xl font-black text-lg flex items-center justify-center gap-3 hover:bg-slate-100 transition-all shadow-xl active:scale-95"
          >
            SELECT API KEY
            <ArrowRightIcon className="w-5 h-5" />
          </button>
          <p className="text-sm text-slate-500">
            For more information on billing, visit the{' '}
            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">
              Gemini API Billing Documentation
            </a>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50 font-inter">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg">S</div>
          <div>
            <h1 className="text-xl font-black tracking-tighter text-slate-900 leading-none">SNAPEXTRACT</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Universal Tech Scanner</p>
          </div>
        </div>
        <nav className="flex items-center bg-slate-100 p-1.5 rounded-2xl">
          <TabButton active={activeTab === AppTab.EXTRACTION} onClick={() => setActiveTab(AppTab.EXTRACTION)} icon={<TableCellsIcon className="w-5 h-5" />} label="Scanner" />
          <TabButton active={activeTab === AppTab.IMAGE_GEN} onClick={() => setActiveTab(AppTab.IMAGE_GEN)} icon={<PhotoIcon className="w-5 h-5" />} label="Visualizer" />
          <TabButton active={activeTab === AppTab.CHAT} onClick={() => setActiveTab(AppTab.CHAT)} icon={<ChatBubbleLeftRightIcon className="w-5 h-5" />} label="Assistant" />
        </nav>
      </header>

      <main className="flex-1 overflow-y-auto">
        {activeTab === AppTab.EXTRACTION && (
          <div className="max-w-6xl mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 ring-1 ring-slate-200">
                <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <PlusIcon className="w-5 h-5 text-indigo-600" />
                  Capture & Paste
                </h2>
                <div className="space-y-3 mb-6">
                  <button onClick={() => document.getElementById('file-upload')?.click()} className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:text-indigo-600"><PhotoIcon className="w-6 h-6" /></div>
                      <span className="font-semibold text-slate-600">Gallery</span>
                    </div>
                    <input id="file-upload" type="file" multiple className="hidden" onChange={handleImageUpload} />
                  </button>
                  <button onClick={startCamera} className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:text-indigo-600"><CameraIcon className="w-6 h-6" /></div>
                      <span className="font-semibold text-slate-600">Camera</span>
                    </div>
                  </button>
                  <div className="p-4 bg-indigo-50/50 rounded-2xl border-2 border-dashed border-indigo-200 text-center">
                    <p className="text-sm font-bold text-indigo-600">Paste Image Anywhere (Ctrl+V)</p>
                  </div>
                </div>

                {uploadedImages.length > 0 && (
                  <div className="mb-6">
                    <div className="grid grid-cols-3 gap-2">
                      {uploadedImages.map((img, idx) => (
                        <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden border-2 border-indigo-100">
                          <img src={img} className="w-full h-full object-cover" />
                          <button onClick={() => setUploadedImages(prev => prev.filter((_, i) => i !== idx))} className="absolute inset-0 bg-red-500/80 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><TrashIcon className="w-6 h-6" /></button>
                        </div>
                      ))}
                    </div>
                    <button onClick={handleScan} disabled={isScanning} className="w-full mt-4 py-4 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-lg hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-3">
                      {isScanning ? <ArrowPathIcon className="w-6 h-6 animate-spin" /> : <CameraIcon className="w-6 h-6" />}
                      {isScanning ? 'EXTRACTING...' : 'RUN SCAN'}
                    </button>
                  </div>
                )}
                
                {extractedItems.length > 0 && (
                  <div className="pt-6 border-t border-slate-100 space-y-3">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">History Controls</h3>
                    <button 
                      onClick={clearHistory}
                      className="w-full flex items-center justify-center gap-2 py-2.5 text-red-500 bg-red-50 rounded-xl font-bold hover:bg-red-100 transition-colors"
                    >
                      <TrashIcon className="w-5 h-5" />
                      Clear History
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-8">
              <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
                <div className="flex items-center gap-2">
                  <ClockIcon className="w-5 h-5 text-indigo-600" />
                  <h2 className="text-xl font-black text-slate-800 tracking-tight">EXTRACTION HISTORY</h2>
                </div>
                {extractedItems.length > 0 && (
                  <div className="flex gap-2">
                    <button 
                      onClick={copyAllToClipboard}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all"
                    >
                      <DocumentDuplicateIcon className="w-4 h-4" />
                      Copy All
                    </button>
                    <button 
                      onClick={downloadPDF}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100"
                    >
                      <ArrowDownTrayIcon className="w-4 h-4" />
                      Download PDF
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {extractedItems.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center text-slate-300 border-4 border-dashed border-slate-200 rounded-3xl">
                    <TableCellsIcon className="w-12 h-12 mb-2" />
                    <p className="font-bold text-xl uppercase tracking-tighter">Waiting for scan data...</p>
                  </div>
                ) : (
                  extractedItems.map((item) => (
                    <div key={item.id} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 group hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-slate-100 rounded-xl">{renderIcon(item.category)}</div>
                          <div>
                            <span className="text-[10px] font-black uppercase text-indigo-600 tracking-widest">{item.category} • {new Date(item.timestamp).toLocaleDateString()}</span>
                            <h3 className="text-xl font-bold text-slate-800 leading-none mt-0.5">{item.title}</h3>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {item.link && (
                            <a href={item.link} target="_blank" className="p-2 hover:bg-indigo-50 text-indigo-600 rounded-xl transition-colors">
                              <ArrowTopRightOnSquareIcon className="w-6 h-6" />
                            </a>
                          )}
                          <button onClick={() => copyToClipboard(item.content)} className="p-2 hover:bg-slate-100 text-slate-400 rounded-xl transition-colors">
                            <ClipboardIcon className="w-6 h-6" />
                          </button>
                        </div>
                      </div>
                      
                      {item.category === 'Code Snippet' ? (
                        <div className="relative mt-4">
                          <pre className="bg-slate-900 text-slate-100 p-5 rounded-2xl overflow-x-auto text-sm font-mono leading-relaxed">
                            <code>{item.content}</code>
                          </pre>
                        </div>
                      ) : (
                        <p className="text-slate-600 leading-relaxed font-medium mt-2">{item.content}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {showCamera && (
          <div className="fixed inset-0 z-50 bg-black flex flex-col">
            <video ref={videoRef} autoPlay playsInline className="flex-1 object-cover" />
            <div className="p-8 flex items-center justify-around bg-black/50 backdrop-blur-md">
              <button onClick={stopCamera} className="text-white p-4 font-bold uppercase tracking-widest">Cancel</button>
              <button onClick={takePhoto} className="w-20 h-20 bg-white rounded-full border-4 border-slate-300 active:scale-90 transition-transform shadow-2xl"></button>
              <div className="w-12 h-12"></div>
            </div>
          </div>
        )}

        {activeTab === AppTab.IMAGE_GEN && (
          <div className="max-w-4xl mx-auto p-8 space-y-8">
            <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-100">
              <h2 className="text-2xl font-black mb-6">Visualization Engine</h2>
              <div className="space-y-6">
                <textarea 
                  value={genPrompt}
                  onChange={(e) => setGenPrompt(e.target.value)}
                  placeholder="Paste extracted concepts or describe a scene..."
                  className="w-full p-6 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-indigo-500 focus:bg-white transition-all outline-none min-h-[120px] text-lg"
                />
                <div className="flex flex-col sm:flex-row gap-4">
                  <select 
                    value={genSize}
                    onChange={(e) => setGenSize(e.target.value as ImageSize)}
                    className="flex-1 p-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none font-bold"
                  >
                    <option value="1K">1K High Definition</option>
                    <option value="2K">2K Professional</option>
                    <option value="4K">4K Ultra Quality</option>
                  </select>
                  <button 
                    disabled={isGenerating || !genPrompt}
                    onClick={handleGenerateImage}
                    className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black text-xl shadow-lg hover:shadow-indigo-200 transition-all flex items-center justify-center gap-3"
                  >
                    {isGenerating ? <ArrowPathIcon className="w-6 h-6 animate-spin" /> : <PhotoIcon className="w-6 h-6" />}
                    {isGenerating ? 'GENERATING...' : 'GENERATE'}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {generatedImages.map((url, i) => (
                <div key={i} className="rounded-3xl overflow-hidden shadow-2xl group relative border-4 border-white">
                  <img src={url} className="w-full aspect-square object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                    <button onClick={() => {const link = document.createElement('a'); link.href = url; link.download = 'snap.png'; link.click();}} className="bg-white text-indigo-600 w-full py-3 rounded-xl font-black uppercase tracking-widest">Download Asset</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === AppTab.CHAT && (
          <div className="max-w-4xl mx-auto h-full p-6 flex flex-col">
            <div className="flex-1 bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden flex flex-col">
              <div className="p-5 border-b bg-slate-50 flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                  <ChatBubbleLeftRightIcon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 leading-none">Gemini Intelligence</h3>
                  <span className="text-[10px] text-green-500 font-bold uppercase tracking-wider">Live & Adaptive</span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {chatMessages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] px-6 py-4 rounded-3xl shadow-sm ${m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-800'}`}>
                      <p className="whitespace-pre-wrap font-medium">{m.text}</p>
                    </div>
                  </div>
                ))}
                {isChatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-slate-100 px-6 py-4 rounded-3xl animate-pulse text-slate-400 font-bold uppercase text-xs tracking-widest">Synthesizing...</div>
                  </div>
                )}
              </div>
              <div className="p-6 bg-slate-50 flex gap-4">
                <input 
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Analyze a tool or ask for code fixes..."
                  className="flex-1 px-6 py-4 rounded-2xl bg-white border border-slate-200 outline-none focus:ring-4 focus:ring-indigo-500/10 font-medium"
                />
                <button onClick={handleSendMessage} className="bg-indigo-600 text-white p-4 rounded-2xl shadow-lg hover:shadow-indigo-200 transition-all">
                  <PlusIcon className="w-8 h-8 rotate-45" />
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );

  async function handleSendMessage() {
    if (!chatInput.trim() || isChatLoading) return;
    const userMsg: ChatMessage = { role: 'user', text: chatInput };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsChatLoading(true);
    try {
      const history = chatMessages.map(m => ({ role: m.role, parts: [{ text: m.text }] }));
      const stream = gemini.streamChat(userMsg.text, history);
      let modelText = '';
      setChatMessages(prev => [...prev, { role: 'model', text: '' }]);
      for await (const chunk of stream) {
        modelText += chunk;
        setChatMessages(prev => {
          const newMsgs = [...prev];
          newMsgs[newMsgs.length - 1].text = modelText;
          return newMsgs;
        });
      }
    } catch (err) {
      handleError(err);
    } finally {
      setIsChatLoading(false);
    }
  }
};

const TabButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black tracking-tight transition-all ${
      active 
        ? 'bg-white text-indigo-600 shadow-lg scale-105' 
        : 'text-slate-500 hover:text-slate-900 hover:bg-white/50'
    }`}
  >
    {icon}
    <span className="hidden md:inline uppercase tracking-widest text-[10px]">{label}</span>
  </button>
);

export default App;
