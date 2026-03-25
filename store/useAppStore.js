import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const useAppStore = create(
  persist(
    (set) => ({
      academicYear: null,
      academicYears: [],
      school: null,
      theme: "light",

      setAcademicYear: (academicYear) => set({ academicYear }),
      setAcademicYears: (academicYears) => set({ academicYears }),
      setSchool: (school) => set({ school }),
      setTheme: (theme) => set({ theme }),

      initFromLogin: (user) =>
        set({
          academicYear: user.current_academic_year || null,
          academicYears: user.academic_years || [],
          school: {
            id: user.school_id,
            name: user.school_name,
            code: user.school_code,
            skid: user.skid,
          },
        }),

      reset: () =>
        set({
          academicYear: null,
          academicYears: [],
          school: null,
          theme: "light",
        }),
    }),
    {
      name: "edusphere-app",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
