import React, { useState, useEffect, useMemo } from 'react';
import {
    AlertTriangle,
    VideoOff,
    MicOff,
    FileWarning,
    ChevronRight,
    Play,
    Info,
    TrendingDown,
    Activity,
    ShieldAlert
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { api, API_BASE_URL } from '../lib/api';

interface Take {
    id: number;
    file_name: string;
    number: number;
    ai_metadata?: any;
    ai_reasoning?: any;
    confidence_score?: number;
}

const cn = (...inputs: any[]) => inputs.filter(Boolean).join(' ');

export const ReshootRisk: React.FC = () => {
    const navigate = useNavigate();
    const [takes, setTakes] = useState<Take[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchTakes = async () => {
            try {
                const response = await api.media.listTakes();
                setTakes(response.data);
            } catch (err) {
                console.error("Failed to fetch takes", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchTakes();
    }, []);

    const problematicTakes = useMemo(() => {
        return takes.filter(take => {
            const meta = take.ai_metadata || {};
            const audio_score = meta.audio?.quality_score || 100;
            const tech_score = meta.cv?.technical_score || 100;
            const nlp_score = (meta.nlp?.similarity || 1) * 100;

            return audio_score < 75 || tech_score < 70 || nlp_score < 70 || take.confidence_score! < 70;
        });
    }, [takes]);

    const aggregateStats = useMemo(() => {
        if (problematicTakes.length === 0) return { risk: 'Low', score: 100 };
        const avgScore = problematicTakes.reduce((acc, t) => acc + (t.confidence_score || 0), 0) / problematicTakes.length;
        return {
            risk: problematicTakes.length > 5 ? 'High' : problematicTakes.length > 2 ? 'Medium' : 'Low',
            score: Math.round(avgScore)
        };
    }, [problematicTakes]);

    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center bg-editor-darker">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-red-500/20 border-t-red-500 rounded-full animate-spin" />
                    <span className="text-editor-muted font-mono text-xs uppercase tracking-widest">Scanning Production Faults...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full bg-editor-darker overflow-y-auto custom-scrollbar">
            <div className="p-8 space-y-12 max-w-7xl mx-auto">
                <header className="flex justify-between items-start">
                    <div>
                        <h1 className="text-4xl font-black text-white mb-2 flex items-center gap-3 tracking-tight">
                            <ShieldAlert className="text-red-500" size={36} />
                            Reshoot Risk Assessment
                        </h1>
                        <p className="text-editor-muted text-lg">
                            Diagnostic analysis of technical and performance failures detected in recent takes
                        </p>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="text-right">
                            <div className="text-[10px] font-black uppercase tracking-widest text-editor-muted mb-1">Fleet Health</div>
                            <div className={cn(
                                "text-2xl font-black px-4 py-1 rounded-lg border",
                                aggregateStats.risk === 'High' ? "bg-red-500/10 text-red-500 border-red-500/20" :
                                    aggregateStats.risk === 'Medium' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                                        "bg-green-500/10 text-green-500 border-green-500/20"
                            )}>
                                {aggregateStats.risk} Risk
                            </div>
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <InsightCard
                        icon={TrendingDown}
                        label="Avg Incident Score"
                        value={`${aggregateStats.score}%`}
                        color="text-red-400"
                    />
                    <InsightCard
                        icon={Activity}
                        label="Critical Faults"
                        value={problematicTakes.length.toString()}
                        color="text-amber-400"
                    />
                    <InsightCard
                        icon={TrendingDown}
                        label="Reshoot Probability"
                        value={`${problematicTakes.length > 5 ? '88%' : problematicTakes.length > 0 ? '42%' : '0%'}`}
                        color="text-purple-400"
                    />
                </div>

                <div className="space-y-8">
                    <div className="flex items-center gap-4">
                        <h2 className="text-xl font-bold text-white/90 uppercase tracking-widest">Diagnostic Gallery</h2>
                        <div className="h-[1px] flex-1 bg-gradient-to-r from-red-500/20 to-transparent" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {problematicTakes.map((take) => (
                            <RiskCard key={take.id} take={take} onClick={() => navigate(`/monitor?takeId=${take.id}`)} />
                        ))}
                    </div>

                    {problematicTakes.length === 0 && (
                        <div className="py-24 border border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center bg-white/[0.01]">
                            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4 text-green-500">
                                <ShieldAlert size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Zero Production Risks Detected</h3>
                            <p className="text-editor-muted text-sm max-w-md text-center">
                                All recent takes meet the minimum quality threshold for technical and narrative fidelity.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const InsightCard = ({ icon: Icon, label, value, color }: { icon: any, label: string, value: string, color: string }) => (
    <div className="bg-editor-dark/40 backdrop-blur-md border border-white/5 p-6 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3 mb-4">
            <div className={cn("p-2 rounded-lg bg-white/5", color)}>
                <Icon size={18} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-editor-muted">{label}</span>
        </div>
        <div className={cn("text-3xl font-black font-mono", color)}>{value}</div>
    </div>
);

const RiskCard = ({ take, onClick }: { take: Take, onClick: () => void }) => {
    const videoBase = API_BASE_URL.replace('/api/v1', '');
    const reasoning = take.ai_reasoning || {};
    const pillars = reasoning.pillars || {};
    const notes = reasoning.director_notes || [];

    const displayPillars = [
        { key: 'performance', label: 'Perf' },
        { key: 'story_clarity', label: 'Story' },
        { key: 'coverage', label: 'Cover' },
        { key: 'technical', label: 'Tech' },
        { key: 'tone_rhythm', label: 'Tone' },
        { key: 'instinct', label: 'Inst' },
        { key: 'edit_imagination', label: 'Edit' }
    ];

    return (
        <motion.div
            whileHover={{ y: -5 }}
            className="group bg-editor-dark/80 backdrop-blur-2xl border border-white/5 rounded-2xl overflow-hidden hover:border-red-500/40 transition-all cursor-pointer shadow-2xl flex flex-col"
            onClick={onClick}
        >
            <div className="aspect-video bg-black relative overflow-hidden">
                <video
                    src={`${videoBase}/media_files/${take.file_name}`}
                    className="w-full h-full object-cover opacity-60 grayscale group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700"
                    onMouseEnter={(e) => e.currentTarget.play().catch(() => { })}
                    onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                    muted
                    playsInline
                />
                <div className="absolute top-3 right-3">
                    <div className="px-3 py-1 bg-red-600 text-white text-[10px] font-black uppercase tracking-tighter rounded-full shadow-lg flex items-center gap-1">
                        <AlertTriangle size={10} /> High Risk
                    </div>
                </div>
                <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black to-transparent">
                    <div className="text-[10px] font-mono text-white/50 uppercase tracking-widest">Take {take.number} #ID{take.id}</div>
                    <h4 className="text-sm font-bold text-white truncate">{take.file_name}</h4>
                </div>
            </div>

            <div className="p-6 space-y-6 flex-1 flex flex-col">
                <div className="grid grid-cols-7 gap-1 border-b border-white/5 pb-4 overflow-x-auto custom-scrollbar-mini">
                    {displayPillars.map(p => (
                        <PillarMetric key={p.key} label={p.label} value={pillars[p.key] || 0} />
                    ))}
                </div>

                <div className="space-y-4 flex-1">
                    <div className="flex items-center gap-2">
                        <ShieldAlert size={14} className="text-red-400" />
                        <span className="text-[10px] font-black text-red-100 uppercase tracking-widest">Why Retake?</span>
                    </div>
                    <div className="space-y-3 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                        {notes.length > 0 ? notes.map((note: string, idx: number) => (
                            <div key={idx} className="flex gap-3">
                                <div className="w-1 h-auto bg-red-500/20 rounded-full" />
                                <p className="text-[11px] text-gray-300 leading-relaxed font-medium">
                                    {note}
                                </p>
                            </div>
                        )) : (
                            <p className="text-[11px] text-gray-400 italic pl-4">No critical narrative failures detected in neural scan.</p>
                        )}
                    </div>
                </div>

                <div className="flex items-center justify-between pt-4 mt-auto border-t border-white/5">
                    <div className="flex flex-col">
                        <span className="text-[8px] font-black text-editor-muted uppercase tracking-tighter mb-1">Director's Rating</span>
                        <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-black text-white">{typeof take.confidence_score === 'number' ? take.confidence_score.toFixed(1) : '0.0'}</span>
                            <span className="text-xs font-bold text-editor-muted">%</span>
                        </div>
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-all text-[10px] font-black text-white uppercase tracking-widest group-hover:bg-primary/20 group-hover:text-primary">
                        Review <ChevronRight size={14} />
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

const PillarMetric = ({ label, value }: { label: string, value: number }) => (
    <div className="flex flex-col items-center min-w-[40px]">
        <span className="text-[7px] font-bold text-editor-muted uppercase mb-1">{label}</span>
        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mb-1 mx-1">
            <div
                className={cn("h-full transition-all duration-1000", value > 80 ? "bg-emerald-500" : value > 60 ? "bg-amber-500" : "bg-red-500")}
                style={{ width: `${value}%` }}
            />
        </div>
        <span className={cn("text-[9px] font-mono font-bold", value > 80 ? "text-emerald-500" : value > 60 ? "text-amber-500" : "text-red-500")}>
            {Math.round(value)}
        </span>
    </div>
);

export default ReshootRisk;
