import React, { useEffect, useState } from 'react';
import { Worker, Viewer } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import { searchPlugin } from '@react-pdf-viewer/search';
import { Loader2, Volume2 } from 'lucide-react';

import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';
import '@react-pdf-viewer/search/lib/styles/index.css';

const PDFViewer = ({ fileUrl, highlightQuote, onReadSelection, playingSelectionText }) => {
    // Initialize plugins directly at the top level of the component
    // These calls are factory functions, not hooks.
    const defaultLayoutPluginInstance = defaultLayoutPlugin();
    const searchPluginInstance = searchPlugin();
    const { highlight, clearHighlights } = searchPluginInstance;

    const [selectedText, setSelectedText] = useState('');
    const [selectionPosition, setSelectionPosition] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);

    // Consolidated highlight effect
    useEffect(() => {
        if (!fileUrl || !highlight) return;

        const target = playingSelectionText || highlightQuote;
        if (target) {
            const searchText = target.replace(/\s+/g, ' ').trim();
            console.log("DEBUG: Highlighting target:", searchText);
            highlight({
                keyword: searchText,
                matchCase: false,
            });
        } else {
            clearHighlights();
        }
    }, [highlightQuote, playingSelectionText, fileUrl]);

    // Handle text selection
    useEffect(() => {
        const handleSelection = () => {
            if (isGenerating) return;
            const selection = window.getSelection();
            if (!selection) return;

            const text = selection.toString().trim();

            if (text.length > 0) {
                setSelectedText(text);

                // Get selection position for button placement
                try {
                    const range = selection.getRangeAt(0);
                    const rect = range.getBoundingClientRect();
                    setSelectionPosition({
                        top: rect.top + window.scrollY - 50,
                        left: rect.left + window.scrollX + (rect.width / 2)
                    });
                } catch (e) {
                    console.error("Selection error:", e);
                }
            } else {
                setSelectedText('');
                setSelectionPosition(null);
            }
        };

        document.addEventListener('mouseup', handleSelection);
        document.addEventListener('touchend', handleSelection);

        return () => {
            document.removeEventListener('mouseup', handleSelection);
            document.removeEventListener('touchend', handleSelection);
        };
    }, [isGenerating]);

    const handleReadSelectionInternal = async () => {
        if (selectedText && onReadSelection) {
            setIsGenerating(true);
            try {
                await onReadSelection(selectedText);
            } catch (err) {
                console.error("Read selection error:", err);
            } finally {
                setIsGenerating(false);
            }
        }
        // Clear selection
        window.getSelection().removeAllRanges();
        setSelectedText('');
        setSelectionPosition(null);
    };

    if (!fileUrl) {
        return (
            <div className="h-full w-full flex items-center justify-center text-slate-500 italic bg-[#1e1933]">
                <Loader2 className="animate-spin mr-2" /> Initializing PDF Stream...
            </div>
        );
    }

    return (
        <div className="h-full w-full rounded-3xl overflow-hidden glass border border-white/5 relative">
            {/* Read Selection Button */}
            {selectedText && selectionPosition && (
                <button
                    onClick={handleReadSelectionInternal}
                    disabled={isGenerating}
                    className="fixed z-50 flex items-center gap-2 px-3 py-2 bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs rounded-lg shadow-2xl transition-all hover:scale-105 active:scale-95 disabled:bg-slate-700"
                    style={{
                        top: `${selectionPosition.top}px`,
                        left: `${selectionPosition.left}px`,
                        transform: 'translateX(-50%)'
                    }}
                >
                    {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Volume2 size={14} />}
                    {isGenerating ? 'Generating...' : 'Read Selection'}
                </button>
            )}

            <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
                <Viewer
                    fileUrl={fileUrl}
                    plugins={[defaultLayoutPluginInstance, searchPluginInstance]}
                    theme="dark"
                />
            </Worker>
        </div>
    );
};

export default PDFViewer;
