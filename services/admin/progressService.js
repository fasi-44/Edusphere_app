import api from "../../lib/axios";

const progressService = {
  async getClassProgress(skid, academicYearId, examId, { classId, sectionId } = {}) {
    const params = {};
    if (classId) params.class_id = classId;
    if (sectionId) params.section_id = sectionId;
    return api.get(`/progress-card/class-progress/${skid}/${academicYearId}/${examId}`, { params });
  },

  async getStudentProgress(skid, studentId, examId) {
    return api.get(`/progress-card/view/${skid}/${studentId}/${examId}`);
  },
};

export default progressService;
