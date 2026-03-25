import api from "../../lib/axios";

const subjectService = {
  async getSubjects(skid, classId) {
    return api.get(`/subjects/list/${skid}/${classId}`);
  },

  async createSubject(skid, data) {
    return api.post(`/subjects/create/subject/${skid}`, data);
  },

  async updateSubject(skid, subjectId, data) {
    return api.put(`/subjects/update/subject/${skid}/${subjectId}`, data);
  },

  async deleteSubject(skid, subjectId) {
    return api.delete(`/subjects/delete/subject/${skid}/${subjectId}`);
  },

  // Teacher-Subject mapping
  async getTeacherSubjects(skid, teacherId) {
    return api.get(`/teachers/${teacherId}/subjects/${skid}`);
  },

  async assignSubjectsToTeacher(skid, teacherId, subjectIds) {
    return api.post(`/teachers/${teacherId}/assign-subjects/${skid}`, {
      subject_ids: subjectIds,
    });
  },
};

export default subjectService;
