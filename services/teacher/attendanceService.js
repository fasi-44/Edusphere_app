import api from "../../lib/axios";

const attendanceService = {
    async viewAttendance(skid, academicYearId, params) {
        return api.get(`/attendance/view/${skid}/${academicYearId}`, { params });
    },

    async viewMonthlyAttendance(skid, academicYearId, params) {
        return api.get(`/attendance/monthly/${skid}/${academicYearId}`, { params });
    },

    async recordBulkAttendance(skid, data) {
        return api.post(`/attendance/record/bulk/${skid}`, data);
    },

    async updateBulkAttendance(skid, data) {
        return api.post(`/attendance/update/bulk/${skid}`, data);
    },

    async getStudentsInSection(skid, academicYearId, sectionId, page = 1, limit = 100) {
        return api.get(
            `/students/list/inSection/${skid}/${academicYearId}/${sectionId}`,
            { params: { page, limit } }
        );
    },

    /** Fetch ALL students using pagination loop */
    async getAllStudentsInSection(skid, academicYearId, sectionId) {
        let allData = [];
        let page = 1;
        let hasMore = true;

        while (hasMore) {
            const res = await this.getStudentsInSection(skid, academicYearId, sectionId, page, 100);
            const data = res?.data || [];
            if (Array.isArray(data) && data.length > 0) {
                allData = [...allData, ...data];
                page++;
                hasMore = data.length === 100;
            } else {
                hasMore = false;
            }
        }
        return allData;
    },
};

export default attendanceService;
