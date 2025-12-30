# DMS Project Deployment Guide (Step-by-Step)

This guide will walk you through moving your project from your local laptop to a Virtual Private Server (VPS) using Docker.

---

## Prerequisites

- A Virtual Private Server (VPS) (e.g., DigitalOcean, AWS, Linode, or any Linux server).
- Basic knowledge of using the terminal.

---

## Step 1: Prepare Your Project Locally

Before moving anything, ensure your production configuration is ready.

1.  **Environment Variables:**
    - Go to the `backend` folder.
    - Copy `.env.production.example` to a new file named `.env.production`.
    - Open `.env.production` and update the `JWT_SECRET` with a secure random string.
    - Ensure `DB_HOST` is set to `postgres`.

---

## Step 2: Set Up Your Virtual Server (VPS)

Connect to your server via SSH (usually provided by your VPS provider):

```bash
ssh root@your_server_ip
```

Once logged in, update the package list and install Docker:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
sudo apt install docker.io -y

# Install Docker Compose
sudo apt install docker-compose-v2 -y

# Verify installation
docker --version
docker compose version
```

---

## Step 3: Transfer Your Project to the Server

There are two common ways to do this:

### Option A: Using Git (Recommended)

1.  Push your code to a private repository on GitHub/GitLab.
2.  On the server, clone the repository:
    ```bash
    git clone https://github.com/yourusername/dms.git
    cd dms
    ```

### Option B: Using SCP (Secure Copy) from your Laptop

Run this command FROM YOUR LAPTOP terminal (not the server):

```bash
# Transfer the entire project folder
scp -r C:\path\to\your\dms root@your_server_ip:/root/dms
```

---

## Step 4: Launch the Application

Once the files are on the server:

1.  **Navigate to the project directory:**

    ```bash
    cd dms
    ```

2.  **Start the containers:**

    ```bash
    docker compose up -d --build
    ```

    - `-d` runs it in the background (detached mode).
    - `--build` ensures fresh images are created.

3.  **Check if they are running:**
    ```bash
    docker ps
    ```
    You should see three containers: `dms_frontend`, `dms_backend`, and `dms_postgres`.

---

## Step 5: Verify the Deployment

1.  **Frontend:** Open your browser and go to `http://your_server_ip`.
2.  **Backend API:** Check `http://your_server_ip:3000/api/health` (or whatever your health check endpoint is).
3.  **Logs:** If something isn't working, check the logs:
    ```bash
    docker compose logs -f
    ```

---

## Troubleshooting Tips

- **Firewall:** If you can't access the site, ensure ports `80` (frontend) and `3000` (backend) are open in your VPS firewall (e.g., `ufw allow 80`, `ufw allow 3000`).
- **Database:** The first time it runs, Postgres will create the database automatically using the credentials in `docker-compose.yml`.
- **Permission Denied:** If you get permission errors with Docker, try running commands with `sudo`.

Congratulations! Your first project is now live on the server! 🚀
