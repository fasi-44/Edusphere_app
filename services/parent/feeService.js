import api from "../../lib/axios";

const feeService = {
    /** Get fee summary for a student */
    async getStudentFeeSummary(skid, studentId, academicYearId) {
        return api.get(`/fee/summary/student/${skid}/${studentId}`, {
            params: { academic_year_id: academicYearId },
        });
    },

    /** Get installments for a specific fee */
    async getInstallments(skid, studentFeeId) {
        return api.get(`/fee/installments/get/${skid}/${studentFeeId}`);
    },
};

export default feeService;
