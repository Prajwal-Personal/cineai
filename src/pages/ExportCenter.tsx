import React, { useState } from 'react';
import { api } from '../lib/api';
import {
    Download,
    FileCode,
    Settings,
    CheckCircle2,
    FileJson,
    FileText,
    Share2,
    Lock,
    ChevronRight,
    Zap,
    BrainCircuit,
    Layers,
    Activity,
    type LucideIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const cn = (...inputs: any[]) => inputs.filter(Boolean).join(' ');

interface ExportFormat {
    id: string;
    name: string;
    icon: LucideIcon;
    ext: string;
    desc: string;
    recommended: boolean;
}

const formats: ExportFormat[] = [
    { id: 'xml', name: 'Final Cut Pro XML', icon: FileCode, ext: '.xml', desc: 'Standard XML for FCP7, FCPX and Premiere Pro exchange.', recommended: true },
    { id: 'edl', name: 'CMX 3600 EDL', icon: FileText, ext: '.edl', desc: 'Legacy edit decision list for high-end finishing.', recommended: false },
    { id: 'aaf', name: 'Avid AAF', icon: FileJson, ext: '.aaf', desc: 'Exchange format for Media Composer and ProTools audio.', recommended: false },
    { id: 'otio', name: 'OpenTimelineIO', icon: Settings, ext: '.otio', desc: 'Modern open-source interchange for VFX pipelines.', recommended: true },
];

export const ExportCenter = () => {
    const [selectedFormat, setSelectedFormat] = useState('xml');
    const [includeAI, setIncludeAI] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const handleExport = async () => {
        setExporting(true);
        try {
            const response = await api.export.download(selectedFormat);

            // Handle real file download
            const blob = new Blob([response.data], { type: response.headers['content-type'] });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;

            // Extract filename from content-disposition if available
            const contentDisposition = response.headers['content-disposition'];
            let fileName = `SmartCut_Export.${selectedFormat}`;
            if (contentDisposition) {
                const fileNameMatch = contentDisposition.match(/filename=(.+)/);
                if (fileNameMatch) fileName = fileNameMatch[1];
            }

            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 5000);
        } catch (err) {
            console.error("Export failed", err);
            // Fallback for simple error notification
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-editor-bg overflow-hidden select-none">
            {/* Premium Header */}
            <header className="p-8 border-b border-white/5 bg-surface/50 backdrop-blur-md flex justify-between items-center relative z-20">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                            <Download size={18} />
                        </div>
                        <h1 className="text-2xl font-black text-white italic uppercase tracking-tighter">Export Intelligence</h1>
                    </div>
                    <p className="text-[10px] font-bold text-editor-muted uppercase tracking-[0.3em] font-mono">
                        POST-PRODUCTION INTERCHANGE ENGINE V2.0
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="px-4 py-2 bg-success/10 border border-success/20 rounded-full flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                        <span className="text-[9px] font-black text-success uppercase tracking-widest">Compiler Ready</span>
                    </div>
                </div>
            </header>

            <div className="flex-1 flex min-h-0 overflow-hidden">
                <main className="flex-1 overflow-y-auto custom-scrollbar p-12">
                    <div className="max-w-4xl mx-auto space-y-12">
                        <section className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xs font-black text-white uppercase tracking-[0.3em] italic">Select Target Architecture</h2>
                                <span className="text-[10px] text-editor-muted font-mono">AVAILABLE_FORMATS: {formats.length}</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {formats.map((format) => (
                                    <FormatCard
                                        key={format.id}
                                        format={format}
                                        isActive={selectedFormat === format.id}
                                        onClick={() => setSelectedFormat(format.id)}
                                    />
                                ))}
                            </div>
                        </section>

                        <section className="space-y-6">
                            <h2 className="text-xs font-black text-white uppercase tracking-[0.3em] italic">Interchange Configuration</h2>
                            <div className="grid grid-cols-1 gap-4">
                                <ToggleSetting
                                    icon={BrainCircuit}
                                    label="Neural Metadata Injection"
                                    desc="Embed AI take scores and continuity alerts directly into the timeline XML markers."
                                    active={includeAI}
                                    onChange={setIncludeAI}
                                />
                                <ToggleSetting
                                    icon={Layers}
                                    label="Consolidate Media References"
                                    desc="Rewrite paths to point to locally indexed high-resolution source material."
                                    active={true}
                                    onChange={() => { }}
                                />
                            </div>
                        </section>
                    </div>
                </main>

                <aside className="w-[400px] bg-surface/50 backdrop-blur-xl border-l border-white/5 flex flex-col relative z-20">
                    <div className="p-8 flex-1 flex flex-col justify-between">
                        <div className="space-y-8">
                            <div>
                                <h3 className="text-[10px] font-black text-editor-muted uppercase tracking-[0.4em] mb-6">Manifest Validation</h3>
                                <div className="space-y-4">
                                    <ManifestItem label="Timeline Tracks" value="V1, A1-A4" />
                                    <ManifestItem label="Total Media Assets" value="128 Samples" />
                                    <ManifestItem label="Interchange Protocol" value={selectedFormat.toUpperCase()} />
                                </div>
                            </div>

                            <div className="p-6 bg-black/40 rounded-3xl border border-white/5 space-y-4">
                                <div className="flex items-center gap-3 text-success">
                                    <CheckCircle2 size={16} />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Ready for Compiling</span>
                                </div>
                                <p className="text-[11px] text-editor-muted leading-relaxed font-medium">
                                    The AI Rough Cut has been optimized for the selected format. All media references are verified.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <AnimatePresence>
                                {showSuccess && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        className="p-4 bg-success/20 border border-success/30 rounded-2xl flex items-center gap-3 text-success mb-4"
                                    >
                                        <Zap size={16} />
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Download Initialized</span>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <button
                                onClick={handleExport}
                                disabled={exporting}
                                className={cn(
                                    "w-full py-6 bg-primary text-white text-[11px] font-black uppercase tracking-[0.4em] rounded-3xl shadow-2xl shadow-primary/30 transition-all active:scale-95 flex items-center justify-center gap-4 relative overflow-hidden group",
                                    exporting ? "opacity-50" : "hover:scale-[1.02]"
                                )}
                            >
                                {exporting ? (
                                    <>
                                        <Activity size={20} className="animate-spin" />
                                        Compiling Interchange...
                                    </>
                                ) : (
                                    <>
                                        <Download size={20} className="group-hover:translate-y-1 transition-transform" />
                                        Generate Export
                                    </>
                                )}
                            </button>

                            <button className="w-full py-4 border border-white/5 text-editor-muted text-[9px] font-black uppercase tracking-[0.3em] rounded-2xl hover:bg-white/5 transition-colors flex items-center justify-center gap-2">
                                <Share2 size={14} /> Publish to Review Suite
                            </button>
                        </div>
                    </div>

                    <div className="p-8 border-t border-white/5 bg-black/20">
                        <div className="flex items-center justify-center gap-3 text-editor-muted opacity-30">
                            <Lock size={12} />
                            <span className="text-[8px] font-black uppercase tracking-[0.5em]">Neural Link Secured</span>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
};

const FormatCard = ({ format, isActive, onClick }: { format: ExportFormat, isActive: boolean, onClick: () => void }) => (
    <button
        onClick={onClick}
        className={cn(
            "p-8 rounded-[32px] border text-left transition-all relative overflow-hidden group",
            isActive
                ? "bg-white/5 border-primary/30 shadow-2xl"
                : "bg-surface/30 border-transparent hover:bg-white/[0.02]"
        )}
    >
        {format.recommended && (
            <div className="absolute top-0 right-0 bg-primary/20 text-primary px-4 py-1.5 rounded-bl-2xl text-[8px] font-black uppercase tracking-[0.3em]">Recommended</div>
        )}
        <div className={cn(
            "w-12 h-12 rounded-2xl bg-black/40 flex items-center justify-center mb-6 transition-all duration-500",
            isActive ? "text-primary shadow-[0_0_20px_rgba(59,130,246,0.3)]" : "text-editor-muted group-hover:text-white"
        )}>
            <format.icon size={24} />
        </div>
        <h3 className="font-black text-white italic uppercase tracking-tighter text-lg mb-1">{format.name}</h3>
        <div className="text-[9px] font-mono font-black text-primary opacity-60 mb-4">{format.ext}</div>
        <p className="text-[11px] text-editor-muted leading-relaxed font-medium transition-colors group-hover:text-editor-text">
            {format.desc}
        </p>
    </button>
);

const ToggleSetting = ({ icon: Icon, label, desc, active, onChange }: { icon: any, label: string, desc: string, active: boolean, onChange: (val: boolean) => void }) => (
    <div className="flex items-center justify-between p-6 bg-surface/30 rounded-[28px] border border-white/5 hover:bg-white/[0.02] transition-colors group">
        <div className="flex items-center gap-6">
            <div className="w-10 h-10 rounded-xl bg-black/20 flex items-center justify-center text-editor-muted group-hover:text-primary transition-colors">
                <Icon size={20} />
            </div>
            <div>
                <div className="text-xs font-black text-white uppercase tracking-widest italic mb-1">{label}</div>
                <p className="text-[10px] text-editor-muted font-medium max-w-md">{desc}</p>
            </div>
        </div>
        <button
            onClick={() => onChange(!active)}
            className={cn(
                "w-14 h-7 rounded-full transition-all relative flex items-center px-1.5",
                active ? "bg-primary shadow-[0_0_15px_rgba(59,130,246,0.4)]" : "bg-black/40"
            )}
        >
            <div className={cn("w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-lg", active ? "ml-7" : "ml-0")} />
        </button>
    </div>
);

const ManifestItem = ({ label, value }: { label: string, value: string }) => (
    <div className="flex justify-between items-center py-3 border-b border-white/5">
        <span className="text-[10px] font-bold text-editor-muted uppercase tracking-widest">{label}</span>
        <span className="text-[10px] font-mono font-black text-white">{value}</span>
    </div>
);
