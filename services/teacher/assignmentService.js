import api from "../../lib/axios";

const BASE = "/assignments";

const assignmentService = {
    /** Get teacher's class/section/subject combos */
    async getTeacherClasses(skid, teacherId) {
        return api.get(`${BASE}/teacher-classes/${skid}`, {
            params: { teacher_id: teacherId },
        });
    },

    /** List assignments by date */
    async listAssignments(skid, { teacherId, date, academicYearId }) {
        return api.get(`${BASE}/list/${skid}`, {
            params: {
                teacher_id: teacherId,
                date,
                academic_year_id: academicYearId,
            },
        });
    },

    /** Get assignment detail with students */
    async getAssignmentDetail(skid, assignmentId) {
        return api.get(`${BASE}/${assignmentId}/${skid}`);
    },

    /** Create assignment */
    async createAssignment(skid, data) {
        return api.post(`${BASE}/create/${skid}`, data);
    },

    /** Update assignment (text and/or drawing) */
    async updateAssignment(skid, assignmentId, data) {
        return api.put(`${BASE}/update/${assignmentId}/${skid}`, data);
    },

    /** Bulk update student submissions */
    async updateSubmissions(skid, assignmentId, data) {
        return api.post(`${BASE}/${assignmentId}/submissions/${skid}`, data);
    },

    /** Delete assignment (soft delete) */
    async deleteAssignment(skid, assignmentId) {
        return api.delete(`${BASE}/${assignmentId}/${skid}`);
    },
};

export default assignmentService;
