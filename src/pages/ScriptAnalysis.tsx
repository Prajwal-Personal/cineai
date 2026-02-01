import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
    FileText,
    Upload,
    CheckCircle2,
    X,
    AlertTriangle,
    Zap,
    Download,
    Briefcase
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { api } from '../lib/api';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface ScriptAnalysisData {
    executive_summary: string[];
    scenes: {
        scene_number: number;
        heading: string;
        summary: string;
        strengths: string[];
        weaknesses: string[];
        suggested_shots: string[];
        suggested_blocking: string[];
        locations: string[];
        props: string[];
    }[];
    character_insights: {
        name: string;
        arc: string;
        subtext_notes: string[];
        key_motives: string[];
    }[];
    production_notes: {
        locations: string[];
        set_pieces: string[];
        props: string[];
        wardrobe: string[];
        estimated_budget_tier: string;
    };
    visual_shot_list: { type: string; description: string }[];
    critical_path: string[];
}

interface StoryVariant {
    title: string;
    logline: string;
    story: string;
    theme: string;
}

export const ScriptAnalysis = () => {
    const [file, setFile] = useState<File | null>(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [report, setReport] = useState<ScriptAnalysisData | null>(null);
    const [htmlReport, setHtmlReport] = useState<string | null>(null);

    // Feature state
    const [activeTab, setActiveTab] = useState<'analysis' | 'creative'>('analysis');
    const [playgroundText, setPlaygroundText] = useState('');
    const [generatingStory, setGeneratingStory] = useState(false);
    const [variants, setVariants] = useState<StoryVariant[]>([]);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            setFile(acceptedFiles[0]);
            setReport(null);
            setVariants([]);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
        },
        multiple: false
    });

    const handleAnalyze = async () => {
        if (!file) return;
        setAnalyzing(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const response = await api.script.analyze(formData);
            setReport(response.data.analysis);
            setHtmlReport(response.data.html_report);
        } catch (err) {
            console.error("Script analysis failed", err);
            alert("Analysis failed. Please ensure the backend is running.");
        } finally {
            setAnalyzing(false);
        }
    };

    const handleGenerateStories = async () => {
        if (!playgroundText || playgroundText.length < 10) return;
        setGeneratingStory(true);
        try {
            const response = await api.script.generateStories(playgroundText);
            setVariants(response.data.variants);
        } catch (err) {
            console.error("Story generation failed", err);
        } finally {
            setGeneratingStory(false);
        }
    };

    const downloadReport = () => {
        if (!htmlReport) return;
        const blob = new Blob([htmlReport], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `CineAI_Script_Report_${file?.name.replace('.docx', '')}.html`;
        a.click();
    };

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-8">
            <header className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Script IQ Analysis</h1>
                    <div className="flex gap-4 mt-4">
                        <button
                            onClick={() => setActiveTab('analysis')}
                            className={cn(
                                "pb-2 px-4 text-sm font-medium transition-all border-b-2",
                                activeTab === 'analysis' ? "text-primary border-primary" : "text-editor-muted border-transparent hover:text-white"
                            )}
                        >
                            Production Pipeline
                        </button>
                        <button
                            onClick={() => setActiveTab('creative')}
                            className={cn(
                                "pb-2 px-4 text-sm font-medium transition-all border-b-2",
                                activeTab === 'creative' ? "text-accent border-accent" : "text-editor-muted border-transparent hover:text-white"
                            )}
                        >
                            Creative Playground
                        </button>
                    </div>
                </div>
                {report && activeTab === 'analysis' && (
                    <button onClick={downloadReport} className="btn-secondary flex items-center gap-2">
                        <Download size={18} />
                        Export HTML
                    </button>
                )}
            </header>

            {activeTab === 'creative' ? (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="glass-panel p-8 rounded-2xl border-t-2 border-accent">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <Zap size={20} className="text-accent" />
                            Alternative Scenario Generator
                        </h2>
                        <p className="text-editor-muted mb-6 text-sm">
                            Paste your script or story beat below. Our AI will extract characters and themes to weave entirely new creative paths.
                        </p>
                        <textarea
                            value={playgroundText}
                            onChange={(e) => setPlaygroundText(e.target.value)}
                            placeholder="Paste your script here... (e.g. MARCUS enters the room, holding a briefcase...)"
                            className="w-full h-48 bg-surface/50 border border-editor-border rounded-xl p-4 text-editor-text focus:border-accent focus:ring-1 focus:ring-accent transition-all resize-none mb-6"
                        />
                        <button
                            onClick={handleGenerateStories}
                            disabled={!playgroundText || generatingStory}
                            className="btn-accent px-8 py-3 flex items-center gap-3 disabled:opacity-50"
                        >
                            {generatingStory ? (
                                <>
                                    <Zap className="animate-spin" size={20} />
                                    Tuning Creative Entropies...
                                </>
                            ) : (
                                <>
                                    <FileText size={20} />
                                    Generate Story Variants
                                </>
                            )}
                        </button>
                    </div>

                    {variants.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {variants.map((v, i) => (
                                <div key={i} className="glass-panel p-6 rounded-xl border border-accent/20 hover:border-accent/50 transition-all flex flex-col">
                                    <div className="flex justify-between items-start mb-4">
                                        <h3 className="text-lg font-bold text-accent">{v.title}</h3>
                                        <span className="bg-accent/10 text-accent text-[10px] uppercase font-bold px-2 py-0.5 rounded">
                                            {v.theme}
                                        </span>
                                    </div>
                                    <p className="text-xs font-bold text-editor-muted mb-3 italic">
                                        "{v.logline}"
                                    </p>
                                    <p className="text-sm leading-relaxed text-editor-text flex-1">
                                        {v.story}
                                    </p>
                                    <button className="mt-6 text-accent text-xs font-bold flex items-center gap-1 hover:underline">
                                        Adopt this path <Zap size={12} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : !report ? (
                <div className="glass-panel p-12 rounded-2xl flex flex-col items-center">
                    <div {...getRootProps()} className={cn(
                        "w-full max-w-2xl border-2 border-dashed rounded-xl p-16 flex flex-col items-center justify-center transition-all cursor-pointer",
                        isDragActive ? "border-primary bg-primary/5" : "border-editor-border bg-surface/30 hover:bg-surface/50"
                    )}>
                        <input {...getInputProps()} />
                        <FileText size={48} className="text-primary mb-6" />
                        <h3 className="text-xl font-bold mb-2">Upload Production Draft</h3>
                        <p className="text-editor-muted text-center max-w-sm">
                            Drop your .docx screenplay here. We support standard industry formatting for automatic element extraction.
                        </p>
                        {file && (
                            <div className="mt-8 flex items-center gap-3 bg-editor-track px-4 py-2 rounded-lg">
                                <CheckCircle2 size={16} className="text-success" />
                                <span className="text-sm font-medium">{file.name}</span>
                                <button onClick={(e) => { e.stopPropagation(); setFile(null); }}><X size={14} /></button>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleAnalyze}
                        disabled={!file || analyzing}
                        className="mt-8 btn-primary px-12 py-3 flex items-center gap-3 disabled:opacity-50"
                    >
                        {analyzing ? (
                            <>
                                <Zap className="animate-pulse" size={20} />
                                Analyzing Beats...
                            </>
                        ) : (
                            <>
                                <Briefcase size={20} />
                                Run Filmmaker Analysis
                            </>
                        )}
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-12">
                    {/* Left Column: Summary & Path */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="glass-panel p-6 rounded-xl border-t-2 border-primary">
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <Zap size={18} className="text-primary" />
                                Executive Summary
                            </h3>
                            <ul className="space-y-4">
                                {report.executive_summary.map((item: string, i: number) => (
                                    <li key={i} className="text-sm text-editor-text leading-relaxed pl-4 border-l-2 border-primary/30">
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="glass-panel p-6 rounded-xl">
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-warning">
                                <AlertTriangle size={18} />
                                Critical Path & Rewrites
                            </h3>
                            {report.critical_path.map((item: string, i: number) => (
                                <p key={i} className="text-xs text-editor-muted mb-3 italic">
                                    • {item}
                                </p>
                            ))}
                        </div>

                        <div className="glass-panel p-6 rounded-xl border-t-2 border-accent">
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <Briefcase size={18} className="text-accent" />
                                Production Matrix
                            </h3>
                            <div className="space-y-4">
                                <MatrixItem label="Locations" items={report.production_notes.locations} />
                                <MatrixItem label="Props" items={report.production_notes.props} />
                                <MatrixItem label="Budget Tier" items={[report.production_notes.estimated_budget_tier]} isSingle />
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Scenes & Shots */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="flex items-center gap-4">
                            <h2 className="text-2xl font-bold">Scene Breakdown</h2>
                            <span className="bg-editor-track px-3 py-1 rounded-full text-xs text-editor-muted">
                                {report.scenes.length} Scenes Analyzed
                            </span>
                        </div>

                        {report.scenes.map((scene: any, i: number) => (
                            <div key={i} className="glass-panel overflow-hidden rounded-xl border border-editor-border">
                                <div className="bg-editor-track p-4 border-b border-editor-border flex justify-between items-center">
                                    <h4 className="font-mono text-sm font-bold text-primary">SCENE {scene.scene_number || i + 1}: {scene.heading}</h4>
                                    <div className="flex gap-2">
                                        {scene.locations.map((loc: string, idx: number) => <span key={idx} className="bg-surface px-2 py-0.5 rounded text-[10px] uppercase font-mono">{loc}</span>)}
                                    </div>
                                </div>
                                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <p className="text-sm leading-relaxed"><span className="text-editor-muted font-bold block mb-1">INTENT:</span> {scene.summary}</p>
                                        <div>
                                            <span className="text-xs font-bold text-editor-muted uppercase tracking-wider block mb-2">Shot Suggestions</span>
                                            <div className="flex flex-wrap gap-2">
                                                {scene.suggested_shots.map((shot: string, idx: number) => (
                                                    <span key={idx} className="bg-primary/10 text-primary text-[10px] px-2 py-1 rounded-md border border-primary/20">
                                                        {shot}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-surface/50 p-4 rounded-lg border border-editor-border">
                                        <span className="text-xs font-bold text-editor-muted uppercase tracking-wider block mb-2">Blocking & Staging</span>
                                        <ul className="space-y-2">
                                            {scene.suggested_blocking.map((note: string, idx: number) => (
                                                <li key={idx} className="text-xs flex items-start gap-2">
                                                    <span className="text-primary mt-1">•</span>
                                                    {note}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const MatrixItem = ({ label, items, isSingle = false }: { label: string, items: string[], isSingle?: boolean }) => (
    <div>
        <span className="text-xs font-bold text-editor-muted uppercase tracking-wider block mb-2">{label}</span>
        <div className="flex flex-wrap gap-1.5">
            {items && items.map((item: string, i: number) => (
                <span key={i} className={cn(
                    "px-2 py-1 rounded text-[10px]",
                    isSingle ? "bg-accent/20 text-accent font-bold" : "bg-editor-track text-editor-text"
                )}>
                    {item}
                </span>
            ))}
        </div>
    </div>
);
