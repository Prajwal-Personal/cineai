import React, { useState } from 'react';
import {
    GraduationCap,
    Book,
    Video,
    Link as LinkIcon,
    Map,
    ChevronRight,
    Star,
    Sparkles,
    Youtube,
    ExternalLink,
    Play,
    Zap,
    Layout
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const cn = (...inputs: any[]) => inputs.filter(Boolean).join(' ');

interface Resource {
    title: string;
    type: 'video' | 'course' | 'website' | 'tutorial';
    url: string;
    level: 'Beginner' | 'Intermediate' | 'Expert';
}

interface RoadmapNode {
    id: string;
    title: string;
    description: string;
    resources: Resource[];
}

interface RoadmapStage {
    title: string;
    icon: any;
    nodes: RoadmapNode[];
}

const ROADMAP_DATA: RoadmapStage[] = [
    {
        title: "Phase 01: Narrative Foundation",
        icon: Book,
        nodes: [
            {
                id: "screenplay",
                title: "Screenplay Architecture",
                description: "Master the structure, formatting, and character arcs of cinematic storytelling.",
                resources: [
                    { title: "Story by Robert McKee", type: 'website', url: 'https://mckeestory.com/', level: 'Intermediate' },
                    { title: "KMS Screenwriting Masterclass", type: 'video', url: 'https://www.youtube.com/watch?v=vVkaAnjZ_8E', level: 'Beginner' },
                    { title: "StudioBinder: Screenplay Structure", type: 'tutorial', url: 'https://www.studiobinder.com/blog/screenplay-structure/', level: 'Beginner' }
                ]
            },
            {
                id: "storyboard",
                title: "Visual Grammar (Storyboarding)",
                description: "Translating words into visual shots and sequences.",
                resources: [
                    { title: "Introduction to Shot Listing", type: 'video', url: 'https://www.youtube.com/watch?v=7yv9A_WpWzQ', level: 'Beginner' },
                    { title: "Framing Guide - StudioBinder", type: 'tutorial', url: 'https://www.studiobinder.com/blog/types-of-camera-shots-framing/', level: 'Intermediate' }
                ]
            }
        ]
    },
    {
        title: "Phase 02: Visual Mastery",
        icon: Video,
        nodes: [
            {
                id: "cinematography",
                title: "Cinematography & Lighting",
                description: "The physics of light and the art of the frame.",
                resources: [
                    { title: "Roger Deakins Forum", type: 'website', url: 'https://www.rogerdeakins.com/', level: 'Expert' },
                    { title: "Cinematography Masterclass", type: 'course', url: 'https://www.masterclass.com/classes/roger-deakins-teaches-cinematography', level: 'Expert' },
                    { title: "Theory of Colors in Film", type: 'video', url: 'https://www.youtube.com/watch?v=aXgFcNUWqX0', level: 'Intermediate' }
                ]
            }
        ]
    },
    {
        title: "Phase 03: The Director's Hand",
        icon: Map,
        nodes: [
            {
                id: "directing-actors",
                title: "Directing Performance",
                description: "How to communicate with talent to get the desired emotional output.",
                resources: [
                    { title: "Directing Actors by Judith Weston", type: 'website', url: 'https://judithweston.com/', level: 'Intermediate' },
                    { title: "David Lynch Teaches Creativity", type: 'course', url: 'https://www.masterclass.com/classes/david-lynch-teaches-creativity-and-film', level: 'Expert' }
                ]
            }
        ]
    },
    {
        title: "Phase 04: Post-Production Intelligence",
        icon: Zap,
        nodes: [
            {
                id: "editing",
                title: "Rhythm & Pacing",
                description: "Where the film is truly born: the edit suite.",
                resources: [
                    { title: "In the Blink of an Eye - Walter Murch", type: 'website', url: 'https://en.wikipedia.org/wiki/In_the_Blink_of_an_Eye_(book)', level: 'Intermediate' },
                    { title: "Every Frame a Painting", type: 'video', url: 'https://www.youtube.com/@everyframeapainting', level: 'Beginner' }
                ]
            }
        ]
    }
];

export const TrainingLearning: React.FC = () => {
    const [selectedNode, setSelectedNode] = useState<RoadmapNode | null>(null);

    return (
        <div className="h-full bg-editor-bg overflow-hidden flex flex-col font-sans select-none">
            {/* Academy Header */}
            <header className="p-8 border-b border-white/5 bg-surface/50 backdrop-blur-md flex justify-between items-center relative z-20">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center text-accent">
                            <GraduationCap size={18} />
                        </div>
                        <h1 className="text-2xl font-black text-white italic uppercase tracking-tighter">Director Academy</h1>
                    </div>
                    <p className="text-[10px] font-bold text-editor-muted uppercase tracking-[0.3em] font-mono">
                        CINEMATIC DISCIPLINE & MASTERY ROADMAP V4
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-full flex items-center gap-3">
                        <Star className="text-yellow-500 fill-yellow-500" size={14} />
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">Mastery Path: 12%</span>
                    </div>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto custom-scrollbar relative">
                {/* Background Grid Pattern */}
                <div className="absolute inset-0 bg-[radial-gradient(#ffffff05_1px,transparent_1px)] [background-size:32px_32px] pointer-events-none" />

                <div className="max-w-4xl mx-auto py-24 px-8 relative">
                    <div className="space-y-32">
                        {ROADMAP_DATA.map((stage, sIdx) => (
                            <div key={sIdx} className="relative">
                                {/* Connection Line to Next Stage */}
                                {sIdx < ROADMAP_DATA.length - 1 && (
                                    <div className="absolute left-6 top-16 bottom-0 w-[2px] bg-gradient-to-b from-primary/30 to-transparent -mb-32 z-0" />
                                )}

                                <div className="flex items-center gap-6 mb-12 relative z-10">
                                    <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary shadow-[0_0_20px_rgba(59,130,246,0.2)]">
                                        <stage.icon size={24} />
                                    </div>
                                    <h2 className="text-xl font-black text-white italic uppercase tracking-widest">{stage.title}</h2>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 ml-4">
                                    {stage.nodes.map((node, nIdx) => (
                                        <motion.button
                                            key={node.id}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => setSelectedNode(node)}
                                            className={cn(
                                                "p-6 rounded-[28px] border text-left transition-all relative overflow-hidden group",
                                                selectedNode?.id === node.id
                                                    ? "bg-primary border-primary shadow-2xl shadow-primary/30"
                                                    : "bg-surface/40 border-white/5 hover:border-white/20"
                                            )}
                                        >
                                            <div className="flex justify-between items-start mb-4">
                                                <div className={cn(
                                                    "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                                                    selectedNode?.id === node.id ? "bg-white/20 text-white" : "bg-black/40 text-editor-muted group-hover:text-white"
                                                )}>
                                                    <Layout size={20} />
                                                </div>
                                                <ChevronRight size={16} className={cn("transition-transform group-hover:translate-x-1", selectedNode?.id === node.id ? "text-white" : "text-editor-muted")} />
                                            </div>
                                            <h3 className={cn("font-black italic uppercase tracking-tighter text-lg mb-2", selectedNode?.id === node.id ? "text-white" : "text-white")}>{node.title}</h3>
                                            <p className={cn("text-[11px] font-medium leading-relaxed line-clamp-2", selectedNode?.id === node.id ? "text-white/80" : "text-editor-muted")}>
                                                {node.description}
                                            </p>
                                        </motion.button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Resource Detail Sidebar/Overlay */}
            <AnimatePresence>
                {selectedNode && (
                    <motion.aside
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed inset-y-0 right-0 w-[450px] bg-surface/90 backdrop-blur-2xl border-l border-white/5 shadow-2xl z-50 flex flex-col"
                    >
                        <div className="p-8 border-b border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Sparkles className="text-accent" size={20} />
                                <h3 className="text-xs font-black text-white uppercase tracking-[0.2em] italic">Knowledge Vault</h3>
                            </div>
                            <button onClick={() => setSelectedNode(null)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                                <X size={20} className="text-editor-muted" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-8">
                            <div className="space-y-4">
                                <h1 className="text-3xl font-black text-white italic uppercase tracking-tighter leading-tight">{selectedNode.title}</h1>
                                <p className="text-sm text-editor-muted leading-relaxed font-medium">{selectedNode.description}</p>
                            </div>

                            <div className="space-y-6">
                                <h4 className="text-[10px] font-black text-editor-muted uppercase tracking-[0.4em] mb-4">Curated Resources</h4>
                                {selectedNode.resources.map((res, i) => (
                                    <ResourceCard key={i} resource={res} />
                                ))}
                            </div>
                        </div>

                        <div className="p-8 bg-black/40 border-t border-white/5">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="p-3 bg-accent/20 rounded-xl text-accent">
                                    <Zap size={20} />
                                </div>
                                <div>
                                    <div className="text-[10px] font-black text-white uppercase tracking-widest">Mastery Tip</div>
                                    <p className="text-[11px] text-editor-muted font-medium mt-1">Consistency is key. Spend 30 mins a day on this node.</p>
                                </div>
                            </div>
                            <button className="w-full py-4 bg-primary text-white text-[10px] font-black uppercase tracking-[0.3em] rounded-2xl hover:scale-[1.02] transition-all">
                                Mark Stage as Complete
                            </button>
                        </div>
                    </motion.aside>
                )}
            </AnimatePresence>
        </div>
    );
};

const ResourceCard = ({ resource }: { resource: Resource }) => {
    const Icon = resource.type === 'video' ? Youtube : resource.type === 'website' ? LinkIcon : Play;

    return (
        <a
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col p-6 bg-white/5 rounded-3xl border border-white/5 hover:border-accent/40 hover:bg-white/[0.08] transition-all duration-300"
        >
            <div className="flex items-center justify-between mb-4">
                <div className={cn(
                    "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest",
                    resource.level === 'Beginner' ? "bg-success/20 text-success" :
                        resource.level === 'Intermediate' ? "bg-primary/20 text-primary" :
                            "bg-accent/20 text-accent"
                )}>
                    {resource.level}
                </div>
                <ExternalLink size={14} className="text-editor-muted opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-black/40 flex items-center justify-center text-editor-muted group-hover:text-white transition-colors">
                    <Icon size={20} />
                </div>
                <div>
                    <h5 className="text-xs font-bold text-white group-hover:text-accent transition-colors">{resource.title}</h5>
                    <span className="text-[9px] font-black text-editor-muted uppercase tracking-widest mt-1 block">
                        {resource.type}
                    </span>
                </div>
            </div>
        </a>
    );
};

const X = ({ size, className }: { size?: number, className?: string }) => (
    <svg
        width={size || 24}
        height={size || 24}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
);
