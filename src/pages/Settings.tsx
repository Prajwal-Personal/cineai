import React from 'react';
import { Settings as SettingsIcon, Cpu, Database, Globe, Lock } from 'lucide-react';

export const Settings: React.FC = () => {
    return (
        <div className="h-full bg-editor-darker p-8 overflow-y-auto">
            <div className="max-w-7xl mx-auto space-y-12">
                <header>
                    <h1 className="text-4xl font-black text-white mb-2 flex items-center gap-3">
                        <SettingsIcon className="text-editor-muted" size={36} />
                        System Settings
                    </h1>
                    <p className="text-editor-muted text-lg">Configure GPU acceleration, AI model weights, and external integrations</p>
                </header>

                <div className="glass-panel p-8 rounded-2xl border border-white/5 max-w-2xl">
                    <div className="space-y-8">
                        <SettingItem icon={Cpu} label="GPU Acceleration" desc="Use CUDA-enabled hardware for real-time inference" value="NVIDIA RTX 4090" />
                        <SettingItem icon={Database} label="Storage Path" desc="Location for high-res proxies and AI cache" value="/mnt/prod_storage/cineai" />
                        <SettingItem icon={Globe} label="API Endpoints" desc="Primary backend coordination server" value="http://localhost:8000" />
                    </div>
                </div>
            </div>
        </div>
    );
};

const SettingItem = ({ icon: Icon, label, desc, value }: any) => (
    <div className="flex items-center justify-between">
        <div className="flex gap-4">
            <div className="p-2 rounded bg-white/5 text-editor-muted">
                <Icon size={20} />
            </div>
            <div>
                <div className="text-sm font-bold text-white">{label}</div>
                <div className="text-xs text-editor-muted">{desc}</div>
            </div>
        </div>
        <div className="text-xs font-mono text-primary bg-primary/10 px-3 py-1 rounded border border-primary/20">{value}</div>
    </div>
);
