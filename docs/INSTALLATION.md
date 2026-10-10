# Installation & Setup Guide

This guide covers step-by-step installation of **Apex LMS** on **Windows**, **Ubuntu/Debian Linux**, and **macOS**, as well as how to configure **Local Area Network (LAN)** access for campus-wide availability.

---

## 📋 System Prerequisites

Before starting, ensure you have:
- **Node.js**: Version `18.0.0` or later (LTS version 20.x recommended)
- **Git**: Installed on your system
- **RAM**: Minimum 512 MB (Runs comfortably under 100 MB RAM)
- **Disk Space**: ~150 MB free space

---

## 🪟 1. Windows Installation (Recommended for College PCs)

### Method A: One-Click Quick Start
1. Clone or download the repository:
   ```cmd
   git clone https://github.com/DG1128/Apex-Library.git
   cd Apex-Library
   ```
2. Double-click the **`start.bat`** file in the project folder.
   - It will automatically verify Node.js, install dependencies if missing, seed the database if not present, detect your local and LAN IP addresses, and launch the server.
3. Open your browser at `http://localhost:3000`.

### Method B: Manual Command Prompt / PowerShell
```cmd
# 1. Clone repository
git clone https://github.com/DG1128/Apex-Library.git
cd Apex-Library

# 2. Install dependencies
npm install

# 3. Create environment config
copy .env.example .env

# 4. Seed initial database
npm run seed

# 5. Start the server
npm start
```

---

## 🐧 2. Linux (Ubuntu / Debian / Raspberry Pi) Installation

```bash
# 1. Update system packages and install Node.js 20.x if needed
sudo apt update
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git

# 2. Clone repository
git clone https://github.com/DG1128/Apex-Library.git
cd Apex-Library

# 3. Install dependencies
npm install

# 4. Create environment file
cp .env.example .env

# 5. Seed database
npm run seed

# 6. Start server
npm start
```

---

## 🍏 3. macOS Installation

```bash
# 1. Ensure Node.js is installed (via Homebrew if needed)
# brew install node git

# 2. Clone repository
git clone https://github.com/DG1128/Apex-Library.git
cd Apex-Library

# 3. Install dependencies
npm install

# 4. Create environment configuration
cp .env.example .env

# 5. Seed database
npm run seed

# 6. Start server
npm start
```

---

## 🌐 4. Campus LAN (Local Area Network) Access

Apex LMS binds to `0.0.0.0`, allowing any device connected to the same college Wi-Fi or wired Ethernet network to access the system without additional server hardware.

### Finding the Server IP
When the server starts, it prints the active LAN IP addresses:
```
 🚀 Server running at:
    🏠 Local PC:     http://localhost:3000
    🌐 College LAN:  http://192.168.1.105:3000
```

### Windows Firewall Configuration
If client computers cannot open `http://<SERVER-IP>:3000`, allow port 3000 through the Windows Defender Firewall:
1. Open PowerShell as **Administrator**.
2. Run the following command:
   ```powershell
   New-NetFirewallRule -DisplayName "Apex LMS HTTP" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
   ```

### Client Access
Students and faculty on campus can open `http://192.168.1.105:3000` from their smartphones, tablets, or lab PCs without installing any software.

---

## 🔑 5. Default Demonstration Credentials

When seeded, the following demo accounts are created:

| Role | Member ID | Default Password | Notes |
| :--- | :--- | :--- | :--- |
| **Administrator** | `ADMIN001` | `admin127` | *Requires password reset on 1st login* |
| **Librarian** | `LIB001` | `password123` | Full circulation & catalog management |
| **Faculty** | `FAC001` | `password123` | 30-day loans, unlimited renewals |
| **Student** | `STU2024001` | `password123` | 14-day loans, gamified reading badge |

> [!WARNING]
> Change all default passwords immediately after completing installation before deploying in a live environment!
