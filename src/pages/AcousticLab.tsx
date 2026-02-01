import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Play,
    Pause,
    SkipBack,
    SkipForward,
    Volume2,
    VolumeX,
    Brain,
    Film,
    ChevronRight,
    ChevronLeft,
    Repeat,
    Info,
    FileVideo,
    Tag,
    Mic,
    Clock,
    Monitor,
    MousePointer2,
    Scissors,
    Music
} from 'lucide-react';
import apiClient from '../lib/api';

const cn = (...inputs: any[]) => inputs.filter(Boolean).join(' ');

interface Take {
    id: number;
    file_name: string;
    file_path?: string;
    file_size?: number;
    duration: number;
    confidence_score: number;
    ai_metadata: {
        emotion?: string;
        vocal_cues?: string[];
        audio?: {
            audio_description?: string;
            transcript?: string;
            behavioral_markers?: any;
        };
    };
}

const API_BASE = 'http://localhost:8000';

const generateWaveformData = (duration: number, seed: number = 0): number[] => {
    const samples = Math.max(200, Math.floor(duration * 15));
    const data: number[] = [];
    for (let i = 0; i < samples; i++) {
        const t = i / samples;
        const base = Math.sin(t * 30 + seed) * 0.4; // Stronger base
        const mid = Math.sin(t * 80 + seed * 2) * 0.25;
        const noise = (Math.random() - 0.5) * 0.35;
        // Make it look like speech: bursts of amplitude
        const envelope = Math.abs(Math.sin(t * 10 + seed));
        data.push(Math.max(0.05, Math.abs(base + mid + noise) * envelope));
    }
    return data;
};

const getEmotionColor = (emotion: string): string => {
    const colors: Record<string, string> = {
        joy: '#22c55e', sadness: '#3b82f6', anger: '#ef4444', fear: '#a855f7',
        surprise: '#f97316', disgust: '#84cc16', neutral: '#6b7280', analytical: '#06b6d4'
    };
    return colors[emotion?.toLowerCase()] || colors.neutral;
};

const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const formatTimecode = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const frames = Math.floor((seconds % 1) * 24);
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
};

const formatFileSize = (bytes?: number): string => {
    if (!bytes) return 'Unknown';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
};

const getVideoUrl = (take: Take): string | null => {
    if (take.file_path) {
        const filename = take.file_path.split(/[\\/]/).pop() || take.file_name;
        return `${API_BASE}/media_files/${filename}`;
    }
    if (take.file_name) {
        return `${API_BASE}/media_files/${take.file_name}`;
    }
    return null;
};

export const AcousticLab: React.FC = () => {
    const [takes, setTakes] = useState<Take[]>([]);
    const [selectedTake, setSelectedTake] = useState<Take | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [waveformData, setWaveformData] = useState<number[]>([]);
    const [notes, setNotes] = useState('');
    const [volume, setVolume] = useState(0.8);
    const [isMuted, setIsMuted] = useState(false);
    const [isRepeat, setIsRepeat] = useState(false);
    const [showInspector, setShowInspector] = useState(true);
    const [videoError, setVideoError] = useState<string | null>(null);
    const [videoLoaded, setVideoLoaded] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const timelineRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchTakes = async () => {
            try {
                const response = await apiClient.get('/media/');
                if (response.data?.length > 0) {
                    setTakes(response.data);
                    setSelectedTake(response.data[0]);
                }
            } catch {
                const mockTakes: Take[] = [
                    { id: 1, file_name: 'Screen Recording 2026-01-30 070713.mp4', file_size: 12582912, duration: 26, confidence_score: 40.8, ai_metadata: { emotion: 'neutral', audio: { audio_description: 'Hybrid analog-digital signal chain providing a balanced and professional sonic footprint.', transcript: '"I have already got something. You know. When the police is that I am speaking..."' } } },
                    { id: 2, file_name: 'Screen Recording 2026-01-30 071652.mp4', file_size: 8456123, duration: 19, confidence_score: 45, ai_metadata: { emotion: 'neutral', audio: { transcript: "No output detected." } } },
                    { id: 3, file_name: 'Screen Recording 2026-01-30 073234.mp4', file_size: 6123456, duration: 15, confidence_score: 62, ai_metadata: { emotion: 'neutral' } },
                    { id: 4, file_name: 'Screen Recording 2026-01-30 091210.mp4', file_size: 24567890, duration: 52, confidence_score: 78, ai_metadata: { emotion: 'joy' } },
                    { id: 5, file_name: 'ABC.mp4', file_size: 15678901, duration: 33, confidence_score: 65, ai_metadata: { emotion: 'disgust' } },
                    { id: 6, file_name: 'test_upload.mp4', file_size: 15678901, duration: 33, confidence_score: 80, ai_metadata: { emotion: 'disgust' } },
                ];
                setTakes(mockTakes);
                setSelectedTake(mockTakes[0]);
            }
        };
        fetchTakes();
    }, []);

    useEffect(() => {
        if (selectedTake) {
            const data = generateWaveformData(selectedTake.duration, selectedTake.id);
            setWaveformData(data);
            setCurrentTime(0);
            setDuration(selectedTake.duration);
            setIsPlaying(false);
            setVideoError(null);
            setVideoLoaded(false);
        }
    }, [selectedTake]);

    const handleTimeUpdate = useCallback(() => {
        if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
    }, []);

    const handleLoadedMetadata = useCallback(() => {
        if (videoRef.current) {
            setDuration(videoRef.current.duration);
            setVideoLoaded(true);
            setVideoError(null);
        }
    }, []);

    const handleVideoError = useCallback(() => {
        setVideoError('Playback error');
        setVideoLoaded(false);
    }, []);

    const handleEnded = useCallback(() => {
        if (isRepeat) {
            videoRef.current?.play();
        } else {
            setIsPlaying(false);
        }
    }, [isRepeat]);

    const handlePlayPause = useCallback(() => {
        if (videoRef.current) {
            if (isPlaying) videoRef.current.pause();
            else videoRef.current.play().catch(console.error);
        }
        setIsPlaying(!isPlaying);
    }, [isPlaying]);

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.volume = volume;
            videoRef.current.muted = isMuted;
        }
    }, [volume, isMuted]);

    const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!timelineRef.current || !selectedTake) return;
        const rect = timelineRef.current.getBoundingClientRect();
        const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const newTime = percent * duration;
        setCurrentTime(newTime);
        if (videoRef.current) videoRef.current.currentTime = newTime;
    }, [duration]);

    const handleSkip = useCallback((amount: number) => {
        const newTime = Math.max(0, Math.min(duration, currentTime + amount));
        setCurrentTime(newTime);
        if (videoRef.current) videoRef.current.currentTime = newTime;
    }, [currentTime, duration]);

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
    const videoUrl = selectedTake ? getVideoUrl(selectedTake) : null;

    return (
        <div className="h-full bg-[#08080c] flex flex-col font-sans select-none overflow-hidden text-xs">
            {/* Header */}
            <div className="h-8 bg-[#0a0a10] border-b border-white/5 flex items-center px-4 justify-between flex-shrink-0">
                <div className="flex items-center gap-2">
                    <span className="text-cyan-500 font-bold uppercase tracking-widest text-[10px]">Acoustic Lab</span>
                    <span className="px-1.5 py-0.5 rounded bg-white/5 text-[9px] text-white/40">v2.1</span>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex bg-[#050508] rounded p-1 border border-white/5">
                        <button onClick={() => setShowInspector(false)} className={cn("px-3 py-1 rounded text-[10px] font-bold transition-colors", !showInspector ? "bg-cyan-500 text-white" : "text-white/40 hover:text-white")}>Cinema</button>
                        <button onClick={() => setShowInspector(true)} className={cn("px-3 py-1 rounded text-[10px] font-bold transition-colors", showInspector ? "bg-cyan-500 text-white" : "text-white/40 hover:text-white")}>Editor</button>
                    </div>
                </div>
            </div>

            <div className="flex flex-1 min-h-0">
                {/* 1. ULTRA-COMPACT MEDIA LIST (Left) - w-16 icons only */}
                <aside className="w-16 bg-[#0b0b11] border-r border-white/5 overflow-y-auto flex-shrink-0 flex flex-col items-center py-2 space-y-2">
                    {takes.map(take => (
                        <button
                            key={take.id}
                            onClick={() => setSelectedTake(take)}
                            title={take.file_name}
                            className={cn(
                                "w-10 h-10 rounded-lg flex items-center justify-center transition-all relative group",
                                selectedTake?.id === take.id ? "bg-white/10 ring-1 ring-cyan-500" : "bg-white/5 hover:bg-white/10"
                            )}
                        >
                            <Film size={16} className={cn(selectedTake?.id === take.id ? "text-cyan-500" : "text-white/40")} />
                            <div className={cn("absolute bottom-1 right-1 w-2 h-2 rounded-full border border-[#0b0b11]", `bg-${getEmotionColor(take.ai_metadata.emotion || 'neutral')}`)} style={{ backgroundColor: getEmotionColor(take.ai_metadata.emotion || 'neutral') }} />

                            {/* Hover Tooltip */}
                            <div className="absolute left-12 bg-black/90 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50 border border-white/10 shadow-xl">
                                {take.file_name}
                            </div>
                        </button>
                    ))}
                    <div className="w-8 h-px bg-white/5 my-2" />
                    <button className="w-10 h-10 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 flex items-center justify-center text-cyan-500 transition-colors">
                        <span className="text-lg font-light">+</span>
                    </button>
                </aside>

                {/* 2. MAIN WORKSPACE (Center) */}
                <main className="flex-1 flex flex-col bg-[#050508] min-w-0 relative">

                    {/* VIDEO PLAYER */}
                    <div className="flex-1 p-2 min-h-0 bg-black/50 flex flex-col items-center justify-center relative border-b border-white/5">
                        {selectedTake ? (
                            <div className="relative w-full h-full max-h-full flex items-center justify-center">
                                <video
                                    ref={videoRef}
                                    key={selectedTake.id}
                                    className="max-w-full max-h-full object-contain"
                                    onTimeUpdate={handleTimeUpdate}
                                    onLoadedMetadata={handleLoadedMetadata}
                                    onEnded={handleEnded}
                                    onError={handleVideoError}
                                    playsInline
                                >
                                    {videoUrl && <source src={videoUrl} type="video/mp4" />}
                                </video>

                                {/* Controls Overlay */}
                                <div className="absolute bottom-6 flex items-center gap-4 bg-black/60 backdrop-blur rounded-full px-6 py-2 border border-white/10 shadow-2xl transition-opacity hover:opacity-100 opacity-0 group-hover:opacity-100">
                                    <button onClick={() => handleSkip(-10)} className="text-white/70 hover:text-white transition-colors text-[10px] uppercase font-bold">-10s</button>
                                    <button onClick={handlePlayPause} className="text-white hover:scale-110 transition-transform">
                                        {isPlaying ? <Pause size={24} fill="white" /> : <Play size={24} fill="white" />}
                                    </button>
                                    <button onClick={() => handleSkip(10)} className="text-white/70 hover:text-white transition-colors text-[10px] uppercase font-bold">+10s</button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-white/20 flex flex-col items-center">
                                <Film size={48} className="mb-2 opacity-50" />
                                <span className="text-[10px] uppercase tracking-widest">Select Clip</span>
                            </div>
                        )}
                    </div>

                    {/* TIMELINE EDITOR PANEL */}
                    <div className="h-48 bg-[#0b0b11] border-t border-white/5 flex flex-col">
                        {/* 1. Toolbar */}
                        <div className="h-8 flex items-center px-4 border-b border-white/5 gap-4">
                            <span className="text-[10px] text-white/40 uppercase font-bold">{formatTimecode(currentTime)} <span className="text-white/20">/ {formatTimecode(duration)}</span></span>
                            <div className="h-4 w-px bg-white/10" />
                            <div className="flex gap-2">
                                <button className="p-1 text-cyan-500 bg-cyan-500/10 rounded"><MousePointer2 size={12} /></button>
                                <button className="p-1 text-white/40 hover:text-white"><Scissors size={12} /></button>
                            </div>
                            <div className="flex-1" />
                            <div className="flex items-center gap-2 w-32">
                                <Volume2 size={12} className="text-white/40" />
                                <input type="range" min="0" max="1" step="0.05" value={isMuted ? 0 : volume} onChange={(e) => setVolume(parseFloat(e.target.value))} className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full" />
                            </div>
                        </div>

                        {/* 2. Tracks Area */}
                        <div className="flex-1 overflow-x-auto overflow-y-hidden relative custom-scrollbar bg-[#08080c] select-none" ref={timelineRef} onClick={handleSeek}>
                            {selectedTake && (
                                <div className="absolute inset-0 min-w-full h-full">
                                    {/* Ruler */}
                                    <div className="h-6 border-b border-white/5 relative">
                                        {Array.from({ length: Math.ceil(duration / 2) + 1 }, (_, i) => {
                                            const time = i * 2;
                                            if (time > duration) return null;
                                            const pos = (time / duration) * 100;
                                            return (
                                                <div key={i} className="absolute bottom-0 h-2 border-l border-white/20 pl-1" style={{ left: `${pos}%` }}>
                                                    <span className="text-[8px] text-white/40 font-mono leading-none">{formatTime(time)}</span>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Video Track */}
                                    <div className="h-12 border-b border-white/5 relative my-1 mx-2">
                                        <div className="absolute inset-0 bg-blue-900/20 rounded border border-blue-500/30 flex items-center overflow-hidden">
                                            {/* Simulated frames */}
                                            <div className="flex w-full h-full opacity-30">
                                                {Array.from({ length: 10 }).map((_, i) => (
                                                    <div key={i} className="flex-1 border-r border-white/5 bg-white/5" />
                                                ))}
                                            </div>
                                            <span className="absolute left-2 text-[9px] text-blue-300 font-bold flex items-center gap-1">
                                                <Film size={10} /> {selectedTake.file_name}
                                            </span>
                                        </div>
                                    </div>

                                    {/* AUDIO WAVEFORM TRACK (The "Sound Wave") */}
                                    <div className="h-16 relative mx-2">
                                        <div className="absolute inset-0 bg-cyan-900/10 rounded border border-cyan-500/30 flex items-center px-1 overflow-hidden">
                                            <div className="absolute left-0 top-0 bottom-0 w-8 bg-cyan-900/40 z-10 flex items-center justify-center border-r border-cyan-500/20">
                                                <Music size={10} className="text-cyan-400" />
                                            </div>
                                            <div className="flex-1 flex items-center h-full ml-8 gap-[1px]">
                                                {waveformData.map((amp, i) => (
                                                    <div
                                                        key={i}
                                                        className="flex-1 rounded-full bg-cyan-500/50"
                                                        style={{ height: `${Math.max(10, amp * 80)}%` }}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Playhead */}
                                    <div className="absolute top-0 bottom-0 w-px bg-red-500 z-50 pointer-events-none" style={{ left: `${progress}%` }}>
                                        <div className="absolute top-0 -translate-x-1/2 w-3 h-3 bg-red-500 rotate-45 transform -translate-y-1.5 shadow-lg" />
                                        <div className="absolute bottom-0 -translate-x-1/2 w-2 h-2 bg-red-500 rounded-full transform translate-y-1" />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </main>

                {/* 3. INSPECTOR (Right) - Fixed width w-52 (Narrower than 25%) */}
                {showInspector && selectedTake && (
                    <aside className="w-52 bg-[#0b0b11] border-l border-white/5 overflow-y-auto custom-scrollbar flex-shrink-0 text-[10px]">
                        <div className="p-4 space-y-5">
                            <section>
                                <h3 className="text-white/40 uppercase font-bold mb-2 flex items-center gap-2 text-[9px]">
                                    <Info size={10} /> Meta
                                </h3>
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-white/30">File</span>
                                        <span className="text-white font-mono text-[9px] truncate max-w-[120px]">{selectedTake.file_name}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-white/30">Size</span>
                                        <span className="text-white font-mono text-[9px]">{formatFileSize(selectedTake.file_size)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-white/30">Duration</span>
                                        <span className="text-white font-mono text-[9px]">{formatTimecode(selectedTake.duration)}</span>
                                    </div>
                                </div>
                            </section>

                            <div className="h-px bg-white/5" />

                            <section>
                                <h3 className="text-purple-400 uppercase font-bold mb-2 flex items-center gap-2 text-[9px]">
                                    <Brain size={10} /> Intelligence
                                </h3>
                                <div className="p-3 bg-white/5 rounded border border-white/5 space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-white/50">Score</span>
                                        <span className="text-cyan-400 font-bold text-lg">{selectedTake.confidence_score}%</span>
                                    </div>

                                    <div>
                                        <span className="text-white/30 block mb-1">Emotion</span>
                                        <div className="flex gap-2">
                                            <span className="px-2 py-0.5 bg-black/40 rounded border border-white/10 text-white font-bold uppercase text-[9px]">
                                                {selectedTake.ai_metadata.emotion || 'N/A'}
                                            </span>
                                        </div>
                                    </div>

                                    <div>
                                        <span className="text-white/30 block mb-1">Transcript</span>
                                        <p className="text-white/60 italic leading-relaxed text-[9px]">
                                            "{selectedTake.ai_metadata.audio?.transcript || '...'}"
                                        </p>
                                    </div>
                                </div>
                            </section>

                            <section>
                                <h3 className="text-white/40 uppercase font-bold mb-2 flex items-center gap-2 text-[9px]">
                                    <Tag size={10} /> Notes
                                </h3>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="..."
                                    className="w-full h-20 bg-black/20 border border-white/10 rounded p-2 text-white/80 resize-none focus:outline-none focus:border-cyan-500/50"
                                />
                            </section>
                        </div>
                    </aside>
                )}
            </div>
        </div>
    );
};
