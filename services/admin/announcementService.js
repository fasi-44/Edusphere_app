import api from "../../lib/axios";

const announcementService = {
  async getAnnouncements(skid, { academicYearId, userRole, schoolUserId, limit, announcementType, priority } = {}) {
    const params = {
      academic_year_id: academicYearId,
      user_role: userRole,
      school_user_id: schoolUserId,
    };
    if (limit) params.limit = limit;
    if (announcementType) params.announcement_type = announcementType;
    if (priority) params.priority = priority;

    return api.get(`/announcements/list/${skid}`, { params });
  },

  async createAnnouncement(skid, payload) {
    return api.post(`/announcements/create/${skid}`, payload);
  },
};

export default announcementService;
