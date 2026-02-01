import React, { useState, useEffect, useCallback } from 'react';
import {
    Mic,
    Zap,
    BrainCircuit,
    Activity,
    Search,
    Play,
    Clock,
    Smile,
    ChevronRight,
    Sparkles,
    CheckCircle2,
    AlertTriangle,
    X,
    Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../lib/api';
import { useVoiceSearch } from '../hooks/useVoiceSearch';

const cn = (...inputs: any[]) => inputs.filter(Boolean).join(' ');

interface IntentData {
    emotions: string[];
    temporal_cues: string[];
    actions: string[];
}

export const NeuralVoiceSearch = () => {
    const [query, setQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [results, setResults] = useState<any[]>([]);
    const [status, setStatus] = useState<'idle' | 'listening' | 'analyzing' | 'done'>('idle');
    const [intent, setIntent] = useState<IntentData | null>(null);
    const [showManualInput, setShowManualInput] = useState(false);

    const onSpeechResult = useCallback((text: string) => {
        setQuery(text);
    }, []);

    const { isListening, error, startListening, stopListening } = useVoiceSearch({
        onResult: onSpeechResult
    });

    // Handle state transitions
    useEffect(() => {
        if (isListening) {
            setStatus('listening');
            setResults([]);
            setIntent(null);
            setShowManualInput(false);
        } else if (status === 'listening') {
            // Stopped listening
            if (query.length > 5 && !error) {
                handleNeuralSearch(query);
            } else {
                setStatus('idle');
            }
        }
    }, [isListening, query, status, error]);

    const handleNeuralSearch = async (searchText: string) => {
        if (!searchText.trim()) return;
        setStatus('analyzing');
        setIsSearching(true);
        try {
            const response = await api.search.intent({ query: searchText, top_k: 12 });

            // Extract intent...
            if (response.data.results.length > 0) {
                const firstResult = response.data.results[0];
                setIntent({
                    emotions: firstResult.reasoning.query_intent.emotions || [],
                    temporal_cues: firstResult.reasoning.query_intent.temporal_cues || [],
                    actions: firstResult.reasoning.query_intent.actions || []
                });
            }

            setResults(response.data.results);
            setStatus('done');
        } catch (err) {
            console.error("Neural search failed", err);
            setStatus('idle');
        } finally {
            setIsSearching(false);
        }
    };

    const resetSearch = () => {
        setResults([]);
        setQuery('');
        setIntent(null);
        setStatus('idle');
        setShowManualInput(false);
    };

    return (
        <div className="h-full flex flex-col bg-editor-bg overflow-hidden relative font-sans">
            {/* Ambient Background Glows */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-gradient-to-b from-primary/10 to-transparent blur-3xl opacity-30 select-none pointer-events-none" />

            {/* Main Interactive Stage */}
            <main className="flex-1 flex flex-col items-center justify-center relative z-10 p-12">
                <AnimatePresence mode="wait">
                    {status === 'idle' || status === 'listening' ? (
                        <motion.div
                            key="input-stage"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.1 }}
                            className="flex flex-col items-center gap-8 text-center"
                        >
                            <div className="space-y-4">
                                <h1 className="text-6xl font-black text-white italic uppercase tracking-tighter leading-none">
                                    Neural <span className="text-primary">Discovery</span>
                                </h1>
                                <p className="text-editor-muted text-xs font-black uppercase tracking-[0.5em] font-mono opacity-60">
                                    VOICE-ACTIVATED EDITORIAL INTENT ENGINE
                                </p>
                            </div>

                            {/* Voice Interface */}
                            {!showManualInput ? (
                                <div className="flex flex-col items-center gap-8">
                                    <div className="relative group">
                                        <div className={cn(
                                            "absolute -inset-8 bg-primary/20 rounded-full blur-3xl transition-all duration-700",
                                            status === 'listening' ? "scale-150 opacity-60" : "scale-100 opacity-20 group-hover:opacity-40"
                                        )} />

                                        <button
                                            onClick={status === 'listening' ? stopListening : startListening}
                                            className={cn(
                                                "relative w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500",
                                                status === 'listening' ? "bg-primary shadow-[0_0_80px_rgba(59,130,246,0.6)]" : "bg-white/5 border border-white/10 hover:bg-white/10"
                                            )}
                                        >
                                            <AnimatePresence mode="wait">
                                                {status === 'listening' ? (
                                                    <motion.div
                                                        key="listening-icon"
                                                        initial={{ scale: 0 }}
                                                        animate={{ scale: 1 }}
                                                        className="flex items-center gap-1"
                                                    >
                                                        {[1, 2, 3, 2, 1].map((h, i) => (
                                                            <motion.div
                                                                key={i}
                                                                animate={{ height: [8, 24, 8] }}
                                                                transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.1 }}
                                                                className="w-1.5 bg-white rounded-full"
                                                            />
                                                        ))}
                                                    </motion.div>
                                                ) : (
                                                    <motion.div key="mic-icon" initial={{ scale: 0 }} animate={{ scale: 1 }}>
                                                        <Mic size={40} className="text-white" />
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </button>
                                    </div>

                                    <div className="max-w-md space-y-4">
                                        {error ? (
                                            <div className="bg-danger/10 border border-danger/20 rounded-xl p-4 flex flex-col items-center gap-2">
                                                <AlertTriangle size={20} className="text-danger" />
                                                <span className="text-xs font-bold text-danger uppercase tracking-widest">{error}</span>
                                                <button
                                                    onClick={() => setShowManualInput(true)}
                                                    className="mt-2 text-[10px] font-black underline uppercase tracking-widest text-editor-text"
                                                >
                                                    Use Manual Discovery instead
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <p className="text-sm font-medium text-white/50 leading-relaxed italic">
                                                    {query ? `"${query}"` : "Try saying: 'Find me an awkward silence with intense tension'"}
                                                </p>
                                                <button
                                                    onClick={() => setShowManualInput(true)}
                                                    className="text-[10px] font-black opacity-40 hover:opacity-100 transition-opacity uppercase tracking-[0.2em] text-white"
                                                >
                                                    or Type your Intent
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="w-full max-w-xl flex flex-col items-center gap-6"
                                >
                                    <div className="w-full relative">
                                        <textarea
                                            autoFocus
                                            value={query}
                                            onChange={(e) => setQuery(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleNeuralSearch(query))}
                                            placeholder="Describe the moment you're looking for..."
                                            className="w-full bg-white/5 border border-white/10 rounded-3xl p-8 pt-10 text-xl font-bold text-white placeholder:text-white/20 focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none h-40"
                                        />
                                        <div className="absolute top-4 left-6 flex items-center gap-2">
                                            <BrainCircuit size={12} className="text-primary" />
                                            <span className="text-[10px] font-black text-primary uppercase tracking-widest">Manual Neural Probe</span>
                                        </div>
                                    </div>

                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => handleNeuralSearch(query)}
                                            className="btn-primary px-12 py-3 rounded-full flex items-center gap-3"
                                        >
                                            <Search size={20} />
                                            Probe Timeline
                                        </button>
                                        <button
                                            onClick={() => setShowManualInput(false)}
                                            className="px-8 py-3 bg-white/5 rounded-full text-white text-sm font-bold hover:bg-white/10 transition-all"
                                        >
                                            Return to Voice
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            <div className="flex flex-wrap justify-center gap-2 opacity-40">
                                {['Angry Interview', 'Tense Standoff', 'Joyous Greeting'].map(tag => (
                                    <button
                                        key={tag}
                                        onClick={() => { setQuery(tag); handleNeuralSearch(tag); }}
                                        className="px-3 py-1 bg-white/5 rounded-full text-[10px] font-black uppercase tracking-widest text-white border border-white/5 hover:border-primary/50 transition-colors"
                                    >
                                        #{tag}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    ) : status === 'analyzing' ? (
                        <motion.div
                            key="analyzing-stage"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex flex-col items-center gap-8"
                        >
                            <BrainCircuit className="w-16 h-16 text-primary animate-pulse" />
                            <div className="space-y-4 text-center">
                                <h2 className="text-2xl font-black text-white italic uppercase tracking-widest">Applying LLM Filter</h2>
                                <div className="flex gap-4">
                                    <LoadingIndicator label="TRANSCRIPTION" active />
                                    <LoadingIndicator label="INTENT MAPPING" active />
                                    <LoadingIndicator label="VECTOR_SEARCH" active />
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="results-stage"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="w-full h-full flex flex-col gap-8"
                        >
                            {/* Filter Summary Header */}
                            <div className="flex items-center justify-between p-8 bg-white/5 rounded-3xl border border-white/5 backdrop-blur-xl">
                                <div className="flex items-center gap-8">
                                    <div>
                                        <div className="text-[10px] font-black text-editor-muted uppercase tracking-[0.3em] mb-2">Original Intent</div>
                                        <div className="text-lg font-bold text-white italic">"{query}"</div>
                                    </div>
                                    <div className="w-[1px] h-12 bg-white/10" />
                                    <div className="flex gap-4">
                                        <IntentBadge icon={Smile} label="Emotions" values={intent?.emotions || []} color="text-accent" />
                                        <IntentBadge icon={Clock} label="Temporal" values={intent?.temporal_cues || []} color="text-primary" />
                                    </div>
                                </div>
                                <button onClick={resetSearch} className="p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-all text-white">
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Results Grid */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar pr-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-12">
                                    {results.map((result: any, idx: number) => (
                                        <ResultCard key={idx} result={result} />
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* AI HUD Footer */}
            <footer className="p-6 border-t border-white/5 bg-black/40 backdrop-blur-md flex justify-between items-center relative z-20">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <Activity size={14} className="text-primary" />
                        <span className="text-[9px] font-black text-white uppercase tracking-widest">Core Status: READY</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Zap size={14} className="text-accent" />
                        <span className="text-[9px] font-black text-white uppercase tracking-widest">Neural Latency: 42ms</span>
                    </div>
                </div>
                <div className="text-[9px] font-mono text-editor-muted uppercase tracking-widest opacity-40">
                    SmartCut AI Intent Filter v4.0.2
                </div>
            </footer>
        </div>
    );
};

const LoadingIndicator = ({ label, active }: { label: string, active: boolean }) => (
    <div className="flex flex-col items-center gap-2">
        <div className={cn(
            "w-8 h-[2px] rounded-full transition-all duration-1000",
            active ? "bg-primary shadow-[0_0_10px_rgba(59,130,246,0.5)]" : "bg-white/10"
        )} />
        <span className="text-[8px] font-black text-editor-muted uppercase tracking-widest font-mono">{label}</span>
    </div>
);

const IntentBadge = ({ icon: Icon, label, values, color }: { icon: any, label: string, values: string[], color: string }) => (
    <div>
        <div className="text-[8px] font-black text-editor-muted uppercase tracking-[0.2em] mb-1 flex items-center gap-1">
            <Icon size={10} /> {label}
        </div>
        <div className="flex flex-wrap gap-1">
            {values.length > 0 ? values.map((v: string) => (
                <span key={v} className={cn("px-2 py-0.5 bg-white/5 rounded-md text-[9px] font-black uppercase tracking-widest", color)}>
                    {v}
                </span>
            )) : <span className="text-[9px] text-editor-muted opacity-30 italic">None Detected</span>}
        </div>
    </div>
);

const ResultCard = ({ result }: { result: any }) => (
    <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="group bg-surface/40 rounded-3xl border border-white/5 overflow-hidden hover:border-primary/40 hover:bg-white/5 transition-all duration-500"
    >
        <div className="aspect-video relative overflow-hidden bg-black">
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-transparent transition-colors z-10">
                <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all duration-500">
                    <Play size={20} className="text-white fill-current" />
                </div>
            </div>

            {/* Metadata Overlay */}
            <div className="absolute top-4 left-4 z-20 flex gap-2">
                <div className="px-2 py-1 bg-black/60 backdrop-blur-md rounded-lg flex items-center gap-2">
                    <Sparkles size={10} className="text-primary" />
                    <span className="text-[9px] font-black text-primary italic uppercase tracking-widest">{result.confidence}% Match</span>
                </div>
            </div>
        </div>

        <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-editor-muted uppercase tracking-widest">{result.file_name}</span>
                <span className="text-[10px] font-mono text-white/40">{result.start_time.toFixed(1)}s</span>
            </div>

            <p className="text-xs text-editor-text font-medium leading-relaxed line-clamp-2 italic">
                "{result.transcript_snippet}"
            </p>

            <div className="pt-4 border-t border-white/5 flex flex-wrap gap-2">
                {result.reasoning.matched_because.slice(0, 2).map((reason: string, i: number) => (
                    <div key={i} className="flex items-center gap-1.5 text-[9px] font-bold text-editor-muted uppercase group-hover:text-primary transition-colors">
                        <CheckCircle2 size={10} />
                        {reason.split(':')[0]}
                    </div>
                ))}
            </div>
        </div>
    </motion.div>
);
