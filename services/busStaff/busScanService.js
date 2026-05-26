import api from "../../lib/axios";

const busScanService = {
    /** Record a manual check-in / check-out by student_user_id */
    recordScan: (skid, payload) =>
        api.post(`/bus-scan/scan/${skid}`, payload),

    /** Decode a QR payload and record the scan */
    scanQr: (skid, payload) =>
        api.post(`/bus-scan/scan-qr/${skid}`, payload),

    /** Get records for a given date (YYYY-MM-DD), defaults to today */
    getRecords: (skid, { academicYearId, date } = {}) => {
        const params = {};
        if (academicYearId) params.academic_year_id = academicYearId;
        if (date) params.date = date;
        return api.get(`/bus-scan/today/${skid}`, { params });
    },

    /** Search students by name or roll number */
    searchStudents: (skid, query) =>
        api.get(`/bus-scan/search-students/${skid}`, { params: { q: query } }),
};

export default busScanService;
