import api from "../../lib/axios";

const classService = {
  async getClasses(skid) {
    return api.get(`/classes/list/${skid}`);
  },

  async getSections(skid, classId) {
    return api.get(`/classes/sections/${skid}/${classId}`);
  },
};

export default classService;
