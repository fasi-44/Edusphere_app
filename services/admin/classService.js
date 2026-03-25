import api from "../../lib/axios";

const classService = {
  // Classes
  async getClasses(skid) {
    return api.get(`/classes/list/${skid}`);
  },

  async createClass(skid, data) {
    return api.post(`/classes/create/class/${skid}`, data);
  },

  async updateClass(skid, classId, data) {
    return api.put(`/classes/update/class/${skid}/${classId}`, data);
  },

  async deleteClass(skid, classId) {
    return api.delete(`/classes/class/delete/${skid}/${classId}`);
  },

  // Sections
  async getSections(skid, classId) {
    return api.get(`/classes/sections/${skid}/${classId}`);
  },

  async createSection(skid, data) {
    return api.post(`/classes/create/section/${skid}`, data);
  },

  async updateSection(skid, sectionId, data) {
    return api.put(`/classes/update/section/${skid}/${sectionId}`, data);
  },

  async deleteSection(skid, sectionId) {
    return api.delete(`/classes/section/delete/${skid}/${sectionId}`);
  },
};

export default classService;
