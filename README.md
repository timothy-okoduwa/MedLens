# MedLens - Medical Report AI Assistant

A React Native + Expo mobile app that uses AI to interpret and explain medical reports, with context-aware chat and health tracking.

## 🎯 Core Features

- **Authentication**: Secure email/password signup and login with Firebase
- **Report Upload**: Upload PDF or image medical reports
- **AI Interpretation**: DeepSeek AI powered analysis of medical reports
- **Smart Chat**: Ask questions about your reports with AI-powered responses
- **Health Tracking**: Track reports over time and identify health trends
- **Profile Management**: Store health context (age, height, weight, conditions, medications)

## 🛠️ Tech Stack

- **Frontend**: React Native + Expo
- **Navigation**: Expo Router
- **State Management**: Zustand
- **Backend**: Firebase (Auth + Firestore)
- **Storage**: Cloudinary (for PDFs/images)
- **AI**: OpenRouter (DeepSeek R1)
- **Animations**: react-native-reanimated

## 📋 Project Structure

```
medlens/
├── app/
│   ├── (auth)/              # Auth screens (login, signup, onboarding)
│   ├── (tabs)/              # Main tabs (Home, Insights, Analytics, Settings)
│   ├── chat.tsx             # Chat interface
│   ├── report/[id].tsx      # Report details
│   └── _layout.tsx          # Root layout
├── components/ui/           # UI components (Button, Card, Input, etc)
├── config/firebase.ts       # Firebase setup
├── services/                # API integration
│   ├── firebase.ts
│   ├── ai.ts
│   ├── report.ts
│   ├── file.ts
│   └── cloudinary.ts
├── store/                   # Zustand state
├── types/                   # TypeScript types
└── constants/
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Environment Variables

Create `.env.local`:

```
EXPO_PUBLIC_FIREBASE_API_KEY=your_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id

EXPO_PUBLIC_CLOUDINARY_NAME=your_cloudinary_name
EXPO_PUBLIC_CLOUDINARY_PRESET=your_preset

EXPO_PUBLIC_OPENROUTER_API_KEY=your_openrouter_key
```

### 3. Setup Firebase

1. Create Firebase project
2. Enable Email/Password auth
3. Create Firestore with collections: `users`, `user_profile`, `reports`, `chats`
4. Add security rules (see README for details)

### 4. Setup Cloudinary

1. Create Cloudinary account
2. Create unsigned upload preset
3. Add to `.env.local`

### 5. Get OpenRouter API Key

1. Sign up at openrouter.ai
2. Get API key from settings

### 6. Run App

```bash
npm start          # Start dev server
npm run ios        # Run on iOS
npm run android    # Run on Android
```

## 📱 App Flow

1. **Signup/Login** → Auth screens
2. **Onboarding** → Fill health profile
3. **Home** → View reports and quick actions
4. **Insights** → Upload report, see AI interpretation
5. **Chat** → Ask questions about report
6. **Analytics** → Track health trends
7. **Settings** → Edit profile, logout

## 🧠 Key Screens

### Home (Dashboard)
- Greeting with user name
- Last report status
- Quick actions (upload, continue chat)
- List of recent reports

### Insights (Upload & Interpretation)
- File picker (PDF/Image)
- Upload progress
- AI-powered interpretation:
  - Summary
  - Key findings (with status)
  - Detailed explanation
  - Suggested next steps
- Link to chat

### Chat
- Report-aware conversation
- Full message history
- Persistent storage

### Analytics
- Report count
- Most common abnormal markers
- Health trends visualization

### Settings
- Edit health info
- View profile
- Logout

## 🔐 Security

- Firebase Auth for authentication
- Firestore rules protect user data
- Cloudinary for secure file storage
- No medical diagnosis provided

## ⚠️ Important Notes

- **No Medical Diagnosis**: App explains results, doesn't diagnose
- **No Prescriptions**: Educational only
- **Always Consult Professionals**: All screens show healthcare disclaimers
- **Simple Language**: Results explained in plain English

## 🎨 Design

- Primary Color: #FF6B3D (Orange)
- Background: #F8F9FB (Light)
- Clean, card-based layout
- Accessible typography
- Minimal animations

## 📊 Database

### users
```json
{ userId, name, email, createdAt }
```

### user_profile
```json
{ userId, age, gender, height, weight, conditions[], medications[] }
```

### reports
```json
{ reportId, userId, fileName, fileUrl, rawText, aiSummary, createdAt }
```

### chats
```json
{ chatId, reportId, userId, messages[], createdAt }
```

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Firebase connection fails | Check `.env.local` keys and Firestore setup |
| Cloudinary upload fails | Verify unsigned preset and account |
| AI not responding | Check OpenRouter API key and credits |
| Chat not loading | Ensure reportId is set and chat doc exists |

## 🚀 Future Features

- Better PDF text extraction
- More chart types
- Push notifications
- Doctor integration
- Export to PDF
- Multi-language
- Dark mode

## 🎓 What This Demonstrates

✅ React Native + Expo for cross-platform mobile  
✅ Firebase for backend (auth, database, storage)  
✅ Zustand for state management  
✅ TypeScript for type safety  
✅ AI/LLM integration (OpenRouter)  
✅ File upload (Cloudinary)  
✅ Expo Router for navigation  
✅ React best practices  

## 📝 Notes

- Built as MVP focusing on core features
- Prioritizes functionality over perfect UI polish
- Educational project - not for clinical use
- All medical content includes disclaimers

---

**Built with ❤️ using React Native, Firebase, and AI**
