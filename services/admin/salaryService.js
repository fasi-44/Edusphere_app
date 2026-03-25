import api from "../../lib/axios";

const salaryService = {
  // Salary Setup
  async getSalarySetups(skid, academicYearId) {
    return api.get(`/expenses/list/salary-setup/${skid}`, {
      params: { academic_year_id: academicYearId },
    });
  },

  async createSalarySetup(skid, payload) {
    return api.post(`/expenses/salary-setup/${skid}`, payload);
  },

  async updateSalarySetup(skid, payload) {
    return api.put(`/expenses/salary-setup/update/${skid}`, payload);
  },

  async deleteSalarySetup(skid, setupId) {
    return api.delete(`/expenses/salary-setup/delete/${skid}/${setupId}`);
  },

  // Salary Payments
  async getSalaryPayments(skid, academicYearId) {
    return api.get(`/expenses/salary-payments/${skid}`, {
      params: { academic_year_id: academicYearId },
    });
  },

  async generateSalaryPayments(skid, { academicYearId, month, year }) {
    return api.post(`/expenses/salary-payments/generate/${skid}`, {
      academic_year_id: academicYearId,
      month,
      year,
    });
  },

  async markPaymentPaid(skid, paymentId, payload) {
    return api.put(`/expenses/salary-payments/${paymentId}/mark-paid/${skid}`, payload);
  },

  async markPaymentUnpaid(skid, paymentId) {
    return api.put(`/expenses/salary-payments/${skid}/mark-unpaid/${paymentId}`);
  },

  // Staff list for salary setup
  async getStaffList(skid) {
    return api.get(`/users/list/staff/${skid}`);
  },
};

export default salaryService;
