import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
    baseURL: API_URL,
});

export const documentApi = {
    upload: (file) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post('/upload-pdf', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },
    list: () => api.get('/documents'),
    get: (id) => api.get(`/documents/${id}`),
    query: (document_id, query) => api.post(`/documents/${document_id}/query`, { document_id, query }),
    getInteractions: (id) => api.get(`/documents/${id}/interactions`),
    generateFullAudio: (id) => api.post(`/documents/${id}/generate-audio`),
    generateSelectionAudio: (text) => api.post('/generate-selection-audio', null, { params: { text } }),
};

export default api;
