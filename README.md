#### AI Resume & Job Description Matcher (ATS Scorer)

Node.js, Express, Google Gemini AI (gemini-3.8-flash), MySQL (Aiven Cloud), Redis (Upstash Cloud), aur Docker par based ek AI-powered ATS resume analyzer. 

#### 🌐 Live Demo

* **[AI Resume & JD Matcher Live](https://ai-resume-jd-matcher.onrender.com)** *(Render Free Tier par hosted; initial load mein 30–40 seconds lag sakte hain).*

#### ✨ Key Features

* **AI-Powered ATS Scoring:** Google Gemini ka use karke resume aur Job Description ka compatibility score calculate karta hai.
* **Keyword Gap & Bullet Optimization:** Missing keywords identify karta hai aur resume bullet points optimize karne ke suggestions deta hai.
* **Persistent Scan History & Dark Mode:** Past scans Aiven Cloud MySQL mein store hote hain aur interface mein Dark/Light mode support milta hai.

#### 🏗️ System Architecture & Caching Strategy

* **Read-Through Redis Caching:** Upstash Cloud Redis ka use karke fast response time milta hai (60-second TTL ke sath MySQL fallback).
* **Graceful Fallback:** AI API key unavailable hone par built-in keyword-matching engine par shift ho jata hai.

#### 🛠️ Tech Stack

* **Frontend:** HTML5, CSS3, Vanilla JavaScript
* **Backend & AI:** Node.js, Express.js, Google Gemini SDK
* **Database & DevOps:** MySQL, Upstash Redis, Docker, Render

#### 🐳 Quick Start (Docker)

1. **Clone Repo & Configure .env:** 

bash

git clone https://github.com/Ramsha162006/AI-Resume-JD-Matcher.git
cd AI-Resume-JD-Matcher

Use code with caution.

Copy code text to clipboard.

Root directory mein .env file banakar MYSQL_PASSWORD aur GEMINI_API_KEY set karein.
2. **Run App:** 

bash

docker compose up --build

Use code with caution.

Copy code text to clipboard.

App http://localhost:3000 par run hogi.

**Author:** Ramsha