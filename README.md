<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Livre Magique Lab 🪄

**Livre Magique Lab** is a delightful AI-powered storytelling engine designed to create personalized illustrated stories for children, adults, and couples.

Using the power of **Google Gemini 3**, it crafting unique narratives, generates consistent character illustrations (using your uploaded photos), and compiles them into a beautiful PDF storybook.

## ✨ Features

- **Personalized Setup**: Define characters (name, age, photos), themes, and target audience.
- **AI Story Generation**: Generates a 17-part story plan (Scene-by-scene) using **Gemini 3 Pro Preview**.
- **Consistent Illustrations**: Uses **Gemini 3 Pro Image Preview** to generate scene illustrations while maintaining character facial consistency from uploaded reference photos.
- **Smart Image Editing**: Edit specific details of a generated image using natural language prompts.
- **PDF Export**: Download the final story as a high-quality PDF.
- **Multi-Audience Support**: Tailored modes for Kids, Adults, and Lovers (Couples).

## 🚀 Current Status

- **Model Upgrade**: The application has been upgraded to use the latest **Gemini 3 Preview models** (`gemini-3-pro-preview` for text/logic and `gemini-3-pro-image-preview` for generation) for superior quality.
- **Stability Fixes**: Resolved issues with generation hangs and application startup (blank page fix).
- **GitHub Integration**: Project is fully initialized and pushed to GitHub main branch.

## 🛠️ Run Locally

**Prerequisites:**  Node.js (v18+)

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure API Key:**
   - Create a `.env.local` file in the root directory.
   - Add your Gemini API Key:
     ```
     VITE_GEMINI_API_KEY=your_api_key_here
     ```
   *(Note: Ensure your API key has access to Gemini 3 Preview models)*

3. **Run the app:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

## 📸 Tech Stack

- **Frontend**: React, Vite, TypeScript
- **Styling**: TailwindCSS
- **AI Integration**: Google Gen AI SDK (`@google/genai`)
- **PDF Generation**: jsPDF
- **Image Processing**: react-easy-crop
