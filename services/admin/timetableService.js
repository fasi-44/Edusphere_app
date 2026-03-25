import api from "../../lib/axios";

const timetableService = {
  async listTimetables(skid, academicYearId) {
    return api.get(`/timeTable/list/${skid}/${academicYearId}`);
  },

  async viewTimetable(skid, timetableId) {
    return api.get(`/timeTable/view/${skid}/${timetableId}`);
  },

  async deleteTimetable(skid, timetableId) {
    return api.delete(`/timeTable/delete/${skid}/${timetableId}`);
  },
};

export default timetableService;
