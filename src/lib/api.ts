import axios from 'axios';

let base_url = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

// Force upgrade to HTTPS for production domains (non-localhost)
if (base_url && !base_url.includes('localhost') && !base_url.includes('127.0.0.1')) {
    base_url = base_url.replace('http://', 'https://');
    if (!base_url.startsWith('https://')) {
        base_url = `https://${base_url}`;
    }
}

// Ensure it ends with /api/v1
if (base_url && !base_url.includes('/api/v1')) {
    base_url = base_url.replace(/\/$/, '') + '/api/v1';
}

export const API_BASE_URL = base_url;

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
    },
});

export const api = {
    projects: {
        getCurrent: () => apiClient.get('/projects'),
        create: (data: any) => apiClient.post('/projects', data),
    },
    media: {
        upload: (file: File) => {
            const formData = new FormData();
            formData.append('file', file);
            return apiClient.post('/media/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
        },
        listTakes: () => apiClient.get('/media'),
    },
    processing: {
        getStatus: (takeId: number) => apiClient.get(`/processing/status/${takeId}`),
        start: (takeId: number) => apiClient.post(`/processing/start/${takeId}`),
    },
    timeline: {
        get: () => apiClient.get('/timeline'),
        override: (takeId: number, data: { is_accepted: string; notes?: string }) =>
            apiClient.post(`/timeline/override/${takeId}`, data),
    },
    script: {
        getCoverage: () => apiClient.get('/script/coverage'),
        analyze: (formData: FormData) => apiClient.post('/script/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        }),
        generateStories: (text: string) => apiClient.post('/script/generate-stories', { text }),
    },
    intelligence: {
        getHeatmap: (takeId: number) => apiClient.get(`/intelligence/heatmap/${takeId}`),
        getRisk: () => apiClient.get('/intelligence/risk'),
        getProjectInsights: () => apiClient.get('/intelligence/project-insights'),
    },
    training: {
        getStatus: () => apiClient.get('/training/status'),
        dna: () => apiClient.get('/training/dna'),
    },
    export: {
        download: (format: string) => apiClient.get(`/export/${format}`),
    },
    search: {
        intent: (data: { query: string; top_k?: number; filters?: any }) =>
            apiClient.post('/search/intent', data),
        unified: (data: { query: string; top_k?: number; filters?: any }) =>
            apiClient.post('/search/unified', data),
        suggestions: (q: string) => apiClient.get(`/search/suggestions?q=${q}`),
        explain: (id: number) => apiClient.get(`/search/explain/${id}`),
        feedback: (data: { query: string; result_id: number; is_relevant: boolean }) =>
            apiClient.post('/search/feedback', data),
    },
    aiMonitor: {
        analyzeFull: (takeId: number) => apiClient.post(`/ai-monitor/analyze-full/${takeId}`),
        getMetadata: (takeId: number) => apiClient.get(`/ai-monitor/metadata/${takeId}`),
        getStatus: (takeId: number) => apiClient.get(`/ai-monitor/status/${takeId}`),
    }
};

export default apiClient;
