# 💀 Monster Counter

A web application for D&D Dungeon Masters to track enemy health, conditions, and encounter information during encounters.

![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Features

- **📚 Official Monster Database**: Access the full D&D 5e SRD monster library through a free external API
- **🎨 Custom Monsters**: Create and add your own custom enemies
- **💚 Health Tracking**: Easily monitor and update HP for multiple creatures during combat
- **🎯 Condition Management**: Track status conditions applied to monsters
- **⭐ XP Total**: Automagically adding xp to the big total as your players are killing enemies
- **🔧 Customizable Display**: Show or hide specific columns
- **📄 Full Monster Sheets**: View complete stat blocks for any official D&D monster
- **💾 Save System**: Import and export your encounter data to share
- **🌐 No Backend Required**: Runs entirely in your browser - no server, no account, nothing to distract from the campaign!

## 🚀 Quick Start

Don't worry if you're not familiar with coding! Follow these simple steps to get Monster Counter running on your computer.

### Prerequisites

Before you begin, you'll need to install **Node.js**. This will be responsible for actually running the code:

1. Go to [nodejs.org](https://nodejs.org/)
2. Download the **LTS version** (long term support)
3. Run the installer and follow the installation wizard
4. You might need to restart

### Step 1: Download the Project

**Option A: Using Git**

If you have Git installed, run these two commands using a terminal:

```
git clone https://github.com/tonix401/monster-counterr.git
```

```
cd monster-counterr
```

**Option B: Download as ZIP**

1. Click the green **Code** button at the top of this page
2. Select **Download ZIP**
3. Extract the ZIP file to a folder on your computer
4. Open a terminal/command prompt in that folder:
   - **Windows**: Open the folder, then type `cmd` in the address bar and press Enter
   - **Mac**: Right-click the folder while holding Control, select "New Terminal at Folder"
   - **Linux**: I don't think I need to tell you

### Step 2: Navigate to Frontend Directory

In your terminal/command prompt, type this command and press Enter:

```bash
cd frontend
```

### Step 3: Install Dependencies

Now install the necessary files:

```bash
npm install
```

This will download all the necessary files. It might take a few minutes.

### Step 4: Start the Application

Once installation is complete, run:

```bash
npm run start
```

I added some fluff for the ✨ aestetics ✨, but essentially you should see a message like:

```
➜  Local:   http://localhost:14120/
```

### Step 5: Open in Your Browser

1. Open your browser (Chrome has some nice features for dropdowns, so I recommend it. Any other should also work fine though)
2. Go to: **http://localhost:14120/**
3. Do not close the terminal, that would kill it
4. Start managing your encounters! 🎲

### Stopping the Application

When you're done destroying your players hopes and dreams:

- Press `Ctrl + C` in the terminal to stop the server
- Now you can close it

### Running It Again Later

Next time you want to use Monster Counter:

1. Open a terminal in the project folder
2. Navigate to frontend: `cd frontend`
3. Run `npm run start`
4. Open **http://localhost:14120/** in your browser

## 🐳 Docker Setup

If you prefer using Docker, there are two options:

### Simple Setup (Recommended)

Quickest way to get started with Docker:

```bash
cd docker/simple_setup
docker compose up -d
```

Then open **http://localhost:8001** in your browser.

To stop:

```bash
docker compose down
```

### Full Setup (with Nginx)

For a complete setup with Nginx reverse proxy:

```bash
cd docker
npm install
npm run up
```

This will start the application with Nginx on ports 80 (HTTP) and 443 (HTTPS).

To stop:

```bash
npm run down
```

## 🛠️ For Developers

### Tech Stack

- **Frontend**: React 19 with TypeScript
- **State Management**: Zustand
- **Build Tool**: Vite
- **Styling**: CSS
- **API**: D&D 5e SRD API (free, no token or anything required)

### Development Scripts

All commands should be run from the `frontend/` directory:

```bash
# Start development server on port 14120
npm run dev

# Build for production
npm run build

# Build and run the site in production
npm run start

# Preview production build
npm run preview
```

## 📝 Misc

- I am happy to receive any feedback and feature suggestions

- This project is open source and available under the [MIT License](https://mit-license.org/).

- Monster data provided by the [D&D 5e API](https://www.dnd5eapi.co/)

🎲 **Happy DMing!** 🎲
