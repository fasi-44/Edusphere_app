import api from "../../lib/axios";

const BASE = "/schoolAdminDashboard";

const dashboardService = {
  async getStats(skid, academicYearId) {
    return api.get(`${BASE}/stats/${skid}`, {
      params: { academic_year_id: academicYearId },
    });
  },

  async getExpenseBreakdown(skid, academicYearId, month) {
    return api.get(`${BASE}/breakdown/monthly/${skid}`, {
      params: { academic_year_id: academicYearId, month },
    });
  },

  async getTimetable(skid, academicYearId, classId, sectionId) {
    const params = { academic_year_id: academicYearId };
    if (classId) params.class_id = classId;
    if (sectionId) params.section_id = sectionId;
    return api.get(`${BASE}/timetable/${skid}`, { params });
  },
};

export default dashboardService;
