import api from "../../lib/axios";

const studentTimetableService = {
    /** Get student's timetable for a specific day */
    async getDailyTimetable(skid, studentId, date) {
        return api.get(`/timeTable/student/${skid}/${studentId}/${date}`);
    },
};

export default studentTimetableService;
