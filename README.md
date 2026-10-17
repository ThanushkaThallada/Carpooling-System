# All-India Intercity Carpooling and Cashless Rideshare Platform

[![React](https://img.shields.io/badge/Frontend-React%2018-61DAFB?logo=react&logoColor=black)](https://reactjs.org/)
[![Redux](https://img.shields.io/badge/State-Redux-764ABC?logo=redux&logoColor=white)](https://redux.js.org/)
[![Spring Boot](https://img.shields.io/badge/Backend-Spring%20Boot-6DB33F?logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![Java](https://img.shields.io/badge/Language-Java%208+-007396?logo=java&logoColor=white)](https://www.java.com/)
[![UPI NPCI](https://img.shields.io/badge/Payments-NPCI%20UPI-4682B4)](https://www.npci.org.in/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

An enterprise-grade, full-stack intercity carpooling and ridesharing web application designed for highway travelers across India. Features automated passenger dispatch controls, real-time route matching, cashless UPI QR-code payments, dynamic GST-compliant invoices, and an administrative governance suite.

---

## Key Features

### 1. Highway Journey Dispatch and Mission Control
- **4/4 Seat Allocation and Passenger Locking**: Strictly manages 4 passenger seats per highway ride (0/4 -> 1/4 -> 2/4 -> 3/4 -> 4/4).
- **Interactive Driver Decisions**: Driver accepts or declines individual passenger seat requests or uses one-click **Confirm All**.
- **Dynamic Route Scoping**: Real-time multi-route management (e.g., *Hyderabad -> Bengaluru*, *Delhi -> Jaipur*). Every new trip initializes with a clean 4-seat confirmation and settlement flow.
- **Mission Progress Tracker**: Live ride lifecycle controls (Pending -> Confirmed -> Ride in Progress -> Ride Completed).

### 2. Cashless UPI and Dynamic QR Settlement Gateway
- **NPCI Standard UPI Intent Integration**: Generates instant QR codes and mobile UPI deep links (`upi://pay`) compatible with Google Pay, PhonePe, and Paytm.
- **Instant Driver Credit**: Automatic settlement crediting passenger fares directly into the driver's ledger with transaction IDs.
- **Official GST Invoices**: Downloadable and printable receipts with GSTIN (`36AABCC1234D1Z5`), breakdowns, and audit trails.
- **Custom Driver UPI VPA**: Configurable UPI ID (e.g., `driver@ybl`, `alex.driver@okaxis`) with real-time intent updates.

### 3. Multi-Role Authentication with 3 One-Click Logins
Quickly test and switch between accounts using single-click access buttons on the login page:
- **Driver Account** (`alex_driver` / `driver`): Publish trips, accept passengers, collect UPI payments, start highway journeys.
- **Passenger Account** (`rahul_p` / `passenger`): Search intercity rides, filter routes, book seats, scan QR codes to pay cashless.
- **Admin Account** (`admin_ops` / `admin`): Oversee platform activity, review disputes, verify driver IDs, inspect financial ledgers.

### 4. Intelligent Trip Search and Amenities Filtering
- Search highway routes by Origin, Destination, and Departure Date/Time.
- Filter rides by amenities:
  - Air Conditioning
  - Luggage Capacity
  - Pet-Friendly
  - Non-Smoking

### 5. Safety Hub and Live GPS Simulation
- **Highway Map and Live GPS Simulator**: Visual route simulation displaying distance, estimated travel time, and intermediate checkpoints.
- **Emergency SOS Dispatch**: One-touch SOS alerting emergency contacts and nearest highway patrol with live coordinates.

### 6. 7-Tab Admin Governance Center
Comprehensive administrative suite accessible at `/admin`:
1. **Overview**: Key platform metrics, active rides, gross transaction volume, and user growth.
2. **Users and Drivers**: Account management, driver licensing status, and role assignments.
3. **ID Verification**: Aadhaar and Driving License document approvals.
4. **Rides and Dispatch**: Active intercity route oversight with trip cancellation capabilities.
5. **Transactions and Audit**: Master ledger tracking all cashless UPI transactions.
6. **Complaints and Safety**: User ticket resolution and safety incidents.
7. **Reports and Analytics**: Route demand trends and financial settlement summaries.

---

## Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Redux, React Router v5, Axios, React Icons, DateFormat |
| **Styling** | Custom Glassmorphism Theme, Responsive CSS3 Grid and Flexbox |
| **Backend** | Java 8+, Spring Boot 2.x, Spring MVC, Spring Data JPA, Hibernate |
| **Security** | Spring Security, JSON Web Tokens (JWT), Role-Based Access Control |
| **Database** | MariaDB / MySQL / H2 In-Memory Database |
| **Build Tools** | Gradle, npm, Node.js |

---

## Repository Structure

```
carpooling-platform/
├── build.gradle               # Gradle build file for Spring Boot
├── gradlew / gradlew.bat      # Gradle wrapper scripts
├── start_backend.bat          # One-click Windows backend runner
├── src/                       # Spring Boot backend source code
│   └── main/
│       ├── java/com/telerikacademy/carpooling/
│       │   ├── controllers/   # REST API Controllers (Trips, Users, Auth)
│       │   ├── models/        # JPA Entities (Trip, User, Comment, Feedback)
│       │   ├── repositories/  # Spring Data JPA Repositories
│       │   ├── services/      # Business Logic and Validation
│       │   └── security/      # JWT Authentication and Filters
│       └── resources/
│           └── application.properties # Server port (8080) and database configuration
├── frontend/                  # React Single Page Application
│   ├── package.json           # Frontend dependencies and scripts
│   ├── public/                # HTML template and favicon
│   └── src/
│       ├── components/        # Reusable UI, Navigation, Safety, Payment modals
│       ├── containers/        # Page views (MyTrips, SearchTrips, NewTrip, Transactions, Admin)
│       ├── shared/            # UPI Payment Service and NPCI Intent utilities
│       └── store/             # Redux actions, reducers, and store config
└── README.md                  # Project documentation
```

---

## Local Quickstart Guide

### Prerequisites
- **Java JDK 8 or 11+** installed (`java -version`)
- **Node.js 16+** and **npm** installed (`node -v`, `npm -v`)
- **Git** installed (`git --version`)

---

### Step 1: Start the Backend (Port 8080)
Open a terminal in the project root:
```bash
# Windows
start_backend.bat

# Or using Gradle wrapper:
./gradlew bootRun
```
The Spring Boot backend will start at `http://localhost:8080`.

---

### Step 2: Start the Frontend (Port 3000)
Open a second terminal in the `frontend` directory:
```bash
cd frontend
npm install
npm start
```
> **Note**: For Node.js v17+, run:
> ```bash
> set NODE_OPTIONS=--openssl-legacy-provider && npm start
> ```
The React application will open automatically at `http://localhost:3000`.

---

## Deployment Guide (Getting Your Live Deploy Link)

### Option A: Deploy Frontend to Vercel (Recommended for Live Demo)
1. Push this repository to your GitHub account (see instructions below).
2. Go to [Vercel](https://vercel.com) and click **"Add New Project"**.
3. Import your GitHub repository.
4. Set **Root Directory** to `frontend`.
5. Under **Build and Output Settings**:
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`
6. Click **Deploy**. Vercel will provide an instant, permanent live URL (e.g. `https://carpooling-app.vercel.app`).

### Option B: Deploy Backend to Render or Railway
1. Go to [Render](https://render.com) or [Railway](https://railway.app).
2. Connect your GitHub repository.
3. Choose **Docker** or **Java / Gradle** environment.
4. Set the build command to `./gradlew build -x test` and start command to `java -jar build/libs/*.jar`.
5. Copy your live backend URL and set `REACT_APP_API_BASE_URL` in the frontend.

---

## Demo Test Credentials

| Role | Username | One-Click Button | Access Scope |
|---|---|---|---|
| **Driver** | `driver` | Click **"Driver Demo"** | Create trips, Confirm 4/4 seats, Settle UPI payments |
| **Passenger** | `passenger` | Click **"Passenger Demo"** | Search highway rides, Book seats, Scan QR and pay |
| **Admin** | `admin` | Click **"Admin Demo"** | 7-Tab governance center at `/admin` |

---

## License
This project is licensed under the MIT License - feel free to use and modify for educational or production purposes.
