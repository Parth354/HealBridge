# HealBridge Doctor Platform

A modern, professional medical dashboard for doctors built with React, Vite, and Tailwind CSS v4.

## 🚀 Features

- **Authentication**: Mock OTP-based login and verification
- **Dashboard**: Overview with KPIs, quick actions, and today's appointments
- **Schedule Management**: Day/week view with appointment filtering and status management
- **Patient Summary**: Complete medical records with AI-powered RAG chat for querying patient data
- **Consultation**: Timer-based consults with e-prescription builder and medicine autocomplete
- **Analytics**: Comprehensive charts and insights using Recharts
- **Responsive Design**: Mobile-friendly UI with collapsible sidebar
- **Error Handling**: Error boundaries and toast notifications

## 🛠️ Tech Stack

- **React 19** - UI library
- **Vite** - Build tool
- **Tailwind CSS v4** - Styling (Vite-first approach, no config files)
- **React Router v7** - Navigation
- **React Query (TanStack Query)** - Data fetching and caching
- **Axios** - HTTP client
- **Recharts** - Charts and data visualization
- **Lucide React** - Icons
- **date-fns** - Date utilities

## 📦 Installation

```bash
# Install dependencies
npm install
```

## 🎯 Running the Application

```bash
# Start development server
npm run dev
```

The application will be available at `http://localhost:5173`

## 🔑 Demo Credentials

The application uses mock authentication for demo purposes:

- **Email**: Any valid email format (e.g., `doctor@healbridge.com`)
- **Phone**: Any valid phone number (e.g., `+91 98765 43210`)
- **OTP**: Any 6-digit code

## 📱 Main Routes

- `/login` - Login page
- `/verify` - OTP verification
- `/dashboard` - Main dashboard
- `/schedule` - Appointment schedule
- `/patient/:id` - Patient summary with RAG chat
- `/consult/:appointmentId` - Consultation page with e-prescription
- `/analytics` - Analytics dashboard

## 🎨 Design Features

- **Modern Medical UI**: Clean, professional design with blue/white palette
- **Fully Responsive**: Works seamlessly on desktop, tablet, and mobile
- **Accessibility**: ARIA labels and keyboard navigation
- **Loading States**: Skeleton loaders and spinners
- **Error Handling**: Graceful error boundaries and user feedback
- **Toast Notifications**: Success, error, warning, and info messages

## 🏗️ Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── AppointmentCard.jsx
│   ├── ErrorBoundary.jsx
│   ├── Layout.jsx
│   ├── Navbar.jsx
│   ├── Sidebar.jsx
│   ├── SkeletonLoader.jsx
│   └── Toast.jsx
├── pages/              # Page components
│   ├── Analytics.jsx
│   ├── Consult.jsx
│   ├── Dashboard.jsx
│   ├── Login.jsx
│   ├── PatientSummary.jsx
│   ├── Schedule.jsx
│   └── Verify.jsx
├── api/                # API client and mock functions
│   ├── client.js
│   └── doctorApi.js
├── context/            # React Context providers
│   ├── AuthContext.jsx
│   └── ToastContext.jsx
├── hooks/              # Custom React hooks
│   └── useAppointments.js
├── utils/              # Utility functions and constants
│   └── constants.js
├── App.jsx             # Main app with routing
├── main.jsx            # Entry point
└── index.css           # Global styles with Tailwind
```

## 🧪 Mock Data

The application includes comprehensive mock data for:

- Appointments with various statuses
- Patient records with medical history, vitals, and lab results
- Analytics data with trends and insights
- Medicine database for prescription autocomplete

## 🔧 Build for Production

```bash
# Build the application
npm run build

# Preview production build
npm run preview
```

## 📝 Key Features Explained

### 1. Authentication Flow
- Passwordless login with email/phone
- OTP verification (mock)
- Session management with sessionStorage
- Protected routes with automatic redirect

### 2. Schedule Management
- Day and week view modes
- Real-time status filtering
- Appointment actions (confirm, cancel)
- Double-booking prevention
- Wait time estimates

### 3. Patient Summary with RAG Chat
- Complete patient profile
- Medical history and current medications
- Vitals tracking with visual indicators
- Lab results with status badges
- AI-powered chat to query patient data
- Mock RAG implementation with context retrieval

### 4. Consultation Module
- Start/pause/stop timer for consultation tracking
- E-prescription builder with:
  - Medicine name autocomplete
  - Dosage and frequency selection
  - Duration specification
  - Special instructions
- Save draft or send to patient
- Patient info sidebar

### 5. Analytics Dashboard
- Line charts for consultation trends
- Pie chart for appointment status distribution
- Bar charts for revenue and demographics
- Top diagnoses tracking
- Performance KPIs
- Date range filtering

## 🎯 Future Enhancements

- Real backend API integration
- PDF prescription generation
- Video consultation integration
- Real-time notifications
- Advanced analytics with filters
- Patient portal integration
- Multi-language support

## 📄 License

This is a demo project for educational purposes.

## 👨‍💻 Developer Notes

- Uses modern Tailwind CSS v4 (Vite plugin approach)
- All API calls are mocked with realistic delays
- No actual PHI data storage (in-memory only)
- React Query for efficient data caching
- Error boundaries for resilient UI
- Accessible and keyboard-friendly

---

**Built with ❤️ for HealBridge**
