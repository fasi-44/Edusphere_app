import api from "../../lib/axios";

const BASE = "/syllabus";

const studentSyllabusService = {
    /** Get student's syllabus list (resolved via timetable) */
    async getSyllabusList(skid, academicYearId, studentUserId) {
        return api.get(`${BASE}/student-view/${skid}`, {
            params: { academic_year_id: academicYearId, student_user_id: studentUserId },
        });
    },

    /** Get syllabus detail (read-only for students/parents) */
    async getSyllabusDetail(skid, syllabusId, teacherId) {
        return api.get(`${BASE}/student-view/${skid}/${syllabusId}`, {
            params: { teacher_id: teacherId },
        });
    },
};

export default studentSyllabusService;
