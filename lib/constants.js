export const ROLES = {
    SUPER_ADMIN: "SUPER_ADMIN",
    SCHOOL_ADMIN: "SCHOOL_ADMIN",
    PRINCIPAL: "PRINCIPAL",
    TEACHER: "TEACHER",
    STUDENT: "STUDENT",
    PARENT: "PARENT",
};

export const ROLE_ROUTES = {
    [ROLES.TEACHER]: "/(teacher)",
    [ROLES.STUDENT]: "/(student)",
    [ROLES.PARENT]: "/(parent)",
    [ROLES.SCHOOL_ADMIN]: "/(admin)",
    [ROLES.PRINCIPAL]: "/(admin)",
    [ROLES.SUPER_ADMIN]: "/(admin)",
};

export const COLORS = {
    primary: "#6366f1",
    primaryDark: "#4f46e5",
    secondary: "#22c55e",
    background: "#f8fafc",
    surface: "#ffffff",
    text: "#0f172a",
    textSecondary: "#64748b",
    border: "#e2e8f0",
    error: "#ef4444",
    warning: "#f59e0b",
    success: "#22c55e",
    info: "#3b82f6",
};

export const PRIORITY_CONFIG = {
    URGENT: {
        label: "Urgent",
        bgColor: "bg-red-50",
        textColor: "text-red-700",
        badgeColor: "bg-red-100",
        dotColor: "bg-red-500",
        borderColor: "border-red-400",
    },
    HIGH: {
        label: "High",
        bgColor: "bg-amber-50",
        textColor: "text-amber-700",
        badgeColor: "bg-amber-100",
        dotColor: "bg-amber-500",
        borderColor: "border-amber-400",
    },
    NORMAL: {
        label: "Normal",
        bgColor: "bg-blue-50",
        textColor: "text-blue-700",
        badgeColor: "bg-blue-100",
        dotColor: "bg-blue-500",
        borderColor: "border-blue-300",
    },
    LOW: {
        label: "Low",
        bgColor: "bg-green-50",
        textColor: "text-green-700",
        badgeColor: "bg-green-100",
        dotColor: "bg-green-500",
        borderColor: "border-green-300",
    },
};

export const ANNOUNCEMENT_TYPE_CONFIG = {
    GENERAL: { label: "General", color: "bg-blue-100", textColor: "text-blue-700", cardBg: "bg-blue-50" },
    ACADEMIC: { label: "Academic", color: "bg-indigo-100", textColor: "text-indigo-700", cardBg: "bg-indigo-50" },
    EXAMINATION: { label: "Examination", color: "bg-fuchsia-100", textColor: "text-fuchsia-700", cardBg: "bg-fuchsia-50" },
    EVENT: { label: "Event", color: "bg-pink-100", textColor: "text-pink-700", cardBg: "bg-pink-50" },
    HOLIDAY: { label: "Holiday", color: "bg-orange-100", textColor: "text-orange-700", cardBg: "bg-orange-50" },
    URGENT: { label: "Urgent", color: "bg-red-100", textColor: "text-red-700", cardBg: "bg-red-50" },
    FEE_RELATED: { label: "Fee Related", color: "bg-emerald-100", textColor: "text-emerald-700", cardBg: "bg-emerald-50" },
    SPORTS: { label: "Sports", color: "bg-yellow-100", textColor: "text-yellow-700", cardBg: "bg-yellow-50" },
};
