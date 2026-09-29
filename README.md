# Aesthetic Lens v2.5 📸

**Live Demo**: [https://photo-web-inky.vercel.app/](https://photo-web-inky.vercel.app/)

Aesthetic Lens is an intelligent photography companion that blends real-time AI posing direction with a 1-tap vintage darkroom processing engine. It acts as both your creative director and your film lab.

## ✨ Features

- **Live WebRTC View Finder**: A custom 4:5 frame viewfinder for precise composition before snapping.
- **AI Vision Copilot (Gemini-2.5-Flash)**: 
  - Analyzes the environment and lighting via Google Gemini.
  - Generates a custom, highly detailed **Pose Blueprint** (Head & Gaze, Hands & Arms, Torso).
  - Fetches curated reference photos directly from Unsplash based on the exact aesthetic detected.
- **Interactive 4:5 Cropping Stage**: Adjust and refine your framing with a mobile-friendly, touch-capable crop tool prior to processing.
- **35mm Analog Darkroom Engine**: 
  - Applied instantly via a custom Python/NumPy pipeline.
  - Lifts pure blacks to a creamy cinematic matte shadow.
  - Kodak Portra color grading (Amber skin tones + cyan shadow split-toning).
  - Authentic luma-masked midtone grain for a highly tactile 35mm film feel.

## 🛠 Tech Stack

### Frontend (Vercel)
- **Next.js 15** (App Router)
- **React 19**
- **Tailwind CSS v4** (Neo-brutalist styling)
- **react-image-crop** for interactive composition.
- **Lucide React** icons.

### Backend (Render / Railway)
- **FastAPI** (High-performance Python web framework)
- **Google GenAI SDK** (Gemini-2.5-Flash for rapid vision inference)
- **Pillow & NumPy** (For core raw pixel manipulation and tone curves)
- **HTTPX** (For asynchronous Unsplash API fetches)

## 🚀 Local Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/devesssi/photo-web.git
   cd photo-web
   ```

2. **Frontend Setup:**
   ```bash
   cd frontend
   npm install
   # Create a .env.local with NEXT_PUBLIC_API_URL=http://localhost:8000
   npm run dev
   ```

3. **Backend Setup:**
   ```bash
   cd aesthetic-lens-backend
   python -m venv venv
   source venv/Scripts/activate # Windows
   pip install -r requirements.txt
   
   # Create a .env with GEMINI_API_KEY and UNSPLASH_ACCESS_KEY
   uvicorn main:app --reload --port 8000
   ```
