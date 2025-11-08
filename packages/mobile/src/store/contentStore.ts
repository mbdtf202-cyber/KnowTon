import {create} from 'zustand';

export interface Content {
  id: string;
  title: string;
  description: string;
  contentType: 'pdf' | 'video' | 'audio' | 'course';
  category: string;
  price: number;
  currency: string;
  previewUrl?: string;
  thumbnailUrl?: string;
  creatorId: string;
  creatorName: string;
  rating: number;
  purchaseCount: number;
}

interface ContentState {
  contents: Content[];
  selectedContent: Content | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setContents: (contents: Content[]) => void;
  setSelectedContent: (content: Content | null) => void;
  addContent: (content: Content) => void;
  updateContent: (id: string, updates: Partial<Content>) => void;
  removeContent: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useContentStore = create<ContentState>((set) => ({
  contents: [],
  selectedContent: null,
  isLoading: false,
  error: null,

  setContents: (contents) => set({contents}),
  
  setSelectedContent: (content) => set({selectedContent: content}),
  
  addContent: (content) =>
    set((state) => ({
      contents: [...state.contents, content],
    })),
  
  updateContent: (id, updates) =>
    set((state) => ({
      contents: state.contents.map((content) =>
        content.id === id ? {...content, ...updates} : content
      ),
    })),
  
  removeContent: (id) =>
    set((state) => ({
      contents: state.contents.filter((content) => content.id !== id),
    })),
  
  setLoading: (loading) => set({isLoading: loading}),
  
  setError: (error) => set({error}),
  
  clearError: () => set({error: null}),
}));
