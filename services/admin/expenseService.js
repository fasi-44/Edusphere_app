import api from "../../lib/axios";

const expenseService = {
  async getExpenses(skid, academicYearId) {
    return api.get(`/expenses/${skid}`, {
      params: { academic_year_id: academicYearId },
    });
  },

  async getExpenseById(skid, expenseId) {
    return api.get(`/expenses/get/${skid}/${expenseId}`);
  },
};

export default expenseService;
