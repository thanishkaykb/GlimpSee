# ✨ GlimpSee

<div align="center">

### A glowing window into your day.

Share real moments with the people who matter most. No algorithms. No follower counts. No endless scrolling.

Built for genuine connections through private circles and real-time photo sharing.

</div>

---

## 📖 Overview

GlimpSee is a private social sharing platform designed around small groups of trusted people called **Circles**.

Instead of broadcasting moments to hundreds of followers, users can instantly share photos and videos with close friends, family members, or specific groups.

The platform focuses on authenticity by removing social pressure and prioritizing meaningful connections.

---

## ✨ Features

### 📸 Instant Photo & Video Sharing

Capture moments directly from your device camera or upload existing media.

* Photo sharing
* Video sharing
* Real-time uploads
* Media captions

---

### 👥 Private Circles

Create intimate groups for the people who matter most.

Users can:

* Create circles
* Join circles using invite codes
* Leave circles anytime
* Share content with specific circles

---

### 📰 Real-Time Feed

Stay connected with your inner circle through a live feed.

Features include:

* Instant updates
* Chronological content display
* Media previews
* User profiles

---

### ❤️ Emoji Reactions

Express yourself without complicated engagement metrics.

Available reactions include:

* ❤️ Love
* 😂 Funny
* 🔥 Amazing
* 😮 Surprised
* 🥹 Emotional
* 👏 Appreciation

---

### 📅 Memories

Relive important moments through a dedicated memories view.

Users can:

* Browse past posts
* View memories by date
* Revisit shared experiences
* Download saved content

---

### 👤 User Profiles

Personalize your experience with:

* Display names
* Usernames
* Profile photos
* Account management

---

### 🔐 Secure Authentication

Powered by Supabase Authentication for secure account management and access control.

---

## 🏗️ System Architecture

```text
                  User
                    │
                    ▼

          Authentication Layer
                (Supabase)
                    │
                    ▼

           GlimpSee Platform
                    │
    ┌───────────────┼───────────────┐
    ▼               ▼               ▼

 Private Feed     Circles       Memories
    │               │               │
    └───────────────┼───────────────┘
                    ▼

           Supabase Database
                    │
                    ▼

           Media Storage Layer
```

---

## 🛠️ Tech Stack

### Frontend

* React 19
* TypeScript
* TanStack Start
* TanStack Router
* TanStack Query
* Tailwind CSS 4
* Radix UI
* Lucide Icons
* Recharts

### Backend

* Supabase
* PostgreSQL Database
* Authentication Services
* Storage Services

### Development Tools

* Vite
* ESLint
* Prettier

### Deployment

* Vercel

---

## 🚀 Installation

### Clone Repository

```bash
git clone https://github.com/thanishkaykb/GlimpSee.git

cd GlimpSee
```

### Install Dependencies

```bash
npm install
```

or

```bash
bun install
```

### Configure Environment Variables

Create a `.env` file:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Run Development Server

```bash
npm run dev
```

---

## 📂 Project Structure

```text
src/
│
├── routes/
│   ├── Feed
│   ├── Capture
│   ├── Circles
│   ├── Memories
│   ├── Profile
│   └── Authentication
│
├── components/
│   ├── UI Components
│   └── Shared Components
│
├── hooks/
│   ├── Circle Management
│   └── Feed Utilities
│
├── integrations/
│   └── Supabase
│
└── assets/
```

---

## 🎯 Core Philosophy

GlimpSee was built around a simple idea:

> Social media should help people connect, not compete.

Instead of chasing likes, followers, and engagement metrics, GlimpSee encourages meaningful sharing among trusted circles.

---

## 🔮 Future Enhancements

* Stories feature
* Group video sharing
* End-to-end encrypted circles
* Voice notes
* Shared albums
* Event-based circles
* AI-powered memory highlights
* Push notifications

---

## 📸 Screenshots

### Landing Page



### Feed



### Capture



### Circles



### Memories



---

## 👨‍💻 Author

### Thanishka Yogesh

* GitHub: https://github.com/thanishkaykb
* LinkedIn: https://www.linkedin.com/in/thanishka-yogesh/
* Portfolio: https://portfolio-thanishka-yogesh.vercel.app/

---

## 📜 License

This project is licensed under the MIT License.

---

## ⭐ Support

If you found this project useful, consider giving it a star.

Built to make sharing personal moments feel personal again.
