import api from "../../lib/axios";

const syllabusService = {
  async getSyllabusList(skid, academicYearId) {
    return api.get(`/syllabus/get/list/${skid}`, {
      params: { academic_year_id: academicYearId },
    });
  },

  async getSyllabusDetail(skid, syllabusId, { teacherId, teacherIds } = {}) {
    const params = { include_hierarchy: true };
    if (teacherIds && teacherIds.length > 0) {
      // Combined view: send teacher_id=combined AND teacher_ids=id1,id2,...
      params.teacher_id = "combined";
      params.teacher_ids = teacherIds.join(",");
    } else if (teacherId) {
      params.teacher_id = teacherId;
    }
    return api.get(`/syllabus/get/${skid}/${syllabusId}`, { params });
  },

  async getTeachersForSyllabus(skid, syllabusId) {
    return api.get(`/syllabus/teachers-for-syllabus/${skid}/${syllabusId}`);
  },

  async getSyllabusAnalytics(skid, syllabusId) {
    return api.get(`/syllabus/analytics/${skid}/${syllabusId}`);
  },
};

export default syllabusService;
