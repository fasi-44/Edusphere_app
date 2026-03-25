import api from "../../lib/axios";

const marksService = {
  async fetchStudents(skid, academicYearId, { examConfigId, sectionId }) {
    return api.post(`/marks/fetch-students/${skid}/${academicYearId}`, {
      exam_config_id: examConfigId,
      section_id: sectionId,
    });
  },

  async submitMarks(skid, academicYearId, payload) {
    return api.post(`/marks/entry/${skid}/${academicYearId}`, payload);
  },
};

export default marksService;
