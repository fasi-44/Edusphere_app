import api from "../../lib/axios";

const BASE = "/teacherDashboard";

const dashboardService = {
  async getStudentCount(skid, teacherId) {
    return api.get(`${BASE}/students/teacher/count/${skid}/${teacherId}`);
  },

  async getAbsenteesCount(skid, academicYearId, date) {
    return api.get(
      `${BASE}/attendance/absentees/count/${skid}/${academicYearId}/${date}`
    );
  },

  async getAbsenteesList(skid, academicYearId, date) {
    return api.get(
      `${BASE}/attendance/absentees/${skid}/${academicYearId}/${date}`
    );
  },
};

export default dashboardService;
