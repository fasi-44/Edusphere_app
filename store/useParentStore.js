import { create } from "zustand";

export const useParentStore = create((set, get) => ({
    children: [],
    selectedChild: null,
    loading: false,

    setChildren: (children) =>
        set({
            children,
            selectedChild: children.length > 0 ? children[0] : null,
        }),

    selectChild: (child) => set({ selectedChild: child }),

    setLoading: (loading) => set({ loading }),

    reset: () => set({ children: [], selectedChild: null, loading: false }),
}));
