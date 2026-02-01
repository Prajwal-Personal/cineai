import React, { useState, useEffect } from 'react';
import { useProjectStore } from '../store/useProjectStore';
import { api } from '../lib/api';
import {
    Activity,
    Search,
    Terminal,
    Cpu,
    Zap,
    Eye,
    Mic2,
    FileText,
    RefreshCw,
    Play,
    CheckCircle2,
    AlertCircle,
    Clock,
    BarChart3,
    BrainCircuit,
    Languages,
    Sparkles
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// Types based on backend Orchestrator
interface Take {
    id: number;
    file_name: string;
    number: number;
    duration?: number;
    ai_metadata?: {
        cv?: {
            duration: number;
            objects: string[];
            reasoning: string;
            video_description?: string;
        };
        audio?: {
            transcript: string;
            reasoning: string;
            quality_score: number;
            audio_description?: string;
            language?: string;
            confidence?: number;
            source?: string;
        };
        nlp?: {
            aligned: boolean;
            similarity: number;
            reasoning: string;
        };
        score_breakdown?: {
            acting: number;
            timing: number;
            technical: number;
            script: number;
        };
        emotion?: string; // Added emotion field
    };
    confidence_score?: number;
}

interface ProcessingStatus {
    status: 'pending' | 'processing' | 'completed' | 'error';
    progress: number;
    stages: Record<string, 'pending' | 'processing' | 'completed' | 'error'>;
    logs: string[];
}

// New types for full AI analysis
interface FullAnalysisResult {
    take_id: number;
    file_name: string;
    video_analysis: {
        metadata: {
            fps: number;
            resolution: string;
            duration: number;
            codec: string;
            total_frames: number;
            file_size_mb: number;
        };
        model_info: {
            name: string;
            version: string;
            inference_device: string;
        };
        detections: Record<string, {
            count: number;
            avg_confidence: number;
            max_confidence: number;
            min_confidence: number;
        }>;
        timeline: Array<{
            timestamp: number;
            frame: number;
            objects: string[];
            object_count: number;
        }>;
        scene_annotations: Array<{
            timestamp: number;
            annotation: string;
            object_count: number;
        }>;
        performance: {
            total_inference_time_ms: number;
            avg_frame_inference_ms: number;
            frames_analyzed: number;
        };
        video_summary?: {
            content_type: string;
            primary_objects: string[];
            total_detections: number;
            unique_classes: number;
        };
    };
    audio_analysis: {
        transcript: string;
        language: string;
        segments: Array<{
            start: number;
            end: number;
            text: string;
            confidence: number;
        }>;
        scene_breaks: number[];
        model_info: {
            name: string;
            version: string;
        };
        duration: number;
        word_count: number;
        confidence: number;
        processing_time_ms: number;
    };
    combined_timeline: Array<{
        timestamp: number;
        type: 'detection' | 'transcript';
        content: string;
        object_count?: number;
        end_time?: number;
        confidence?: number;
    }>;
}

export const AIMonitor = () => {
    const getProcessingStatus = useProjectStore(state => state.getProcessingStatus);
    const [takes, setTakes] = useState<Take[]>([]);
    const [selectedTake, setSelectedTake] = useState<Take | null>(null);
    const [statusData, setStatusData] = useState<ProcessingStatus | null>(null);
    const [isPolling, setIsPolling] = useState(false);
    const [fullAnalysis, setFullAnalysis] = useState<FullAnalysisResult | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [activeTab, setActiveTab] = useState<'detections' | 'transcript' | 'metadata'>('detections');

    // Initial Load & Refresh Logic
    const { search } = window.location;
    const queryParams = new URLSearchParams(search);
    const urlTakeId = queryParams.get('takeId');

    useEffect(() => {
        let isMounted = true;
        const fetchTakes = async () => {
            try {
                const response = await api.media.listTakes();
                if (isMounted) {
                    setTakes(response.data);

                    // Auto-select logic
                    if (response.data.length > 0) {
                        if (!selectedTake) {
                            // 1. Check URL param first
                            if (urlTakeId) {
                                const fromUrl = response.data.find((t: Take) => t.id === parseInt(urlTakeId));
                                if (fromUrl) {
                                    setSelectedTake(fromUrl);
                                    return;
                                }
                            }

                            // 2. Otherwise find first take with metadata or the first take
                            const firstWithMeta = response.data.find((t: Take) => t.ai_metadata && Object.keys(t.ai_metadata).length > 0);
                            setSelectedTake(firstWithMeta || response.data[0]);
                        } else {
                            // Update existing selection
                            const updated = response.data.find((t: Take) => t.id === selectedTake.id);
                            if (updated) setSelectedTake(updated);
                        }
                    }
                }
            } catch (err) {
                console.error("Failed to fetch library", err);
            }
        };

        fetchTakes();
        const interval = setInterval(fetchTakes, 5000); // Poll library every 5s for new uploads/metadata
        return () => { isMounted = false; clearInterval(interval); };
    }, [selectedTake?.id]);

    // Processing Status Polling
    useEffect(() => {
        if (!selectedTake) return;

        let isMounted = true;
        const pollStatus = async () => {
            // If we already have full metadata and status says completed, maybe we can stop polling status?
            // But user wants "Start Processing" removed, so we assume auto-process. 
            // We need to poll to see "Processing" -> "Completed".

            try {
                setIsPolling(true);
                const data = await getProcessingStatus(selectedTake.id);
                if (isMounted && data) {
                    setStatusData(data as ProcessingStatus);
                }
            } catch (err) {
                // Ignore 404 if processing hasn't started yet (it might return null)
            } finally {
                if (isMounted) setIsPolling(false);
            }
        };

        pollStatus();
        const interval = setInterval(pollStatus, 3000); // Poll status every 3s
        return () => { isMounted = false; clearInterval(interval); };
    }, [selectedTake?.id]);

    const handleRetry = async () => {
        if (!selectedTake) return;
        try {
            await api.processing.start(selectedTake.id);
            // Status poll will catch the update
        } catch (e) {
            console.error("Retry failed", e);
        }
    };

    // Run full AI analysis
    const runFullAnalysis = async () => {
        if (!selectedTake) return;
        setIsAnalyzing(true);
        try {
            const response = await api.aiMonitor.analyzeFull(selectedTake.id);
            setFullAnalysis(response.data);
        } catch (e) {
            console.error("Full analysis failed", e);
        } finally {
            setIsAnalyzing(false);
        }
    };

    // Render Logic
    const isProcessing = statusData?.status === 'processing';
    const isError = statusData?.status === 'error';

    // Improved Validation: Counts as complete if status says so, OR we have metadata keys, OR we have a valid score
    const isComplete =
        statusData?.status === 'completed' ||
        (selectedTake?.ai_metadata && Object.keys(selectedTake.ai_metadata).length > 0) ||
        (selectedTake?.confidence_score !== undefined && selectedTake.confidence_score > 0);

    return (
        <div className="h-full flex flex-col p-6 space-y-6 overflow-hidden">
            {/* Header */}
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                        <BrainCircuit className="text-primary animate-pulse-slow" size={32} />
                        Neural Insights
                    </h1>
                    <p className="text-editor-muted text-sm font-medium mt-1">
                        Automated Analysis Cluster • Active
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    {isProcessing && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/20 text-primary rounded-full text-xs font-bold uppercase animate-pulse">
                            <RefreshCw size={12} className="animate-spin" />
                            Processing Live
                        </div>
                    )}
                    {!isProcessing && isComplete && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-success/20 text-success rounded-full text-xs font-bold uppercase">
                            <CheckCircle2 size={12} />
                            Analysis Ready
                        </div>
                    )}
                </div>
            </header>

            <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">
                {/* Sidebar: Takes Library */}
                <div className="col-span-3 glass-panel rounded-xl flex flex-col min-h-0 overflow-hidden border border-white/5 bg-surface/40">
                    <div className="p-4 border-b border-white/10 font-bold text-xs uppercase tracking-widest text-editor-muted flex items-center gap-2">
                        <FileText size={14} /> Media Library
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {takes.length === 0 ? (
                            <div className="p-8 text-center text-editor-muted text-sm italic">
                                Waiting for uploads...
                            </div>
                        ) : (
                            takes.map(take => (
                                <button
                                    key={take.id}
                                    onClick={() => setSelectedTake(take)}
                                    className={cn(
                                        "w-full text-left p-3 rounded-lg transition-all group relative overflow-hidden",
                                        selectedTake?.id === take.id
                                            ? "bg-primary/20 border border-primary/50"
                                            : "hover:bg-white/5 border border-transparent"
                                    )}
                                >
                                    <div className="flex justify-between items-start z-10 relative">
                                        <span className="font-semibold text-sm text-gray-200 truncate pr-2">
                                            {take.file_name}
                                        </span>
                                        {take.confidence_score ? (
                                            <span className={cn(
                                                "text-[10px] font-bold px-1.5 py-0.5 rounded",
                                                take.confidence_score > 80 ? "bg-success/20 text-success" : "bg-warning/20 text-warning"
                                            )}>
                                                {Math.round(take.confidence_score)}%
                                            </span>
                                        ) : (
                                            <span className="text-[10px] text-editor-muted">NEW</span>
                                        )}
                                    </div>
                                    <div className="mt-1 flex items-center gap-2 text-[10px] text-editor-muted">
                                        <span>ID: {take.id}</span>
                                        <span>•</span>
                                        <span>Take {take.number}</span>
                                    </div>
                                    {selectedTake?.id === take.id && (
                                        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent pointer-events-none" />
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="col-span-9 flex flex-col gap-6 min-h-0">
                    {!selectedTake ? (
                        <div className="flex-1 rounded-xl border border-dashed border-white/10 flex items-center justify-center text-editor-muted">
                            Select a video to view insights
                        </div>
                    ) : (
                        <>
                            {/* State 1: Processing / Error */}
                            {!isComplete && (
                                <div className="flex-1 glass-panel rounded-xl flex flex-col items-center justify-center p-12 text-center relative overflow-hidden">
                                    {isError ? (
                                        <div className="max-w-md space-y-4 z-10">
                                            <div className="w-16 h-16 bg-danger/20 rounded-full flex items-center justify-center mx-auto text-danger mb-4">
                                                <AlertCircle size={32} />
                                            </div>
                                            <h3 className="text-xl font-bold text-white">Processing Failed</h3>
                                            <p className="text-editor-muted text-sm">
                                                The Automated Pipeline encountered an error.
                                            </p>
                                            <div className="bg-black/30 p-3 rounded text-xs font-mono text-danger text-left overflow-auto max-h-32">
                                                {statusData?.logs?.slice(-3).map((l, i) => <div key={i}>{l}</div>)}
                                            </div>
                                            <button
                                                onClick={handleRetry}
                                                className="px-6 py-2 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition-colors"
                                            >
                                                Retry Automation
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="max-w-md space-y-6 z-10">
                                            <div className="relative w-24 h-24 mx-auto">
                                                <div className="absolute inset-0 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
                                                <div className="absolute inset-4 rounded-full border-4 border-accent/30 border-t-accent animate-spin-reverse" />
                                                <div className="absolute inset-0 flex items-center justify-center font-bold text-xl text-white">
                                                    {statusData?.progress || 0}%
                                                </div>
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold text-white mb-2">Analyzing Media...</h3>
                                                <p className="text-editor-muted text-sm">
                                                    Running Neural Networks: Vision, Audio, and NLP
                                                </p>
                                            </div>

                                            {/* Live Log Stream */}
                                            <div className="bg-black/40 rounded-lg p-4 h-32 overflow-hidden relative">
                                                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80 pointer-events-none" />
                                                <div className="space-y-1.5 font-mono text-xs text-left">
                                                    {statusData?.logs?.slice(-5).map((log, i) => (
                                                        <div key={i} className={cn(
                                                            "truncate animate-in slide-in-from-bottom-2 fade-in",
                                                            log.includes("Starting") ? "text-primary" : "text-editor-muted"
                                                        )}>
                                                            <span className="opacity-50 mr-2">[{new Date().toLocaleTimeString()}]</span>
                                                            {log}
                                                        </div>
                                                    ))}
                                                    {!statusData?.logs?.length && (
                                                        <div className="text-editor-muted/50 italic">Initializing cluster...</div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Background decoration */}
                                    {!isError && (
                                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent animate-pulse-slow pointer-events-none" />
                                    )}
                                </div>
                            )}

                            {/* State 2: Insights Dashboard (Results) */}
                            {isComplete && selectedTake.ai_metadata && (
                                <div className="flex-1 flex flex-col gap-6 min-h-0 overflow-hidden">
                                    {/* Top Section: Video & Primary Metrics */}
                                    <div className="grid grid-cols-5 gap-6 shrink-0">
                                        {/* Video Player: Smaller footprint */}
                                        <div className="col-span-3 glass-panel p-0 rounded-xl bg-black border border-white/5 overflow-hidden aspect-video relative group flex items-center justify-center shadow-xl">
                                            <video
                                                key={selectedTake.id}
                                                src={`http://localhost:8000/media_files/${selectedTake.file_name}`}
                                                className="w-full h-full object-contain"
                                                controls
                                                preload="metadata"
                                            />
                                            <div className="absolute top-3 left-3 flex gap-2">
                                                <div className="px-2 py-0.5 bg-black/60 backdrop-blur-md rounded-full text-[9px] font-bold text-white uppercase tracking-widest border border-white/10">
                                                    ID: {selectedTake.id} • Take {selectedTake.number}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Primary Score: Now shared row */}
                                        <div className="col-span-2 glass-panel p-6 rounded-xl bg-gradient-to-br from-surface/50 to-primary/5 border border-white/5 flex flex-col justify-center">
                                            <div className="mb-4">
                                                <div className="text-editor-muted text-[10px] font-bold uppercase tracking-widest mb-1">Director's Confidence</div>
                                                <div className="text-5xl font-black text-white">{Math.round(selectedTake.confidence_score || 0)}/100</div>
                                            </div>
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center bg-white/5 p-2 rounded">
                                                    <span className="text-[10px] text-editor-muted uppercase font-bold">Acting Intensity</span>
                                                    <span className="font-bold text-accent">{selectedTake.ai_metadata.score_breakdown?.acting || 0}</span>
                                                </div>
                                                <div className="flex justify-between items-center bg-white/5 p-2 rounded">
                                                    <span className="text-[10px] text-editor-muted uppercase font-bold">Temporal Sync</span>
                                                    <span className="font-bold text-primary">{selectedTake.ai_metadata.score_breakdown?.timing || 0}</span>
                                                </div>
                                                {selectedTake.ai_metadata.audio?.language && (
                                                    <div className="flex justify-between items-center bg-accent/10 p-2 rounded border border-accent/20">
                                                        <span className="text-[10px] text-accent font-bold uppercase">Source Language</span>
                                                        <span className="font-black text-xs text-accent uppercase tracking-widest">{selectedTake.ai_metadata.audio.language}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Scrollable Metrics Grid */}
                                    <div className="flex-1 grid grid-cols-2 gap-6 overflow-y-auto pr-2 pb-6">
                                        {/* Card 1: Narrative Reasoning (Full Width) */}
                                        <div className="col-span-2 glass-panel p-5 rounded-xl border border-white/5 bg-surface/30">
                                            <div className="flex items-center gap-2 mb-3 text-editor-muted font-bold text-[10px] uppercase tracking-widest">
                                                <BrainCircuit size={14} className="text-primary" /> Multi-Modal Reasoning
                                            </div>
                                            <p className="text-sm text-gray-300 leading-relaxed italic">
                                                "{selectedTake.ai_metadata.cv?.reasoning || "Analysis complete."} {selectedTake.ai_metadata.audio?.reasoning}"
                                            </p>
                                        </div>

                                        {/* Card 2: Computer Vision */}
                                        <div className="glass-panel p-5 rounded-xl border border-white/5 bg-surface/20">
                                            <div className="flex items-center gap-2 mb-4 text-primary font-bold text-sm uppercase">
                                                <Eye size={16} /> Visual Analysis
                                            </div>
                                            <div className="space-y-4">
                                                <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                                                    <div className="text-[10px] text-editor-muted mb-1 font-bold uppercase tracking-widest">Objects Detected</div>
                                                    <div className="flex flex-wrap gap-2 mt-2">
                                                        {selectedTake.ai_metadata.cv?.objects?.length ? (
                                                            selectedTake.ai_metadata.cv.objects.map((obj, i) => (
                                                                <span key={i} className="px-2 py-1 bg-primary/10 text-primary rounded text-[10px] font-bold border border-primary/20">
                                                                    {obj}
                                                                </span>
                                                            ))
                                                        ) : (
                                                            <span className="text-xs italic text-editor-muted">None detected</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex justify-between items-center bg-black/10 p-2 rounded">
                                                    <div className="text-[10px] text-editor-muted font-bold uppercase">Shot Duration</div>
                                                    <div className="text-sm font-mono text-white">{selectedTake.ai_metadata.cv?.duration?.toFixed(2)}s</div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Card 3: Audio & NLP */}
                                        <div className="glass-panel p-5 rounded-xl border border-white/5 bg-surface/20">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-2 text-accent font-bold text-sm uppercase">
                                                    <Mic2 size={16} /> Audio & Script
                                                </div>
                                                {selectedTake.ai_metadata.emotion && (
                                                    <div className="px-2 py-1 bg-primary/20 text-primary border border-primary/30 rounded text-xs font-bold uppercase tracking-wider">
                                                        {selectedTake.ai_metadata.emotion}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="space-y-4">
                                                <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <div className="text-[10px] text-editor-muted uppercase font-bold tracking-widest flex items-center gap-1.5">
                                                            <Sparkles size={10} className="text-accent" /> AI Master Transcript
                                                        </div>
                                                        {selectedTake.ai_metadata.audio?.source && (
                                                            <div className={cn(
                                                                "flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border",
                                                                selectedTake.ai_metadata.audio.source === 'ai_whisper'
                                                                    ? "bg-success/10 text-success border-success/20"
                                                                    : "bg-warning/10 text-warning border-warning/20"
                                                            )}>
                                                                {selectedTake.ai_metadata.audio.source === 'ai_whisper' ? 'AI Generated' : 'Pattern Fallback'}
                                                            </div>
                                                        )}
                                                        {selectedTake.ai_metadata.audio?.language && (
                                                            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-accent/10 text-accent rounded text-[10px] font-bold uppercase tracking-wider border border-accent/20">
                                                                <Languages size={10} /> {selectedTake.ai_metadata.audio.language}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <p className="text-sm italic text-gray-200 leading-relaxed font-medium">
                                                        "{selectedTake.ai_metadata.audio?.transcript || "Analyzing vocal patterns..."}"
                                                    </p>
                                                </div>
                                                {selectedTake.ai_metadata.audio?.confidence && (
                                                    <div className="px-1">
                                                        <div className="flex justify-between text-[10px] text-editor-muted mb-1 font-bold uppercase tracking-tight">
                                                            <span>Transcription Clarity</span>
                                                            <span>{Math.round(selectedTake.ai_metadata.audio.confidence * 100)}%</span>
                                                        </div>
                                                        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-accent transition-all duration-1000"
                                                                style={{ width: `${selectedTake.ai_metadata.audio.confidence * 100}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="flex justify-between items-center bg-black/10 p-2 rounded">
                                                    <span className="text-[10px] text-editor-muted uppercase font-bold">Acoustic Quality</span>
                                                    <span className="text-sm font-bold text-success">{selectedTake.ai_metadata.audio?.quality_score || 0}%</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Card 4: Detailed Video Narrative */}
                                        <div className="col-span-1 glass-panel p-5 rounded-xl border border-white/5 bg-gradient-to-br from-surface/40 to-primary/5">
                                            <div className="flex items-center gap-2 mb-3 text-primary font-bold text-sm uppercase">
                                                <Zap size={16} className="text-primary" /> Video Narrative
                                            </div>
                                            <p className="text-xs text-gray-300 italic leading-relaxed">
                                                {selectedTake.ai_metadata.cv?.video_description || "Generating visual tapestry..."}
                                            </p>
                                        </div>

                                        {/* Card 5: Detailed Audio Context */}
                                        <div className="col-span-1 glass-panel p-5 rounded-xl border border-white/5 bg-gradient-to-br from-surface/40 to-accent/5">
                                            <div className="flex items-center gap-2 mb-3 text-accent font-bold text-sm uppercase">
                                                <Activity size={16} className="text-accent" /> Audio Context
                                            </div>
                                            <p className="text-xs text-gray-300 italic leading-relaxed">
                                                {selectedTake.ai_metadata.audio?.audio_description || "Analyzing sonic landscape..."}
                                            </p>
                                        </div>

                                        {/* Full Analysis Section */}
                                        <div className="col-span-2 glass-panel p-5 rounded-xl border border-white/5 bg-surface/30">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase">
                                                    <Cpu size={16} /> Full AI Analysis
                                                </div>
                                                <button
                                                    onClick={runFullAnalysis}
                                                    disabled={isAnalyzing}
                                                    className={cn(
                                                        "px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
                                                        isAnalyzing
                                                            ? "bg-white/10 text-editor-muted cursor-wait"
                                                            : "bg-primary text-black hover:bg-primary/80"
                                                    )}
                                                >
                                                    {isAnalyzing ? (
                                                        <span className="flex items-center gap-2">
                                                            <RefreshCw size={12} className="animate-spin" /> Analyzing...
                                                        </span>
                                                    ) : (
                                                        "Run Full Analysis"
                                                    )}
                                                </button>
                                            </div>

                                            {/* Tab Navigation */}
                                            {fullAnalysis && (
                                                <>
                                                    <div className="flex gap-2 mb-4 border-b border-white/10 pb-2">
                                                        {(['detections', 'transcript', 'metadata'] as const).map((tab) => (
                                                            <button
                                                                key={tab}
                                                                onClick={() => setActiveTab(tab)}
                                                                className={cn(
                                                                    "px-3 py-1 rounded-t text-xs font-bold uppercase tracking-wider transition-all",
                                                                    activeTab === tab
                                                                        ? "bg-primary/20 text-primary border-b-2 border-primary"
                                                                        : "text-editor-muted hover:text-white"
                                                                )}
                                                            >
                                                                {tab}
                                                            </button>
                                                        ))}
                                                    </div>

                                                    {/* Detections Tab */}
                                                    {activeTab === 'detections' && (
                                                        <div className="space-y-3 max-h-64 overflow-y-auto">
                                                            {/* Video Summary */}
                                                            {fullAnalysis.video_analysis.video_summary && (
                                                                <div className="bg-gradient-to-r from-primary/10 to-accent/10 p-3 rounded-lg border border-primary/20 mb-3">
                                                                    <div className="text-[10px] text-primary uppercase font-bold tracking-widest mb-2">
                                                                        Video Summary
                                                                    </div>
                                                                    <div className="flex justify-between items-center mb-2">
                                                                        <span className="text-sm font-semibold text-white">
                                                                            {fullAnalysis.video_analysis.video_summary.content_type}
                                                                        </span>
                                                                        <span className="text-xs text-accent">
                                                                            {fullAnalysis.video_analysis.video_summary.total_detections} detections
                                                                        </span>
                                                                    </div>
                                                                    <div className="text-xs text-editor-muted">
                                                                        Top: {fullAnalysis.video_analysis.video_summary.primary_objects.slice(0, 3).join(' • ')}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            <div className="text-[10px] text-editor-muted uppercase font-bold tracking-widest mb-2">
                                                                Detected Objects ({Object.keys(fullAnalysis.video_analysis.detections).length} classes)
                                                            </div>
                                                            {Object.entries(fullAnalysis.video_analysis.detections).map(([className, data]) => (
                                                                <div key={className} className="bg-black/20 p-3 rounded-lg">
                                                                    <div className="flex justify-between items-center mb-1">
                                                                        <span className="font-semibold text-sm text-white capitalize">{className}</span>
                                                                        <span className="text-xs text-primary font-bold">{data.count}x</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                                            <div
                                                                                className="h-full bg-gradient-to-r from-primary to-accent"
                                                                                style={{ width: `${data.avg_confidence * 100}%` }}
                                                                            />
                                                                        </div>
                                                                        <span className="text-[10px] text-editor-muted">
                                                                            {Math.round(data.avg_confidence * 100)}% conf
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                            <div className="text-[10px] text-editor-muted pt-2 border-t border-white/5">
                                                                Performance: {fullAnalysis.video_analysis.performance.frames_analyzed} frames in {Math.round(fullAnalysis.video_analysis.performance.total_inference_time_ms)}ms
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Transcript Tab */}
                                                    {activeTab === 'transcript' && (
                                                        <div className="space-y-2 max-h-48 overflow-y-auto">
                                                            <div className="text-[10px] text-editor-muted uppercase font-bold tracking-widest mb-2">
                                                                Transcript ({fullAnalysis.audio_analysis.word_count} words, {fullAnalysis.audio_analysis.language.toUpperCase()})
                                                            </div>
                                                            {fullAnalysis.audio_analysis.segments.map((seg, i) => (
                                                                <div key={i} className="bg-black/20 p-2 rounded flex gap-3 hover:bg-black/30 transition-colors cursor-pointer">
                                                                    <div className="text-[10px] text-primary font-mono whitespace-nowrap">
                                                                        {seg.start.toFixed(1)}s
                                                                    </div>
                                                                    <div className="text-xs text-gray-200 flex-1">
                                                                        {seg.text}
                                                                    </div>
                                                                    <div className="text-[10px] text-editor-muted">
                                                                        {Math.round(seg.confidence * 100)}%
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Metadata Tab */}
                                                    {activeTab === 'metadata' && (
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div className="space-y-2">
                                                                <div className="text-[10px] text-editor-muted uppercase font-bold tracking-widest">Video</div>
                                                                <div className="bg-black/20 p-2 rounded text-xs space-y-1">
                                                                    <div className="flex justify-between">
                                                                        <span className="text-editor-muted">Resolution</span>
                                                                        <span className="text-white font-mono">{fullAnalysis.video_analysis.metadata.resolution}</span>
                                                                    </div>
                                                                    <div className="flex justify-between">
                                                                        <span className="text-editor-muted">FPS</span>
                                                                        <span className="text-white font-mono">{fullAnalysis.video_analysis.metadata.fps}</span>
                                                                    </div>
                                                                    <div className="flex justify-between">
                                                                        <span className="text-editor-muted">Duration</span>
                                                                        <span className="text-white font-mono">{fullAnalysis.video_analysis.metadata.duration}s</span>
                                                                    </div>
                                                                    <div className="flex justify-between">
                                                                        <span className="text-editor-muted">Codec</span>
                                                                        <span className="text-white font-mono">{fullAnalysis.video_analysis.metadata.codec}</span>
                                                                    </div>
                                                                    <div className="flex justify-between">
                                                                        <span className="text-editor-muted">Size</span>
                                                                        <span className="text-white font-mono">{fullAnalysis.video_analysis.metadata.file_size_mb} MB</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="space-y-2">
                                                                <div className="text-[10px] text-editor-muted uppercase font-bold tracking-widest">Models</div>
                                                                <div className="bg-black/20 p-2 rounded text-xs space-y-1">
                                                                    <div className="flex justify-between">
                                                                        <span className="text-editor-muted">YOLO</span>
                                                                        <span className="text-primary font-mono">{fullAnalysis.video_analysis.model_info.name} v{fullAnalysis.video_analysis.model_info.version}</span>
                                                                    </div>
                                                                    <div className="flex justify-between">
                                                                        <span className="text-editor-muted">Device</span>
                                                                        <span className="text-white font-mono">{fullAnalysis.video_analysis.model_info.inference_device}</span>
                                                                    </div>
                                                                    <div className="flex justify-between">
                                                                        <span className="text-editor-muted">Whisper</span>
                                                                        <span className="text-accent font-mono">{fullAnalysis.audio_analysis.model_info.name}</span>
                                                                    </div>
                                                                    <div className="flex justify-between">
                                                                        <span className="text-editor-muted">Avg Inference</span>
                                                                        <span className="text-white font-mono">{fullAnalysis.video_analysis.performance.avg_frame_inference_ms}ms/frame</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </>
                                            )}

                                            {!fullAnalysis && !isAnalyzing && (
                                                <div className="text-center text-editor-muted text-sm py-4">
                                                    Click "Run Full Analysis" for comprehensive YOLO detection and Whisper transcription
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
