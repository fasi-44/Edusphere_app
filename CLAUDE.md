# CLAUDE.md — edusphere-app (React Native Frontend)

This file provides guidance to Claude Code when working with the Edusphere mobile frontend.

## Repository Overview

React Native Expo application for the **Edusphere School Management System**. Supports six user roles with role-specific dashboards and screens. Built with Expo Router (file-based routing) and NativeWind (Tailwind CSS for React Native).

## Technology Stack

| Package | Version | Notes |
|---|---|---|
| Expo SDK | ~54.0.33 | React Native 0.81.5, React 19.1.0 |
| Expo Router | ~6.0.23 | File-based routing, `app/` directory |
| NativeWind | ^4.2.1 | Tailwind for RN — requires specific babel config |
| TailwindCSS | ^3.4.17 | v3 only (v5 is preview, incompatible) |
| Zustand | ^5.0.11 | State management with AsyncStorage persistence |
| Zod | ^4.3.6 | Schema validation |
| React Hook Form | ^7.71.1 | Form management |
| Axios | ^1.13.4 | HTTP client with JWT interceptors |
| Socket.io-client | ^4.8.3 | Real-time bus location updates |
| expo-location | ~19.0.8 | Foreground + background GPS |
| expo-task-manager | ~14.0.9 | Background location task |
| expo-camera | ~17.0.10 | QR code scanning (bus scan) |
| react-native-maps | 1.20.1 | Bus location map view |
| @expo-google-fonts/lexend | ^0.4.1 | App-wide font |

## Common Commands

```bash
# Install dependencies (must use --legacy-peer-deps)
npm install --legacy-peer-deps

# Start development server
npx expo start

# Start for Android
npx expo start --android

# Start for iOS
npx expo start --ios

# Clear Metro cache and restart
npx expo start --clear
```

> **Why `--legacy-peer-deps`:** `expo-router` pulls `radix-ui` which requires `react-dom@19.2.4`, but the project uses `react@19.1.0`. The flag suppresses this conflict.

## Project Structure

```
edusphere-app/
├── app/                        # Expo Router file-based routes
│   ├── _layout.js              # Root layout: fonts, auth gate, safe area
│   ├── index.js                # Redirect entry (routes to auth/role)
│   ├── (auth)/
│   │   ├── _layout.js
│   │   └── login.js            # Login screen (React Hook Form + Zod)
│   ├── (admin)/                # School Admin, Principal, Super Admin
│   │   ├── _layout.js
│   │   ├── index.js            # Admin dashboard
│   │   ├── academics.js
│   │   ├── announcement-create.js
│   │   ├── announcements.js
│   │   ├── attendance-view.js
│   │   ├── class-list.js
│   │   ├── exam-subjects.js
│   │   ├── exam-types.js
│   │   ├── expense-list.js
│   │   ├── fee-collection.js
│   │   ├── fee-structures.js
│   │   ├── finance.js
│   │   ├── parent-detail.js / parent-list.js
│   │   ├── people.js
│   │   ├── profile.js
│   │   ├── progress-card.js / progress-view.js
│   │   ├── salary-payments.js / salary-setup.js
│   │   ├── student-detail.js / student-list.js
│   │   ├── subject-list.js
│   │   ├── syllabus-detail.js / syllabus-list.js
│   │   ├── teacher-detail.js / teacher-list.js / teacher-subjects.js
│   │   ├── timetable-list.js / timetable-view.js
│   ├── (teacher)/              # Teacher role
│   │   ├── _layout.js
│   │   ├── index.js            # Teacher dashboard
│   │   ├── announcements.js
│   │   ├── assignment-detail.js / assignments.js
│   │   ├── attendance.js
│   │   ├── profile.js
│   │   ├── syllabus-detail.js
│   │   ├── timetable.js
│   ├── (student)/              # Student role
│   │   ├── _layout.js
│   │   ├── index.js            # Student dashboard
│   │   ├── assignments.js
│   │   ├── index.js
│   │   ├── profile.js
│   │   ├── syllabus-detail.js
│   │   ├── timetable.js
│   ├── (parent)/               # Parent role
│   │   ├── _layout.js
│   │   ├── index.js            # Parent dashboard
│   │   ├── assignments.js
│   │   ├── bus-location.js     # Live bus map (Socket.io + react-native-maps)
│   │   ├── fees.js
│   │   ├── profile.js
│   │   ├── syllabus-detail.js
│   │   ├── timetable.js
│   └── (bus-staff)/            # Bus Staff role
│       ├── _layout.js
│       ├── index.js            # Bus staff dashboard / scan interface
│       ├── profile.js
│       └── report.js
├── components/                 # Shared UI components
│   ├── AnnouncementItem.js
│   ├── AttendanceWatchItem.js
│   ├── BusMap.js               # react-native-maps component
│   ├── BusMap.web.js           # Web fallback for bus map
│   ├── ChildSelector.js        # Parent child switcher
│   ├── DrawingCanvas.js        # Signature canvas (react-native-signature-canvas)
│   └── StatCard.js
├── services/                   # API service layer (axios wrappers)
│   ├── authService.js          # Login, logout, token refresh
│   ├── admin/
│   │   ├── announcementService.js
│   │   ├── attendanceService.js
│   │   ├── classService.js
│   │   ├── dashboardService.js
│   │   ├── examService.js
│   │   ├── expenseService.js
│   │   ├── feeService.js
│   │   ├── marksService.js
│   │   ├── progressService.js
│   │   ├── salaryService.js
│   │   ├── subjectService.js
│   │   ├── syllabusService.js
│   │   ├── timetableService.js
│   │   └── userService.js
│   ├── teacher/
│   │   ├── announcementService.js
│   │   ├── assignmentService.js
│   │   ├── attendanceService.js
│   │   ├── classService.js
│   │   ├── dashboardService.js
│   │   ├── syllabusService.js
│   │   └── timetableService.js
│   ├── student/
│   │   ├── assignmentService.js
│   │   ├── syllabusService.js
│   │   └── timetableService.js
│   ├── parent/
│   │   ├── childrenService.js  # Fetch linked children
│   │   └── feeService.js
│   └── busStaff/
│       ├── busLocationService.js  # REST fallback for location
│       └── busScanService.js      # QR scan API calls
├── store/                      # Zustand stores
│   ├── index.js                # Re-exports all stores
│   ├── useAuthStore.js         # Auth state (user, tokens, role, permissions)
│   ├── useAppStore.js          # App state (school, academic year, theme)
│   └── useParentStore.js       # Parent: selected child state
├── lib/                        # Shared utilities
│   ├── axios.js                # Axios instance with JWT interceptors
│   ├── constants.js            # ROLES, ROLE_ROUTES, COLORS, config maps
│   └── socket.js               # Socket.io singleton (bus location)
├── tasks/
│   └── busLocationTask.js      # Expo background location task definition
├── assets/                     # Images, icons
├── global.css                  # NativeWind base CSS
├── babel.config.js
├── metro.config.js
├── tailwind.config.js
└── app.json
```

## Key Architecture Patterns

### Auth Gate (`app/_layout.js`)
The root layout drives all navigation based on auth state:
- Waits for Zustand AsyncStorage hydration before redirecting
- Unauthenticated → `/(auth)/login`
- Authenticated in auth group → role-specific route (via `ROLE_ROUTES` map)
- Stores hydration is checked with `useAuthStore.persist.onFinishHydration()`

### Zustand Stores
Access state **outside React** (axios interceptors, background tasks) via `.getState()`:
```js
const token = useAuthStore.getState().token;
const user = useAuthStore.getState().user;
```

Three stores:
- `useAuthStore` — user, token, refreshToken, sessionId, role, permissions
- `useAppStore` — school info, academicYear, academicYears, theme
- `useParentStore` — children list, selectedChild (no persistence — non-critical)

### Axios (`lib/axios.js`)
- Base URL: `EXPO_PUBLIC_API_BASE_URL` env var (default `http://localhost:5000/api`)
- Request interceptor: attaches `Authorization: Bearer <token>` header
- Response interceptor: on 401, attempts token refresh via `/auth/refresh-token`; on failure, calls `useAuthStore.getState().logout()`

### Socket.io (`lib/socket.js`)
Singleton socket for real-time features (bus location):
```js
import { getSocket, disconnectSocket } from '../lib/socket';
const socket = getSocket(); // lazy-connects with JWT auth
socket.emit('bus_location_update', payload);
```

### Background Location Task (`tasks/busLocationTask.js`)
- Task name: `BUS_LOCATION_TRACKING`
- Must be defined at **module level** (TaskManager requirement)
- Sends GPS updates every 10 seconds or 10 meters via WebSocket; falls back to REST
- Speed converted from m/s → km/h before sending

### Role Routing (`lib/constants.js`)
```js
export const ROLES = {
  SUPER_ADMIN, SCHOOL_ADMIN, PRINCIPAL, TEACHER, STUDENT, PARENT, BUS_STAFF
};
export const ROLE_ROUTES = {
  TEACHER: "/(teacher)",
  STUDENT: "/(student)",
  PARENT:  "/(parent)",
  SCHOOL_ADMIN: "/(admin)",
  PRINCIPAL:    "/(admin)",
  SUPER_ADMIN:  "/(admin)",
  BUS_STAFF:    "/(bus-staff)",
};
```

## Build Configuration

### `babel.config.js`
```js
presets: [
  ["babel-preset-expo", { jsxImportSource: "nativewind" }],
  "nativewind/babel",
],
plugins: [
  "babel-plugin-transform-import-meta",     // Fix Zustand v5 ESM import.meta
  "react-native-reanimated/plugin",         // MUST be last
]
```
> `react-native-reanimated/plugin` must always be **last** in the plugins array.

### `metro.config.js`
```js
config.resolver.unstable_conditionNames = ["require", "react-native", "default"];
```
> Fixes Zustand v5 ESM build (`import.meta.env`) breaking Metro web bundles — forces CJS resolution.

### `tailwind.config.js`
- Custom color palette: `primary` (indigo), `secondary` (green), `dark` (slate)
- Custom fonts: `font-lexend`, `font-lexend-bold`, `font-lexend-semibold`, etc.
- Content paths include `app/`, `components/`, `lib/`

## NativeWind Usage

Use Tailwind class names directly on React Native components:
```jsx
<View className="flex-1 bg-white px-4">
  <Text className="font-lexend-semibold text-dark-900 text-lg">Hello</Text>
</View>
```
Color tokens match `tailwind.config.js` custom palette (e.g., `text-primary-600`, `bg-dark-50`).

## Forms Pattern

All forms use React Hook Form + Zod:
```js
const schema = z.object({ email: z.string().email() });
const { control, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(schema),
});
```

## Adding New Screens

1. Create file in the correct role group: `app/(admin)/new-screen.js`
2. Use the group's `_layout.js` tab/stack navigator (check existing layout)
3. Create a service file in `services/<role>/newService.js` that calls `api` from `lib/axios.js`
4. Add navigation link from dashboard or parent screen

## Environment Variables

Set in `.env` (Expo uses `EXPO_PUBLIC_` prefix for client-accessible vars):
```env
EXPO_PUBLIC_API_BASE_URL=http://192.168.x.x:5000/api
```
> Use your machine's LAN IP (not `localhost`) when testing on a physical device.

## Important Notes

- **Font loading** — all Lexend variants loaded in `app/_layout.js`; `SplashScreen` hidden only after fonts load
- **Platform guards** — `SplashScreen.preventAutoHideAsync()` and hide calls are wrapped in `Platform.OS !== 'web'`
- **BusMap.web.js** — platform-specific file: Metro auto-selects `.web.js` on web, `.js` on native
- **Parent store** — `useParentStore` is not persisted; children are re-fetched on each parent session
- **skid** — school-scoped user identifier used in API URLs (`/api/.../update/<skid>`); available on `user.skid` in auth store
