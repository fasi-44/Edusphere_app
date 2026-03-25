import api from "../../lib/axios";

const childrenService = {
    /** Get all children linked to a parent */
    async getChildren(skid, parentUserId) {
        return api.get(`/studentParent/children/${parentUserId}/${skid}`);
    },
};

export default childrenService;
