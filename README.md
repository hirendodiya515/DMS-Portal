# Document Management System (DMS)

A robust, full-stack Document Management System built with **NestJS** (Backend) and **React + Vite** (Frontend).

## Features

- **User Authentication**: Secure login with JWT and Role-Based Access Control (RBAC).
- **Document Lifecycle**: Create, Draft, Submit, Approve, Reject, and Archive workflows.
- **Version Control**: Automatic versioning of documents upon updates.
- **File Storage**: Secure local file storage for document attachments.
- **Audit Logging**: Comprehensive audit trail for compliance and tracking.
- **Dashboard & Reports**: Visual analytics for document status, types, and departmental usage.
- **Notifications**: Real-time alerts for workflow actions.
- **User Management**: Admin interface for managing users and roles.

## Tech Stack

### Backend

- **Framework**: NestJS
- **Database**: PostgreSQL with TypeORM
- **Authentication**: Passport JWT
- **File Handling**: Multer

### Frontend

- **Framework**: React (Vite)
- **Styling**: Tailwind CSS, shadcn/ui
- **State Management**: Zustand
- **Charting**: Recharts
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js (v18+)
- PostgreSQL
- npm or yarn

### Installation

1.  **Clone the repository**

    ```bash
    git clone <repository-url>
    cd dms
    ```

2.  **Backend Setup**

    ```bash
    cd backend
    npm install
    cp .env.example .env
    # Update .env with your database credentials
    npm run start:dev
    ```

3.  **Frontend Setup**

    ```bash
    cd frontend
    npm install
    npm run dev
    ```

4.  **Access the Application**
    - Frontend: `http://localhost:5173`
    - Backend API: `http://localhost:3000`

## Default Users (for testing)

- **Admin**: Create a user via the registration endpoint or seed script (if available).
- **Roles**: `admin`, `creator`, `reviewer`, `dept_head`, `compliance_manager`, `viewer`, `auditor`.

## Project Structure

```
dms/
├── backend/            # NestJS API
│   ├── src/
│   │   ├── auth/       # Authentication module
│   │   ├── documents/  # Document management
│   │   ├── users/      # User management
│   │   ├── files/      # File upload handling
│   │   ├── notifications/ # Notification system
│   │   └── ...
├── frontend/           # React App
│   ├── src/
│   │   ├── components/ # Reusable components
│   │   ├── pages/      # Page views
│   │   ├── stores/     # Zustand state stores
│   │   └── ...
```

## License

MIT
