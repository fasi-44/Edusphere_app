import api from "../../lib/axios";

const userService = {
  // Teachers
  async getTeachers(skid, { page = 1, limit = 20 } = {}) {
    return api.get(`/teachers/list/${skid}`, {
      params: { page, limit },
    });
  },

  async getTeacherById(skid, teacherId) {
    return api.get(`/teachers/profile/${skid}/${teacherId}`);
  },

  // Students
  async getStudents(skid, { page = 1, limit = 100 } = {}) {
    return api.get(`/students/list/${skid}`, {
      params: { page, limit },
    });
  },

  async getStudentsBySection(skid, academicYearId, sectionId, { page = 1, limit = 100, search = "" } = {}) {
    return api.get(`/students/list/inSection/${skid}/${academicYearId}/${sectionId}`, {
      params: { page, limit, search },
    });
  },

  async getStudentById(skid, studentId) {
    return api.get(`/students/get-by-id/${skid}/${studentId}`);
  },

  // Parents
  async getParents(skid, { page = 1, limit = 20 } = {}) {
    return api.get(`/parents/list/${skid}`, {
      params: { page, limit },
    });
  },

  async getParentById(skid, parentId) {
    return api.get(`/parents/get-by-id/${skid}/${parentId}`);
  },

  // All users
  async getAllUsers(skid) {
    return api.get(`/users/list/${skid}`);
  },
};

export default userService;
