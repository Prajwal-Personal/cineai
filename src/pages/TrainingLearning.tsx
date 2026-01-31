import React from 'react';
import { Brain, Zap, Fingerprint, History, Settings as SettingsIcon } from 'lucide-react';

export const TrainingLearning: React.FC = () => {
    return (
        <div className="h-full bg-editor-darker p-8 overflow-y-auto">
            <div className="max-w-7xl mx-auto space-y-12">
                <header>
                    <h1 className="text-4xl font-black text-white mb-2 flex items-center gap-3">
                        <Brain className="text-primary" size={36} />
                        Training & Learning
                    </h1>
                    <p className="text-editor-muted text-lg">Fine-tuning AI models on your specific editing style and creative DNA</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="glass-panel p-8 rounded-2xl border border-white/5 space-y-6">
                        <div className="flex items-center gap-4">
                            <Zap className="text-yellow-500" size={24} />
                            <h3 className="text-xl font-bold">Model Weights</h3>
                        </div>
                        <p className="text-sm text-editor-muted">Current training session is analyzing your "Selects" to understand pacing and framing preferences.</p>
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs font-mono">
                                <span>Style Learning</span>
                                <span>65%</span>
                            </div>
                            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full bg-primary w-[65%]" />
                            </div>
                        </div>
                    </div>

                    <div className="glass-panel p-8 rounded-2xl border border-white/5 space-y-6">
                        <div className="flex items-center gap-4">
                            <Fingerprint className="text-accent" size={24} />
                            <h3 className="text-xl font-bold">Creative DNA</h3>
                        </div>
                        <p className="text-sm text-editor-muted">Your unique fingerprint is being extracted from historical project revisions.</p>
                        <button className="px-4 py-2 bg-accent/20 text-accent text-xs font-bold rounded hover:bg-accent/30 transition-all">
                            SYNC EDITING HISTORY
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
