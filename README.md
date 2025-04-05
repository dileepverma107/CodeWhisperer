# 🚀 CodeWhisperer

<div align="center">
  <img src="public/icon.png" alt="CodeWhisperer Logo" width="200"/>
  <br>
  <h3>Your AI-powered companion for technical coding interviews</h3>
  
  ![Version](https://img.shields.io/badge/version-1.0.0-blue)
  ![License](https://img.shields.io/badge/license-MIT-green)
  ![Platform](https://img.shields.io/badge/platform-Windows-lightgrey)
</div>

## ✨ Features

- 🧠 **AI-Powered Assistance** - Get intelligent suggestions and code snippets during interviews
- 🎤 **Voice Recognition** - Hands-free interaction with voice commands 
- 📷 **Screen OCR** - Extract code or questions from your screen automatically
- 💻 **Multi-AI Integration** - Leverages both OpenAI and Google Gemini AI models
- 🔍 **Real-time Analysis** - Instantly analyze coding problems and provide solutions

## 🛠️ Technologies

- **Electron** - Cross-platform desktop application
- **TypeScript** - Type-safe JavaScript
- **React** - UI development
- **Tesseract.js** - OCR capabilities
- **Google Speech-to-Text & Microsoft Cognitive Services** - Voice recognition
- **Google Gemini & OpenAI** - AI integration

## 🚀 Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/codewhisperer.git

# Navigate to the project
cd codewhisperer

# Install dependencies
npm install

# Start the application in development mode
npm run dev

# Build the application
npm run build
```

## 🔧 Development Setup

The project structure:

- `/src/main` - Electron main process
  - `main.ts` - Application entry point
  - `voice-service.ts` - Voice recognition functionality
  - `gemini-service.ts` & `openai-service.ts` - AI service integration
  - `screenshot.ts` - Screen capture and OCR
- `/src/renderer` - Electron renderer process (UI)
- `/public` - Static assets

## 📋 Usage

1. **Start the application** - Launch CodeWhisperer before your interview
2. **Capture screen** - Take screenshots of coding problems
3. **Voice commands** - Use voice to control the application
4. **Get AI assistance** - Receive suggestions and explanations for coding challenges

## 🌈 Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📜 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

<div align="center">
  <p>Made with ❤️ for coding interview success</p>
</div>
