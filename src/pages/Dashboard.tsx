import React, { useState, useEffect, useMemo } from 'react';
import { useProjectStore } from '../store/useProjectStore';
import { api, API_BASE_URL } from '../lib/api';
import {
    Film,
    Clock,
    Brain,
    AlertCircle,
    CheckCircle2,
    Activity,
    Search,
    BrainCircuit,
    Zap,
    ChevronRight,
    ShieldAlert,
    RefreshCw,
    Mic,
    MicOff,
    Dna,
    Terminal,
    type LucideIcon
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useVoiceSearch } from '../hooks/useVoiceSearch';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';

const cn = (...inputs: any[]) => inputs.filter(Boolean).join(' ');

interface Take {
    id: number;
    file_name: string;
    number: number;
    ai_metadata?: any;
    confidence_score?: number;
}

interface VocalCue {
    take_id: number;
    take_name: string;
    cue: string;
    text: string;
    timestamp: string;
    confidence: number;
}

interface PacingData {
    name: string;
    current: number;
    target: number;
}

export const Dashboard = () => {
    const project = useProjectStore();
    const navigate = useNavigate();
    const [takes, setTakes] = useState<Take[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [cues, setCues] = useState<VocalCue[]>([]);
    const [pacing, setPacing] = useState<PacingData[]>([]);
    const [signature, setSignature] = useState('');

    const { isListening, toggleListening } = useVoiceSearch({
        onResult: (transcript, isFinal) => {
            setSearchQuery(transcript);
            if (isFinal) {
                navigate(`/search?q=${transcript}`);
            }
        }
    });

    useEffect(() => {
        project.fetchProject();
        const fetchData = async () => {
            try {
                const [takesRes, insightsRes] = await Promise.all([
                    api.media.listTakes(),
                    api.intelligence.getProjectInsights()
                ]);
                setTakes(takesRes.data);
                setCues(insightsRes.data.vocal_cues);
                setPacing(insightsRes.data.pacing_comparison);
                setSignature(insightsRes.data.active_signature);
            } catch (err) {
                console.error("Failed to fetch dashboard data", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();

        // Polling for live updates
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, []);

    const problematicTakes = useMemo(() => {
        return takes
            .filter(take => take.confidence_score && take.confidence_score < 70)
            .sort((a, b) => (a.confidence_score || 0) - (b.confidence_score || 0))
            .slice(0, 3);
    }, [takes]);

    return (
        <div className="p-8 space-y-8 max-w-[1600px] mx-auto h-full overflow-y-auto custom-scrollbar bg-editor-bg">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center text-primary shadow-lg shadow-primary/10">
                            <Zap size={24} />
                        </div>
                        <h1 className="text-4xl font-black text-white tracking-tight italic uppercase">Command Center</h1>
                    </div>
                    <div className="flex gap-4 text-xs font-bold text-editor-muted uppercase tracking-widest">
                        <span className="flex items-center gap-1.5"><Film size={14} className="text-primary" /> {project.projectName}</span>
                        <span className="flex items-center gap-1.5"><Clock size={14} /> {project.shootDate}</span>
                    </div>
                </div>

                <div className="glass-panel p-4 rounded-xl flex items-center gap-6 border-white/5 bg-white/[0.02]">
                    <div className="text-right">
                        <div className="text-[10px] uppercase tracking-widest text-editor-muted mb-1 font-black flex items-center justify-end gap-1.5">
                            <RefreshCw size={10} className="animate-spin text-primary" /> Neural Sync Status
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="w-32 h-1.5 bg-editor-track rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${project.processingProgress}%` }}
                                    className="h-full bg-primary shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                                />
                            </div>
                            <span className="text-lg font-black font-mono text-primary">{project.processingProgress}%</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Quick Search Shortcut */}
            <div className="relative group">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                    <Search className="text-editor-muted group-focus-within:text-primary transition-colors" size={20} />
                </div>
                <input
                    type="text"
                    placeholder={isListening ? 'Listening...' : 'Search footage by intent... (e.g., "joyful outdoor scene")'}
                    className="w-full bg-surface-dark border border-white/5 rounded-2xl py-5 pl-12 pr-48 text-lg font-medium text-white placeholder-editor-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all shadow-2xl"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && navigate(`/search?q=${searchQuery}`)}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <button
                        onClick={toggleListening}
                        className={cn(
                            "p-3 rounded-xl transition-all",
                            isListening ? "bg-red-500/20 text-red-500 animate-pulse" : "bg-white/5 text-editor-muted hover:text-white"
                        )}
                    >
                        {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                    </button>
                    <button
                        onClick={() => navigate(`/search?q=${searchQuery}`)}
                        className="bg-primary text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-primary/80 transition-all shadow-lg shadow-primary/20 active:scale-95"
                    >
                        Search
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard icon={Film} label="Footage Pool" value={takes.length.toString()} subValue="Active Takes Downloaded" color="text-blue-400" />
                <StatCard icon={Brain} label="AI Confidence" value={`${project.aiConfidenceHealth || 88}%`} subValue="Average Neural Score" color="text-purple-400" />
                <StatCard icon={Activity} label="Live Anomalies" value={Object.values(project.issues).reduce((a, b: number) => a + b, 0).toString()} subValue="Detected Production Faults" color="text-amber-400" />
                <StatCard icon={ShieldAlert} label="Critical Risks" value={problematicTakes.length.toString()} subValue="Immediate Reshoot Required" color="text-red-400" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Visual Risk Gallery */}
                <div className="lg:col-span-8 space-y-6">
                    <div className="flex justify-between items-end">
                        <div className="flex items-center gap-3">
                            <ShieldAlert className="text-red-500" />
                            <h2 className="text-xl font-black text-white uppercase tracking-tight italic">Priority Reshoot Risks</h2>
                        </div>
                        <button onClick={() => navigate('/risk')} className="text-[10px] font-black uppercase text-editor-muted hover:text-white transition-colors flex items-center gap-1">
                            Complete Assessment <ChevronRight size={14} />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {problematicTakes.length > 0 ? problematicTakes.map((take) => (
                            <div key={take.id} onClick={() => navigate(`/monitor?takeId=${take.id}`)} className="group relative bg-surface-dark rounded-2xl overflow-hidden border border-white/5 cursor-pointer hover:border-red-500/30 transition-all aspect-[4/5] flex flex-col">
                                <div className="absolute top-2 right-2 z-10">
                                    <div className="px-2 py-0.5 bg-red-600 text-white text-[9px] font-black rounded-full shadow-lg">{Math.round(take.confidence_score!)}%</div>
                                </div>
                                <div className="flex-1 bg-black overflow-hidden relative">
                                    <video
                                        src={`${API_BASE_URL.replace('/api/v1', '')}/media_files/${take.file_name}`}
                                        className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity"
                                        muted
                                        onMouseEnter={(e) => e.currentTarget.play()}
                                        onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
                                </div>
                                <div className="p-4 space-y-1">
                                    <div className="text-[8px] font-black text-red-500 uppercase">Warning: Technical Fault</div>
                                    <div className="text-xs font-bold text-white truncate">{take.file_name}</div>
                                </div>
                            </div>
                        )) : (
                            <div className="col-span-3 py-16 border-2 border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center text-editor-muted gap-3">
                                <CheckCircle2 size={32} className="text-success/40" />
                                <span className="text-sm font-bold opacity-50 uppercase tracking-widest">No Critical Risks</span>
                            </div>
                        )}
                    </div>

                    {/* Editor DNA Pacing */}
                    <div className="glass-panel p-6 rounded-2xl border-white/5 bg-surface/30 space-y-6">
                        <div className="flex justify-between items-center">
                            <h3 className="text-sm font-black text-white uppercase italic tracking-widest flex items-center gap-2">
                                <Dna className="text-primary" size={18} /> Pacing DNA: {signature || 'The Dark Knight'}
                            </h3>
                            <span className="text-[9px] text-editor-muted uppercase font-bold tracking-widest">Style Match Active</span>
                        </div>
                        <div className="h-40">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={pacing}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                    <XAxis dataKey="name" stroke="#555" fontSize={9} />
                                    <YAxis stroke="#555" fontSize={9} />
                                    <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #333', fontSize: '10px' }} />
                                    <Line type="monotone" name="Current" dataKey="current" stroke="#3b82f6" strokeWidth={3} dot={{ r: 3, fill: '#3b82f6' }} />
                                    <Line type="monotone" name="Target" dataKey="target" stroke="#555" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Vertical Monitoring Sidebar */}
                <div className="lg:col-span-4 space-y-8">
                    {/* Live Vocal Cues */}
                    <div className="glass-panel p-6 rounded-2xl border-white/5 bg-surface/30 h-[450px] flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-sm font-black text-white uppercase italic tracking-widest flex items-center gap-2">
                                <Mic className="text-accent" size={18} /> Live Vocal Cues
                            </h3>
                            <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
                                <span className="text-[8px] text-accent font-black uppercase">Sync</span>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2">
                            {cues.map((cue, idx) => (
                                <div key={idx} className="p-3 bg-black/40 rounded-xl border-l-2 border-accent/50 space-y-1 group hover:bg-black/60 transition-colors">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-black text-white italic uppercase">"{cue.cue}"</span>
                                        <span className="text-[8px] font-mono text-editor-muted">{cue.timestamp}</span>
                                    </div>
                                    <p className="text-[9px] text-editor-muted leading-tight">{cue.text}</p>
                                    <div className="text-[7px] font-bold text-accent font-mono uppercase tracking-tighter opacity-50">Take {cue.take_id} • {Math.round(cue.confidence)}% Match</div>
                                </div>
                            ))}
                            {cues.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-editor-muted opacity-30 gap-2">
                                    <Mic size={24} />
                                    <span className="text-[10px] uppercase font-black">Waiting for Cues</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* AI Monitor Telemetry */}
                    <div className="glass-panel p-6 rounded-2xl border-white/5 bg-surface/30 flex-1 flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-sm font-black text-white uppercase italic tracking-widest flex items-center gap-2">
                                <Terminal className="text-primary" size={18} /> Neural Telemetry
                            </h3>
                            <button onClick={() => navigate('/monitor')} className="text-[8px] font-black text-editor-muted hover:text-white uppercase tracking-widest">Details</button>
                        </div>
                        <div className="flex-1 bg-black/50 rounded-xl p-4 font-mono text-[9px] overflow-y-auto custom-scrollbar space-y-2">
                            <AnimatePresence initial={false}>
                                {project.logs && project.logs.length > 0 ? project.logs.slice(-10).map((log, i) => (
                                    <motion.div
                                        key={`${i}-${log}`}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="text-primary/80 border-l border-primary/20 pl-2 leading-relaxed"
                                    >
                                        <span className="text-primary/40 mr-2">[{new Date().toLocaleTimeString([], { hour12: false })}]</span>
                                        {log}
                                    </motion.div>
                                )) : (
                                    <div className="text-editor-muted italic opacity-30 py-8 text-center uppercase tracking-widest">Idle Monitoring Mode</div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const StatCard = ({ icon: Icon, label, value, subValue, color }: { icon: LucideIcon, label: string, value: string, subValue: string, color: string }) => (
    <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group border-white/5 bg-surface/40 hover:bg-surface/60 transition-colors shadow-xl">
        <div className={cn("absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500", color)}>
            <Icon size={56} />
        </div>
        <div className="relative z-10 flex flex-col h-full justify-between">
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <div className={cn("p-1.5 rounded-lg bg-white/5", color)}>
                        <Icon size={14} />
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-editor-muted">{label}</span>
                </div>
                <div className="text-3xl font-black text-white mb-2 font-mono tracking-tighter">{value}</div>
            </div>
            <div className="text-[9px] text-editor-muted font-bold italic border-t border-white/5 pt-3 mt-4">{subValue}</div>
        </div>
    </div>
);
