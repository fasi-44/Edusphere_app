import api from "../../lib/axios";

const feeService = {
  async getFeeStructures(skid, academicYearId) {
    return api.get(`/fee/structure/list/${skid}`, {
      params: { academic_year_id: academicYearId },
    });
  },

  async getFeeStructureByClass(skid, classId) {
    return api.get(`/fee/structure/${skid}/${classId}`);
  },

  async getFeeCollection(skid, { academicYearId, classId, sectionId, page = 1, limit = 20 } = {}) {
    const params = { page, limit };
    if (academicYearId) params.academic_year_id = academicYearId;
    if (classId) params.class_id = classId;
    if (sectionId) params.section_id = sectionId;
    return api.get(`/fee/collection/${skid}`, { params });
  },

  async getStudentFeeStatus(skid, studentId, academicYearId) {
    return api.get(`/fee/student/${skid}/${studentId}`, {
      params: { academic_year_id: academicYearId },
    });
  },
};

export default feeService;
