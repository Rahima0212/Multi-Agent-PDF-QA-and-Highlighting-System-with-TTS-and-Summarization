import React, { useState, useEffect } from 'react';
import { documentApi } from './api/client';
import {
    FileText, Upload, MessageSquare, Headset,
    FileSearch, Sparkles, Loader2, Play, Pause,
    ChevronRight, LayoutDashboard, History, Settings,
    BrainCircuit, Zap, Globe, ArrowLeft, Clock, Share2,
    CheckCircle2, ChevronDown, ChevronUp, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PDFViewer from './components/PDFViewer';
import AudioPlayer from './components/AudioPlayer';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const FormattedText = ({ text }) => {
    if (!text) return null;

    // Split into paragraphs
    const paragraphs = text.split('\n');

    return (
        <div className="space-y-4">
            {paragraphs.map((para, i) => {
                const trimmed = para.trim();
                if (!trimmed) return <br key={i} />;

                // Handle headings
                if (trimmed.startsWith('### ')) {
                    return (
                        <h4 key={i} className="text-sky-400 font-bold text-base mt-6 mb-2 flex items-center gap-2">
                            <div className="w-1 h-4 bg-sky-500 rounded-full" />
                            {parseInline(trimmed.substring(4))}
                        </h4>
                    );
                }

                // Handle bullet points
                if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                    return (
                        <li key={i} className="list-none flex gap-3 text-slate-300 ml-2">
                            <span className="text-sky-500 font-bold mt-1">•</span>
                            <span>{parseInline(trimmed.substring(2))}</span>
                        </li>
                    );
                }

                return <p key={i} className="text-slate-300 leading-relaxed text-sm lg:text-base">{parseInline(trimmed)}</p>;
            })}
        </div>
    );
};

const parseInline = (text) => {
    // Basic bolding **text**
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={i} className="text-sky-400 font-bold">{part.substring(2, part.length - 2)}</strong>;
        }
        return part;
    });
};

function App() {
    const [documents, setDocuments] = useState([]);
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [query, setQuery] = useState('');
    const [interactions, setInteractions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [currentPdfUrl, setCurrentPdfUrl] = useState(null);
    const [activeQuote, setActiveQuote] = useState('');
    const [summaryExpanded, setSummaryExpanded] = useState(true);
    const [fullAudioPath, setFullAudioPath] = useState(null);
    const [generatingAudio, setGeneratingAudio] = useState(false);
    const [playingSelectionText, setPlayingSelectionText] = useState('');

    // Hidden audio element for selection playback
    const selectionAudioRef = React.useRef(null);

    // Initial load
    useEffect(() => { loadDocuments(); }, []);

    // Load interactions and set initial PDF when a doc is selected
    useEffect(() => {
        if (selectedDoc) {
            loadInteractions(selectedDoc.id);
            setCurrentPdfUrl(`${API_URL}/data/docs/${selectedDoc.id}.pdf`);
            setActiveQuote('');
            setFullAudioPath(null); // Reset full audio when switching docs
            setPlayingSelectionText(''); // Clear any playing selection
        }
    }, [selectedDoc]);

    // Polling for document completion
    useEffect(() => {
        let interval;
        if (selectedDoc && (!selectedDoc.summary || !selectedDoc.audio_path)) {
            interval = setInterval(async () => {
                try {
                    const res = await documentApi.get(selectedDoc.id);
                    // Update if we got new data
                    if (res.data.summary !== selectedDoc.summary || res.data.audio_path !== selectedDoc.audio_path) {
                        setSelectedDoc(res.data);
                        if (res.data.summary && res.data.audio_path) {
                            loadDocuments(); // Refresh sidebar too
                            clearInterval(interval);
                        }
                    }
                } catch (err) { console.error("Polling error:", err); }
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [selectedDoc]);

    const loadDocuments = async () => {
        try {
            const res = await documentApi.list();
            setDocuments(res.data);
        } catch (err) { console.error("List error:", err); }
    };

    const loadInteractions = async (id) => {
        try {
            const res = await documentApi.getInteractions(id);
            setInteractions(res.data);
        } catch (err) { console.error("Interactions error:", err); }
    };

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        try {
            const res = await documentApi.upload(file);
            setSelectedDoc(res.data); // Select the info immediately
            loadDocuments();
        } catch (err) { console.error("Upload error:", err); }
        finally { setUploading(false); }
    };

    const handleQuery = async (e) => {
        e.preventDefault();
        if (!query || !selectedDoc) return;

        const userQuery = query;
        setQuery('');
        setLoading(true);

        // Optimistic UI: Add user query to interactions immediately
        const optimisticInteraction = {
            query: userQuery,
            answer: null, // Indicates it's still loading
            isOptimistic: true
        };
        setInteractions(prev => [...prev, optimisticInteraction]);

        try {
            const res = await documentApi.query(selectedDoc.id, userQuery);

            // Remove the optimistic one and add the real one
            setInteractions(prev => {
                const filtered = prev.filter(i => !i.isOptimistic || i.query !== userQuery);
                return [...filtered, res.data];
            });

            // If the response has a highlight path, update the viewer
            if (res.data.highlight_path) {
                console.log("DEBUG: Setting PDF view to highlighted version:", res.data.highlight_path);
                setCurrentPdfUrl(`${API_URL}${res.data.highlight_path}`);
            }
            // Use the first quote for auto-scrolling if available
            if (res.data.quotes && res.data.quotes.length > 0) {
                setActiveQuote(res.data.quotes[0]);
            }
        } catch (err) {
            console.error("Query error:", err.response?.data || err.message);
            // Remove the optimistic interaction on error too
            setInteractions(prev => prev.filter(i => !i.isOptimistic || i.query !== userQuery));
            alert(err.response?.data?.detail || "Processing might be incomplete. Please wait.");
        }
        finally { setLoading(false); }
    };

    const handleGenerateFullAudio = async () => {
        if (!selectedDoc) return;
        setGeneratingAudio(true);
        try {
            const res = await documentApi.generateFullAudio(selectedDoc.id);
            setFullAudioPath(res.data.audio_path);
        } catch (err) {
            console.error("Audio generation error:", err);
            alert(err.response?.data?.detail || "Failed to generate audio");
        } finally {
            setGeneratingAudio(false);
        }
    };

    const handleReadSelection = async (selectedText) => {
        try {
            const res = await documentApi.generateSelectionAudio(selectedText);
            const audioPath = `${API_URL}${res.data.audio_path}`;

            // Set the text to highlight
            setPlayingSelectionText(selectedText);

            // Play audio immediately
            if (selectionAudioRef.current) {
                selectionAudioRef.current.src = audioPath;
                selectionAudioRef.current.play();
            }
        } catch (err) {
            console.error("Selection audio generation error:", err);
            alert(err.response?.data?.detail || "Failed to generate selection audio");
        }
    };

    return (
        <div className="flex h-screen bg-[#020617] text-slate-200 font-sans overflow-hidden">
            <div className="bg-mesh"></div>

            {/* Sidebar from Stitch */}
            <aside className="w-20 lg:w-72 border-r border-white/5 bg-[#0f1923]/40 backdrop-blur-xl flex flex-col z-20">
                <div className="p-6 flex items-center gap-3">
                    <div className="w-10 h-10 bg-sky-500 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(14,165,233,0.3)]">
                        <BrainCircuit size={24} className="text-white" />
                    </div>
                    <h1 className="text-xl font-bold tracking-tight font-display lg:block hidden">PDFagent<span className="text-sky-500">.AI</span></h1>
                </div>

                <div className="flex-1 px-4 py-8">
                    <nav className="space-y-6">
                        <div>
                            <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2 mb-4">Core Systems</h2>
                            <div className="space-y-1">
                                <button className="w-full flex items-center gap-3 p-3 rounded-xl bg-sky-500/10 text-sky-400 font-bold transition-all"><LayoutDashboard size={18} /> <span className="lg:block hidden">Intelligence Feed</span></button>

                            </div>
                        </div>
                    </nav>
                </div>

                <div className="px-4">
                    <label className="flex flex-col items-center justify-center w-full p-4 mb-2 border-2 border-dashed border-slate-800 rounded-2xl cursor-pointer hover:border-sky-500/40 hover:bg-sky-500/5 transition-all group">
                        {uploading ? <Loader2 className="animate-spin text-sky-500" /> : <Upload className="text-slate-600 group-hover:text-sky-500" size={24} />}
                        <span className="mt-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            {uploading ? 'Processing...' : 'Upload PDF'}
                        </span>
                        <input type="file" className="hidden" accept=".pdf" onChange={handleUpload} />
                    </label>
                </div>

                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar lg:block hidden">
                    <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2 mb-4">Assets</h2>

                    <div className="space-y-2">
                        {documents.map((doc) => (
                            <button
                                key={doc.id}
                                onClick={() => setSelectedDoc(doc)}
                                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${selectedDoc?.id === doc.id ? 'bg-[#1e1933] text-sky-400 ring-1 ring-sky-500/20' : 'hover:bg-white/5 text-slate-400'}`}
                            >
                                <FileText size={16} />
                                <span className="truncate text-sm font-medium">{doc.filename}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col relative overflow-hidden">
                {!selectedDoc ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                        <Sparkles size={64} className="text-sky-500 mb-6 opacity-20" />
                        <h2 className="text-3xl font-bold mb-2 font-display">Ready for Analysis</h2>
                        <p className="text-slate-500 max-w-sm">Select an asset from your library to begin synthesized audio generation.</p>
                    </div>
                ) : (
                    <div className="flex-1 flex overflow-hidden">
                        {/* Center Section: Stitch Dashboard Style */}
                        <div className="flex-1 flex flex-col overflow-y-auto bg-[#0f1923] custom-scrollbar">
                            <header className="sticky top-0 z-10 p-6 bg-[#0f1923]/80 backdrop-blur-md flex items-center justify-between border-b border-white/5">
                                <div className="flex items-center gap-4">
                                    <button onClick={() => setSelectedDoc(null)} className="lg:hidden"><ArrowLeft size={20} /></button>
                                    <h2 className="text-lg font-bold font-display">{selectedDoc.filename}</h2>
                                </div>
                                <Settings className="text-slate-500 cursor-pointer" size={20} />
                            </header>

                            <div className="p-4 lg:p-8 space-y-8 max-w-4xl mx-auto w-full">
                                {/* Agent Status Component from Stitch */}
                                <section>
                                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Status</h3>
                                    <div className="bg-[#1e1933] p-6 rounded-2xl border border-white/5 shadow-xl">
                                        <div className="flex justify-between items-center mb-4">
                                            <div className="flex items-center gap-2">
                                                <BrainCircuit className={selectedDoc.summary ? "text-[#359EFF]" : "text-slate-500 animate-pulse"} size={20} />
                                                <p className="font-bold">{selectedDoc.summary ? "Progress" : "Initializing Agents..."}</p>
                                            </div>
                                            <span className="text-[#359EFF] font-bold">{selectedDoc.summary ? '100%' : '20%'}</span>
                                        </div>
                                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden mb-4">
                                            <div className={`h-full bg-[#359EFF] shadow-[0_0_10px_#359EFF] transition-all duration-1000 ${selectedDoc.summary ? 'w-full' : 'w-1/5 animate-pulse'}`} />
                                        </div>
                                        <div className="flex justify-between items-center text-xs">
                                            <p className="text-slate-400 italic">
                                                {selectedDoc.summary ? 'Agent Task Completed Successfully' : 'Extracting context & generating summary...'}
                                            </p>
                                            <span className={`px-2 py-1 ${selectedDoc.summary ? 'bg-sky-500/10 text-sky-400' : 'bg-amber-500/10 text-amber-500'} rounded uppercase font-black text-[10px]`}>
                                                {selectedDoc.summary ? 'Active' : 'Processing'}
                                            </span>
                                        </div>
                                    </div>
                                </section>

                                {/* Audio Summary Player - Simplified & Collapsible */}
                                {selectedDoc.summary && (
                                    <section>
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Executive Summary</h3>
                                            <button
                                                onClick={() => setSummaryExpanded(!summaryExpanded)}
                                                className="text-[10px] font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1 uppercase tracking-tighter transition-colors"
                                            >
                                                {summaryExpanded ? 'Collapse' : 'Expand'}
                                                {summaryExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                            </button>
                                        </div>

                                        <motion.div
                                            initial={false}
                                            animate={{ height: summaryExpanded ? 'auto' : '100px' }}
                                            className="bg-[#1e1933] rounded-2xl overflow-hidden border border-white/5 shadow-2xl relative"
                                        >
                                            <div className="p-6 lg:p-8 space-y-8">
                                                {/* Top Header */}
                                                <div className="flex justify-between items-center border-b border-white/5 pb-4">
                                                    <div className="flex items-center gap-2">
                                                        <CheckCircle2 className="text-sky-500" size={18} />
                                                        <h4 className="text-lg font-bold font-display uppercase tracking-wider">Summary Result</h4>
                                                    </div>
                                                </div>

                                                {/* Summary Text (Only full content if expanded) */}
                                                <div className={!summaryExpanded ? "max-h-20 overflow-hidden relative fade-bottom" : ""}>
                                                    <FormattedText text={selectedDoc.summary} />
                                                    {!summaryExpanded && <div className="absolute inset-0 bg-gradient-to-t from-[#1e1933] to-transparent" />}
                                                </div>

                                                {/* Audio Section - Simple Bar (Always visible or only if expanded? Let's keep it visible at the bottom if possible, or just inside) */}
                                                <div className="pt-6 border-t border-white/5">
                                                    {selectedDoc.audio_path ? (
                                                        <AudioPlayer key={selectedDoc.audio_path} src={`${API_URL}${selectedDoc.audio_path}`} />
                                                    ) : (
                                                        <div className="flex items-center justify-center gap-3 p-6 bg-white/5 rounded-2xl text-slate-500 italic text-sm">
                                                            <Loader2 className="animate-spin text-sky-500" size={20} />
                                                            Synthesizing Audio Stream...
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </motion.div>
                                    </section>
                                )}

                                {/* PDF Viewing Area */}
                                <section className="pb-20">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Source Documentation</h3>
                                        {currentPdfUrl !== `${API_URL}/data/docs/${selectedDoc.id}.pdf` && (
                                            <button
                                                onClick={() => setCurrentPdfUrl(`${API_URL}/data/docs/${selectedDoc.id}.pdf`)}
                                                className="text-[10px] font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1 uppercase tracking-tighter transition-colors"
                                            >
                                                <ArrowLeft size={12} /> View Original
                                            </button>
                                        )}
                                    </div>

                                    {/* Read PDF Controls - Above PDF Viewer */}
                                    <div className="mb-4 space-y-3">
                                        {/* Read PDF Button */}
                                        <div className="flex items-center justify-end">
                                            <button
                                                onClick={handleGenerateFullAudio}
                                                disabled={generatingAudio}
                                                className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-400 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold text-sm rounded-lg shadow-lg shadow-sky-500/20 transition-all hover:scale-105 active:scale-95 disabled:scale-100"
                                            >
                                                {generatingAudio ? (
                                                    <>
                                                        <Loader2 size={16} className="animate-spin" />
                                                        Generating Audio...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Play size={16} fill="currentColor" />
                                                        Read PDF
                                                    </>
                                                )}
                                            </button>
                                        </div>

                                        {/* Full PDF Audio Player */}
                                        {fullAudioPath && (
                                            <div className="bg-[#1e1933] rounded-xl p-4 border border-white/10 shadow-xl">
                                                <div className="flex items-center gap-3 mb-3">
                                                    <div className="w-2 h-2 bg-sky-500 rounded-full animate-pulse"></div>
                                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Full PDF Audio</span>
                                                    <button
                                                        onClick={() => setFullAudioPath(null)}
                                                        className="ml-auto text-slate-500 hover:text-slate-300 transition-colors"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                                <AudioPlayer src={`${API_URL}${fullAudioPath}`} />
                                            </div>
                                        )}
                                    </div>

                                    {/* Hidden audio element for selection playback */}
                                    <audio
                                        ref={selectionAudioRef}
                                        onEnded={() => setPlayingSelectionText('')}
                                        onPause={() => setPlayingSelectionText('')}
                                        onError={() => setPlayingSelectionText('')}
                                        className="hidden"
                                    />

                                    {/* PDF Viewer Container */}
                                    <div className="bg-[#1e1933] rounded-2xl overflow-hidden border border-white/5 min-h-[600px] shadow-2xl">
                                        <PDFViewer
                                            key={currentPdfUrl}
                                            fileUrl={currentPdfUrl}
                                            highlightQuote={activeQuote}
                                            onReadSelection={handleReadSelection}
                                            playingSelectionText={playingSelectionText}
                                        />
                                    </div>
                                </section>
                            </div>
                        </div>

                        {/* Right Panel: Chat Intelligence Feed */}
                        <div className="w-[400px] hidden xl:flex flex-col border-l border-white/5 bg-[#131022]/30 backdrop-blur-xl shrink-0">
                            <header className="p-6 border-b border-white/5 flex items-center gap-3">
                                <MessageSquare className="text-sky-400" size={20} />
                                <h3 className="font-bold font-display">Intelligence Feed</h3>
                            </header>

                            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                                {interactions.map((i, idx) => (
                                    <motion.div key={idx} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-3">
                                        <div className="bg-white/5 p-4 rounded-2xl rounded-tr-none border border-white/5 ml-8">
                                            <p className="text-slate-500 text-[10px] font-black uppercase mb-1">User Query</p>
                                            <p className="text-sm">{i.query}</p>
                                        </div>
                                        {i.answer ? (
                                            <div className="bg-sky-500/5 p-4 rounded-2xl rounded-tl-none border border-sky-500/20 mr-8">
                                                <p className="text-sky-400 text-[10px] font-black uppercase mb-1">Agent Response</p>
                                                <FormattedText text={i.answer} />
                                            </div>
                                        ) : (
                                            <div className="bg-sky-500/5 p-4 rounded-2xl rounded-tl-none border border-sky-500/20 mr-8 animate-pulse">
                                                <p className="text-sky-400/50 text-[10px] font-black uppercase mb-1">Agent Thinking...</p>
                                                <div className="h-4 bg-sky-500/10 rounded w-3/4 mb-2"></div>
                                                <div className="h-4 bg-sky-500/10 rounded w-1/2"></div>
                                            </div>
                                        )}
                                    </motion.div>
                                ))}
                                {loading && interactions.every(i => i.answer !== null) && (
                                    <div className="flex items-center gap-3 text-sky-400/50 text-xs animate-pulse p-4">
                                        <Loader2 className="animate-spin" size={14} /> ANALYZING CONTEXT...
                                    </div>
                                )}
                            </div>

                            <div className="p-6 border-t border-white/5 bg-[#0f1923]">
                                <form onSubmit={handleQuery} className="relative">
                                    <input
                                        type="text"
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        placeholder="Ask a question..."
                                        className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-5 pr-12 focus:outline-none focus:border-sky-500/50 transition-all text-sm"
                                    />
                                    <button type="submit" className="absolute right-2 top-2 bottom-2 w-10 bg-[#359EFF] rounded-lg flex items-center justify-center text-white shadow-lg shadow-sky-500/20">
                                        <Zap size={16} fill="white" />
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

export default App;