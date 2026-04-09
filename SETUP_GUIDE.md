# DMS Server Setup Guide

This guide provides a step-by-step process for setting up the Document Management System (DMS) on a new Windows server.

---

## 1. Prerequisites

Before setting up the project, ensure the following software is installed on your server:

### A. Node.js (v18 or higher)
1. Download the Windows Installer (.msi) from [nodejs.org](https://nodejs.org/).
2. Run the installer and follow the instructions (the "LTS" version is recommended).
3. Verify installation in CMD:
   ```cmd
   node -v
   npm -v
   ```

### B. PostgreSQL (v14 or higher)
1. Download the interactive installer by EDB from [postgresql.org](https://www.postgresql.org/download/windows/).
2. During installation:
   - Remember the **Password** you set for the `postgres` superuser.
   - Default port is usually `5432`.
   - Keep the default "Locale" as "Default Locale".
3. Verify installation by opening **pgAdmin 4** (included with the installer).

---

## 2. PostgreSQL Initial Setup (via pgAdmin)

If you prefer using a GUI to set up your database for the first time:

1. Open **pgAdmin 4**.
2. Right-click on **Servers** > **Register** > **Server** (if not already connected).
3. Connect to your local server using the `postgres` password you set during installation.
4. **Create a User:**
   - Right-click on **Login/Group Roles** > **Create** > **Login/Group Role...**
   - Name: `dms_user`
   - Definition Tab: Set a password (e.g., `dms_password`).
   - Privileges Tab: Enable "Can login?".
5. **Create a Database:**
   - Right-click on **Databases** > **Create** > **Database...**
   - Database: `dms_db`
   - Owner: `dms_user`

---

## 3. Automated Setup via Batch Script

We have provided a `setup_server.bat` file in the root of the project to automate most of the installation steps.

### What the script does:
- Checks if `node` and `psql` are available.
- Prompts you for your PostgreSQL `postgres` superuser password to create the database automatically.
- Installs global tools: `pm2` and `serve`.
- Installs all project dependencies (Backend & Frontend).
- Builds the Frontend.
- Starts the Backend via **PM2** (Process Manager 2).
- Starts the Frontend via **serve**.

### How to run it:
1. Open **Command Prompt (CMD)** as **Administrator**.
2. Navigate to the project root directory.
3. Run:
   ```cmd
   setup_server.bat
   ```
4. Follow the prompts for your PostgreSQL credentials.

---

## 4. Manual Deployment Steps

If the batch script fails, follow these manual steps:

### Backend Setup:
1. Navigate to the `backend` folder.
2. Run `npm install`.
3. Ensure `.env` file exists and has correct database credentials.
4. Run `npm run build`.
5. Start with PM2:
   ```cmd
   pm2 start dist/main.js --name dms-backend
   ```

### Frontend Setup:
1. Navigate to the `frontend` folder.
2. Run `npm install`.
3. Run `npm run build`.
4. Start serving it:
   ```cmd
   npm install -g serve
   serve -s dist -l 5173
   ```
   *(To keep it running in the background, you can also use PM2: `pm2 start "serve -s dist -l 5173" --name dms-frontend`)*

---

## 5. Accessing the Application

- **Frontend:** `http://localhost:5173` (or your server's IP address on port 5173)
- **Backend API:** `http://localhost:3000`

### Troubleshooting:
- **Firewall:** Ensure ports `3000` and `5173` are open in your Windows Firewall.
- **PM2 Logs:** To check for errors, use `pm2 logs`.
- **Database Connection:** If the backend fails to start, verify the credentials in `backend/.env` match what you set in PostgreSQL.
