import { app, clipboard, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { analyzeProblem } from './gemini-service';

// This service handles voice recording and processing
export class VoiceService {
  private isRecording: boolean = false;
  private recordingStartTime: number = 0;
  private transcribeTimeout: NodeJS.Timeout | null = null;
  private userQuestion: string = '';
  private clipboardMonitorId: NodeJS.Timeout | null = null;
  private lastClipboardContent: string = '';
  private mainWindow: BrowserWindow | null = null;
  private sampleInterviewQuestions = [
    "How would you implement a binary search tree in JavaScript?",
    "Explain the difference between a linked list and an array. When would you use one over the other?",
    "How would you design a function to check if a binary tree is balanced?",
    "Write a function to find the first non-repeating character in a string.",
    "How would you implement a LRU cache?",
    "Explain how promises work in JavaScript and how they differ from callbacks.",
    "What are the time and space complexity considerations for sorting algorithms?"
  ];

  // Set reference to main window
  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
  }

  // Start recording microphone
  startRecording(): void {
    if (this.isRecording) {
      console.log('Already recording...');
      return;
    }

    console.log('Starting voice recording...');
    
    this.isRecording = true;
    this.recordingStartTime = Date.now();
    this.userQuestion = '';
    
    // Clear clipboard and start monitoring
    clipboard.clear();
    this.startClipboardMonitor();
    
    // Tell renderer to start speech recognition
    if (this.mainWindow) {
      this.mainWindow.webContents.send('start-browser-speech-recognition');
    }
    
    // Set timeout to automatically stop after 2 minutes
    this.transcribeTimeout = setTimeout(() => {
      this.stopRecordingAndTranscribe();
    }, 120000);
  }

  // Stop recording and transcribe audio
  stopRecordingAndTranscribe(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.isRecording) {
        reject(new Error('Not currently recording'));
        return;
      }

      console.log('Stopping recording...');
      
      // Clear transcribe timeout if exists
      if (this.transcribeTimeout) {
        clearTimeout(this.transcribeTimeout);
        this.transcribeTimeout = null;
      }
      
      // Stop clipboard monitoring
      this.stopClipboardMonitor();
      
      // Tell renderer to stop speech recognition
      if (this.mainWindow) {
        this.mainWindow.webContents.send('stop-browser-speech-recognition');
      }
      
      // Give a short delay for any final transcription to arrive
      setTimeout(() => {
        try {
          this.isRecording = false;
          console.log('Recording stopped');
          
          // Use whatever transcription we have, or fallback
          if (this.userQuestion && this.userQuestion.length > 3) {
            console.log('Using transcription:', this.userQuestion);
            resolve(this.userQuestion);
          } else {
            // Check clipboard as backup
            const clipboardText = clipboard.readText().trim();
            if (clipboardText && clipboardText.length > 3) {
              this.userQuestion = clipboardText;
              console.log('Using clipboard text:', clipboardText);
              resolve(clipboardText);
            } else {
              // Last resort fallback
              const fallback = this.getSimulatedTranscription();
              this.userQuestion = fallback;
              console.log('Using fallback transcription:', fallback);
              resolve(fallback);
            }
          }
        } catch (err) {
          console.error('Error in recording process:', err);
          this.isRecording = false;
          reject(err);
        }
      }, 500);
    });
  }

  // Start monitoring clipboard for changes during recording
  private startClipboardMonitor() {
    if (this.clipboardMonitorId) {
      clearInterval(this.clipboardMonitorId);
    }
    
    // Save initial clipboard content
    this.lastClipboardContent = clipboard.readText();
    
    // Check for clipboard changes every 1 second
    this.clipboardMonitorId = setInterval(() => {
      if (!this.isRecording) {
        this.stopClipboardMonitor();
        return;
      }
      
      const currentContent = clipboard.readText();
      if (currentContent !== this.lastClipboardContent && currentContent.trim() !== '') {
        // Update our tracking
        this.lastClipboardContent = currentContent;
        
        // Save as user question
        if (currentContent.length > 3) {
          this.userQuestion = currentContent;
          console.log('Clipboard updated with new content:', currentContent);
          
          // Update UI with clipboard content
          if (this.mainWindow) {
            this.mainWindow.webContents.send('update-transcription', currentContent);
          }
        }
      }
    }, 1000);
  }
  
  // Stop monitoring clipboard
  private stopClipboardMonitor() {
    if (this.clipboardMonitorId) {
      clearInterval(this.clipboardMonitorId);
      this.clipboardMonitorId = null;
    }
  }

  // Receive transcription from renderer process
  receiveSpeechResult(text: string): void {
    if (this.isRecording && text && text.trim().length > 0) {
      if (this.userQuestion) {
        this.userQuestion += ' ' + text;
      } else {
        this.userQuestion = text;
      }
      
      // Update UI with latest transcription
      if (this.mainWindow) {
        this.mainWindow.webContents.send('update-transcription', this.userQuestion);
      }
    }
  }

  // Allow user to manually set the question text
  setUserQuestion(question: string): void {
    if (question && question.trim().length > 0) {
      this.userQuestion = question.trim();
    }
  }

  // Get the current user question
  getUserQuestion(): string {
    return this.userQuestion;
  }

  // Get answer from Gemini for the transcribed question
  async processVoiceToAnswer(transcription: string): Promise<any> {
    console.log('Processing voice transcription with Gemini:', transcription);
    
    try {
      // Save the user question
      this.userQuestion = transcription;
      
      // Call Gemini API with the transcribed text
      const response = await analyzeProblem([], transcription);
      return response;
    } catch (error) {
      console.error('Error getting answer from Gemini:', error);
      throw error;
    }
  }

  // Check if currently recording
  isCurrentlyRecording(): boolean {
    return this.isRecording;
  }

  // Get a simulated transcription rather than using actual microphone
  private getSimulatedTranscription(): string {
    // Randomly select one of the sample questions
    const randomIndex = Math.floor(Math.random() * this.sampleInterviewQuestions.length);
    return this.sampleInterviewQuestions[randomIndex];
  }
}

// Export a singleton instance
const voiceService = new VoiceService();
export default voiceService; 