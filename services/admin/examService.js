import api from "../../lib/axios";

const examService = {
  // Exam Types
  async getExamTypes(skid) {
    return api.get(`/exams/fetch/exam-types/${skid}`);
  },

  async createExamType(skid, payload) {
    return api.post(`/exams/create/exam-type/${skid}`, payload);
  },

  async updateExamType(skid, id, payload) {
    return api.put(`/exams/update/exam-type/${skid}/${id}`, payload);
  },

  async deleteExamType(skid, id) {
    return api.delete(`/exams/delete/exam-type/${skid}/${id}`);
  },

  // Exam Subject Configurations
  async getExamConfigs(skid, { examTypeId, classId, sectionId } = {}) {
    const params = {};
    if (examTypeId) params.exam_type_id = examTypeId;
    if (classId) params.class_id = classId;
    if (sectionId) params.section_id = sectionId;
    return api.get(`/exams/fetch/exam-configs/${skid}`, { params });
  },

  async createExamConfig(skid, payload) {
    return api.post(`/exams/create/exam-config/${skid}`, payload);
  },

  async updateExamConfig(skid, configId, payload) {
    return api.put(`/exams/update/exam-config/${skid}/${configId}`, payload);
  },

  async deleteExamConfig(skid, configId) {
    return api.delete(`/exams/delete/exam-config/${skid}/${configId}`);
  },

  async bulkCopyConfigs(skid, payload) {
    return api.post(`/exams/bulk-copy/exam-configs/${skid}`, payload);
  },
};

export default examService;
