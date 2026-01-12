import React, { useState, useRef } from 'react';
import { Play, Pause, Volume2, Loader2 } from 'lucide-react';

const AudioPlayer = ({ src }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const audioRef = useRef(null);

    const togglePlay = () => {
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const handleTimeUpdate = () => {
        const duration = audioRef.current.duration;
        const currentTime = audioRef.current.currentTime;
        if (duration) {
            setProgress((currentTime / duration) * 100);
        }
    };

    const handleSeek = (e) => {
        const progressBar = e.currentTarget;
        const rect = progressBar.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const width = rect.width;
        const percentage = clickX / width;

        if (audioRef.current && audioRef.current.duration) {
            const newTime = percentage * audioRef.current.duration;
            audioRef.current.currentTime = newTime;
            setProgress(percentage * 100);
        }
    };

    return (
        <div className="w-full max-w-xl mx-auto bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-6 shadow-xl backdrop-blur-sm group">
            <button
                onClick={togglePlay}
                className="w-12 h-12 bg-sky-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-sky-500/20 hover:scale-105 active:scale-95 transition-all"
            >
                {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} className="translate-x-0.5" fill="currentColor" />}
            </button>

            <div className="flex-1 space-y-2">
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    <span>Audio Stream</span>
                    <span>{isPlaying ? 'Live' : 'Paused'}</span>
                </div>
                <div
                    className="h-1.5 bg-white/5 rounded-full overflow-hidden cursor-pointer hover:h-2 transition-all"
                    onClick={handleSeek}
                >
                    <div
                        className="h-full bg-sky-500 shadow-[0_0_10px_#0ea5e9] transition-all duration-100 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            <Volume2 size={18} className="text-slate-500 group-hover:text-sky-400 transition-colors" />

            <audio
                ref={audioRef}
                src={src}
                onTimeUpdate={handleTimeUpdate}
                onEnded={() => {
                    setIsPlaying(false);
                    setProgress(0);
                }}
                className="hidden"
            />
        </div>
    );
};

export default AudioPlayer;
