import api from "../../lib/axios";

const studentAssignmentService = {
    /** Get assignments for the student */
    async getAssignments(skid, { studentId, academicYearId, date }) {
        const params = {
            student_id: studentId,
            academic_year_id: academicYearId,
        };
        if (date) params.date = date;
        return api.get(`/assignments/student/${skid}`, { params });
    },
};

export default studentAssignmentService;
