import api from "../../lib/axios";

const BASE = "/syllabus";

const syllabusService = {
    /** Get syllabus detail with full hierarchy (lessons/topics/subtopics) */
    async getSyllabusDetail(skid, syllabusId, teacherId) {
        return api.get(`${BASE}/get/${skid}/${syllabusId}`, {
            params: { include_hierarchy: true, teacher_id: teacherId },
        });
    },

    /** List syllabi for a teacher */
    async getTeacherSyllabusList(skid, teacherId, academicYearId) {
        return api.get(`${BASE}/list/teacher/${skid}/${teacherId}`, {
            params: { academic_year_id: academicYearId },
        });
    },

    /** Find syllabus for a specific subject + academic year */
    async getSyllabusBySubject(skid, teacherId, academicYearId) {
        return api.get(`${BASE}/student-view/${skid}`, {
            params: { academic_year_id: academicYearId, teacher_id: teacherId },
        });
    },

    /** Configure timeline (set planned dates) */
    async configureTimeline(skid, data) {
        return api.post(`${BASE}/progress/configure/${skid}`, data);
    },

    /** Start an item (lesson/topic/subtopic) */
    async startItem(skid, data) {
        return api.post(`${BASE}/progress/start/${skid}`, data);
    },

    /** Mark item as completed or revert */
    async markProgress(skid, data) {
        return api.post(`${BASE}/progress/mark/${skid}`, data);
    },
};

export default syllabusService;
