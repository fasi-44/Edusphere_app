import api from "../../lib/axios";

const BASE = "/teacherDashboard";

const timetableService = {
  async getDailyTimetable(skid, teacherId, date) {
    return api.get(`${BASE}/timetable/teacher/${skid}/${teacherId}/${date}`);
  },

  async getWeeklyTimetable(skid, teacherId, startDate) {
    return api.get(`${BASE}/timetable/teacher/week/${skid}/${teacherId}`, {
      params: { start_date: startDate },
    });
  },

  async getClassTimetable(skid, classId, sectionId, date) {
    return api.get(`/timeTable/class/${skid}`, {
      params: { class_id: classId, section_id: sectionId, date },
    });
  },
};

export default timetableService;
