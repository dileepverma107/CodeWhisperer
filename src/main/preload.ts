import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  toggleVisibility: () => ipcRenderer.invoke('toggle-visibility'),
  quitApp: () => ipcRenderer.invoke('quit-app'),
  windowDrag: (dragData: { mouseX: number, mouseY: number }) => 
    ipcRenderer.send('window-drag', dragData),
  
  // Screenshot and solution generation
  getScreenshots: () => ipcRenderer.invoke('get-screenshots'),
  analyzeProblem: (screenshotPaths: string[], extractedText?: string) => 
    ipcRenderer.invoke('analyze-problem', screenshotPaths, extractedText),
  deleteScreenshots: (screenshotPaths?: string[]) =>
    ipcRenderer.invoke('delete-screenshots', screenshotPaths),
  
  // Voice recording functionality
  startVoiceRecording: () => ipcRenderer.invoke('start-voice-recording'),
  stopVoiceRecording: () => ipcRenderer.invoke('stop-voice-recording'),
  processVoiceToAnswer: (transcription: string) => 
    ipcRenderer.invoke('process-voice-to-answer', transcription),
  isRecording: () => ipcRenderer.invoke('is-recording'),
  
  // Speech recognition communication
  sendSpeechResult: (text: string) => ipcRenderer.send('speech-recognition-result', text),
  sendSpeechError: (error: string) => ipcRenderer.send('speech-recognition-error', error),
  sendSpeechEnd: () => ipcRenderer.send('speech-recognition-end'),
  
  // Receive events from main process
  onScreenshotTaken: (callback: (screenshotPath: string, extractedText: string) => void) => {
    ipcRenderer.on('screenshot-taken', (_event, path, text) => callback(path, text));
  },
  
  onGenerateSolution: (callback: (screenshots: string[], extractedText: string[]) => void) => {
    ipcRenderer.on('generate-solution', (_event, paths, text) => callback(paths, text));
  },
  
  onResetApp: (callback: () => void) => {
    ipcRenderer.on('reset-app', () => callback());
  },
  
  // Voice recording events
  onVoiceRecordingStarted: (callback: () => void) => {
    ipcRenderer.on('voice-recording-started', () => callback());
  },
  
  onVoiceAnswerReady: (callback: (transcription: string, answer: any) => void) => {
    ipcRenderer.on('voice-answer-ready', (_event, transcription, answer) => 
      callback(transcription, answer));
  },
  
  // Browser speech recognition events
  onStartBrowserSpeechRecognition: (callback: () => void) => {
    ipcRenderer.on('start-browser-speech-recognition', () => callback());
  },
  
  onStopBrowserSpeechRecognition: (callback: () => void) => {
    ipcRenderer.on('stop-browser-speech-recognition', () => callback());
  },
  
  onUpdateTranscription: (callback: (text: string) => void) => {
    ipcRenderer.on('update-transcription', (_event, text) => callback(text));
  }
});