import api from "../../lib/axios";

const busLocationService = {
    updateLocation: (skid, payload) =>
        api.post(`/bus-location/update/${skid}`, payload),

    stopTracking: (skid) =>
        api.post(`/bus-location/stop/${skid}`),

    getChildBusLocation: (skid, studentUserId) =>
        api.get(`/bus-location/my-child-bus/${skid}/${studentUserId}`),

    getLiveLocation: (skid, busStaffUserId) =>
        api.get(`/bus-location/live/${skid}/${busStaffUserId}`),
};

export default busLocationService;
