# Project Discussion & Details  

## 🧠 Deep Dive: Vision & Goals  

This project aims to empower youth (ages 13–24) with a safe, AI-powered platform for mental wellness. By combining modern web technologies and thoughtful design, we’re building a space where users can:  

- **Reflect**: Use an AI-powered diary to track moods and receive personalized insights.  
- **Connect**: Join an anonymous, supportive community to share experiences and get advice.  
- **Relax**: Access guided breathing, meditation, and mindfulness tools tailored for young people.  
- **Grow**: Track wellness progress, receive recommendations, and build healthy habits.  

### Why This Matters  

Mental health is a journey, and young people deserve tools that are private, secure, and genuinely helpful. Our platform is designed with privacy, safety, and accessibility at its core—leveraging AI to provide meaningful support while protecting user data.  

### What Makes Us Unique  

- **AI Diary Analysis**: Personalized feedback and mood trends using Google Gemini AI.  
- **Anonymous Community**: Safe, moderated space for peer support.  
- **Relaxation Hub**: Evidence-based exercises and activities.  
- **Privacy First**: COPPA-compliant, secure authentication, and strict data protection.  

---

## 📌 Project Overview  
This project is being built with:  

- **Vite**  
- **TypeScript**  
- **React**  
- **shadcn-ui**  
- **Tailwind CSS**  

We are following an **agile approach** with iterations, backlog management, and regular discussions.  

---

## 💡 Project Discussions  

- **Excalidraw (Idea Brainstorming & Flow)**  
[🔗 Open Excalidraw Board](<https://excalidraw.com/#json=v75V7SXpA2v5WhvdtGRFA,d_Tl5KfITopOM5ufsylUkA>)  

---

## 📂 Project Documents  

- **Detailed Project Document**  
[🔗 View Project Details](<https://docs.google.com/document/d/16X9YM3iYrXS6xRn5tOAD6JfiDUljnvEa-h5Unx05Y2w/edit?usp=sharing>)  

- **Product Backlog (Excel)**  
[🔗 View Product Backlog](<https://docs.google.com/spreadsheets/d/18fRNk7fFBhveDPRuTjNo-1CrhTWGDRlVBM7Bj9cB0f8/edit?usp=sharing>)  

---

## 🚀 Development Setup  

If you want to run or edit the project locally:  

```sh
# Step 1: Clone the repository using the Git URL
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory
cd <YOUR_PROJECT_NAME>

# Step 3: Install dependencies
npm i

# Step 4: Start development server
npm run dev


<!-- # MindfulYou - Youth Mental Wellness Platform

A comprehensive full-stack mental wellness application designed specifically for young people (ages 13-24), featuring AI-powered diary analysis, community support, and relaxation tools.

## Features

### 🔐 Secure Authentication
- Email/password authentication via Supabase
- Secure user sessions and data protection
- Privacy-focused design for youth safety

### 📔 AI-Powered Diary
- Daily diary entries with mood tracking
- AI analysis of diary patterns using Gemini AI
- Personalized insights and feedback
- Chat with AI about your entries
- Mood visualization and trends

### 🏠 Personalized Dashboard
- Wellness statistics and progress tracking
- AI-generated personalized recommendations
- Recent entries overview
- Writing streak tracking
- Quick access to all features

### 🧘 Relaxation Hub
- Guided breathing exercises with visual cues
- Meditation timer with progress tracking
- Mindfulness activities and games
- Progressive relaxation techniques
- Positive affirmations

### 👥 Anonymous Community
- Safe space for sharing experiences
- Anonymous posting and responses
- Category-based discussions (anxiety, depression, relationships, etc.)
- Peer support and advice sharing
- Moderated environment for youth safety

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Lucide React** for icons
- **Vite** for development and building

### Backend
- **Supabase** for database and authentication
- **PostgreSQL** with Row Level Security (RLS)
- **Real-time subscriptions** for community features

### AI Integration
- **Google Gemini AI** for diary analysis and recommendations
- **Personalized responses** based on user history
- **Mental health-focused prompts** and safety guidelines

## Setup Instructions

### 1. Environment Variables
Create a `.env` file in the root directory with:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Gemini AI Configuration
VITE_GEMINI_API_KEY=your_gemini_api_key
```

### 2. Supabase Setup
1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to Settings > API to get your project URL and anon key
3. The database migrations will automatically create the required tables
4. Enable Row Level Security (RLS) is already configured

### 3. Gemini AI Setup
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Add the key to your `.env` file

### 4. Installation
```bash
npm install
npm run dev
```

## Database Schema

### Tables Created
- **user_profiles**: User information and preferences
- **diary_entries**: Daily diary entries with mood scores
- **community_posts**: Anonymous community posts
- **community_responses**: Responses to community posts

### Security Features
- Row Level Security (RLS) enabled on all tables
- Users can only access their own data
- Anonymous posting preserves privacy
- Secure authentication with Supabase Auth

## Key Features Explained

### AI Diary Analysis
The AI system analyzes user diary entries to provide:
- Personalized insights based on writing patterns
- Mood trend analysis and feedback
- Supportive responses to user queries
- Mental health recommendations
- Crisis detection and resource suggestions

### Community Safety
- All posts are anonymous by default
- Category-based organization for relevant discussions
- Peer support focus with positive community guidelines
- Safe space for youth to share experiences

### Relaxation Tools
- Evidence-based breathing exercises (4-4-6 pattern)
- Customizable meditation timers
- Interactive mindfulness activities
- Progressive muscle relaxation guides

## Privacy & Safety

- **Data Privacy**: All personal data is encrypted and secured
- **Anonymous Community**: No personal information shared in community features
- **AI Safety**: Mental health-focused AI prompts with crisis detection
- **Youth-Focused**: Age-appropriate content and safety measures
- **COPPA Compliant**: Designed with youth privacy regulations in mind

## Development

### Project Structure
```
src/
├── components/     # Reusable UI components
├── pages/         # Main application pages
├── hooks/         # Custom React hooks
├── lib/           # Utility libraries (Supabase, Gemini AI)
└── types/         # TypeScript type definitions
```

### Key Components
- **Auth.tsx**: Authentication interface
- **Layout.tsx**: Main application layout with navigation
- **Home.tsx**: Dashboard with personalized insights
- **Diary.tsx**: Diary writing and AI chat interface
- **Relaxation.tsx**: Meditation and breathing exercises
- **Community.tsx**: Anonymous community forum

## Contributing

This project is designed to support youth mental wellness. When contributing:
1. Prioritize user safety and privacy
2. Follow mental health best practices
3. Ensure age-appropriate content
4. Test thoroughly for security vulnerabilities
5. Consider accessibility for all users

## Support

For technical support or mental health resources:
- Check the in-app community for peer support
- Contact a trusted adult or mental health professional
- Visit [Crisis Text Line](https://www.crisistextline.org/) for immediate support

## License

This project is designed for educational and wellness purposes. Please use responsibly and prioritize user safety and privacy. -->