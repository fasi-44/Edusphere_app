import api from "../../lib/axios";

const attendanceService = {
  async viewAttendance(skid, academicYearId, { classId, sectionId, date }) {
    return api.get(`/attendance/view/${skid}/${academicYearId}`, {
      params: {
        class_id: classId,
        section_id: sectionId,
        date,
      },
    });
  },

  async viewMonthlyAttendance(skid, academicYearId, { classId, sectionId, startDate, endDate }) {
    return api.get(`/attendance/monthly/${skid}/${academicYearId}`, {
      params: {
        class_id: classId,
        section_id: sectionId,
        start_date: startDate,
        end_date: endDate,
      },
    });
  },
};

export default attendanceService;
