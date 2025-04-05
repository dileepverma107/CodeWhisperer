import { app, BrowserWindow, ipcMain, globalShortcut, dialog, screen } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { analyzeProblem } from './gemini-service';
import { captureScreenshot, extractTextFromImage, deleteAllScreenshots } from './screenshot';
import voiceService from './voice-service';

let mainWindow: BrowserWindow | null = null;
const screenshotCache: string[] = [];
const extractedTextCache: string[] = [];

function createWindow() {
  // Get screen dimensions
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    // Hide from taskbar and Alt+Tab
    skipTaskbar: true,
    // Remove frame for a cleaner look
    frame: false,
    // Make window transparent
    transparent: true,
    // Allow resizing
    resizable: true,
    // Keep on top of other windows
    alwaysOnTop: true,
    // Set opacity (90% opacity = 10% transparency)
    opacity: 0.9,
    // Start in the bottom right corner by default
    x: width - 820,
    y: height - 620,
    // Hide window from screen capture APIs
    type: 'toolbar',
    // Hide window from screenshots and screen shares
    focusable: true,
    // Enhanced stealth settings
    titleBarStyle: 'hidden',
    hasShadow: false,
    fullscreenable: false,
    roundedCorners: false,
    autoHideMenuBar: true
  });

  // Load the index.html of the app
  mainWindow.loadFile(path.join(__dirname, '../../public/index.html'));

  // Hide the window from screen recording
  if (process.platform === 'darwin') {
    // On macOS
    mainWindow.setWindowButtonVisibility(false);
  } else if (process.platform === 'win32') {
    // On Windows, extra steps to hide from screen sharing
    mainWindow.setVisibleOnAllWorkspaces(false, { visibleOnFullScreen: false });
    mainWindow.setSkipTaskbar(true);
  }
  
  // Enhanced stealth: Set exclusion from screen capture on supported platforms
  try {
    if (process.platform === 'darwin') {
      mainWindow.setContentProtection(true);
    }
  } catch (error) {
    console.error('Error setting content protection:', error);
  }
  
  // Make the window non-focusable when clicking outside
  mainWindow.setAlwaysOnTop(true, 'screen-saver');
  
  // Set main window reference in voice service
  voiceService.setMainWindow(mainWindow);
  
  // Create keyboard shortcuts
  setupShortcuts();
  setupIPCHandlers();
  
  // Make the window movable by dragging
  setupWindowDrag();
}

// Set up window drag functionality
function setupWindowDrag() {
  ipcMain.on('window-drag', (_, { mouseX, mouseY }) => {
    if (!mainWindow) return;
    
    const { x, y } = screen.getCursorScreenPoint();
    mainWindow.setPosition(x - mouseX, y - mouseY);
  });
}

// Set up global keyboard shortcuts
function setupShortcuts() {
  // Toggle visibility
  globalShortcut.register('CommandOrControl+B', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
      }
    }
  });

  // Take screenshot
  globalShortcut.register('CommandOrControl+H', async () => {
    try {
      // Check if the window is visible (to hide it during screenshot)
      const wasVisible = mainWindow?.isVisible() || false;
      
      // Temporarily hide the window to take a clean screenshot
      if (wasVisible) mainWindow?.hide();
      
      // Wait a moment for the window to disappear
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Take the screenshot
      const screenshotPath = await captureScreenshot();
      
      // Show the window again
      if (wasVisible) mainWindow?.show();
      
      // Try to extract text from the screenshot
      try {
        const extractedText = await extractTextFromImage(screenshotPath);
        console.log('Extracted text from screenshot:', extractedText);
        extractedTextCache.push(extractedText);
        
        // Add screenshot to cache and notify renderer
        screenshotCache.push(screenshotPath);
        mainWindow?.webContents.send('screenshot-taken', screenshotPath, extractedText);
      } catch (error) {
        console.error('OCR extraction error:', error);
        // Still add the screenshot even if text extraction fails
        screenshotCache.push(screenshotPath);
        mainWindow?.webContents.send('screenshot-taken', screenshotPath, '');
      }
    } catch (error) {
      console.error('Error taking screenshot:', error);
    }
  });

  // Voice recording shortcut
  globalShortcut.register('CommandOrControl+V', async () => {
    try {
      // Check if already recording
      if (voiceService.isCurrentlyRecording()) {
        // Stop recording and get transcription
        const transcription = await voiceService.stopRecordingAndTranscribe();
        console.log('Voice recording stopped with transcription:', transcription);
        
        // Process with Gemini and send result to renderer
        const answer = await voiceService.processVoiceToAnswer(transcription);
        mainWindow?.webContents.send('voice-answer-ready', transcription, answer);
      } else {
        // Start recording
        voiceService.startRecording();
        mainWindow?.webContents.send('voice-recording-started');
      }
    } catch (error) {
      console.error('Error with voice recording shortcut:', error);
    }
  });

  // Generate solution
  globalShortcut.register('CommandOrControl+Enter', () => {
    if (screenshotCache.length > 0 && mainWindow) {
      mainWindow.webContents.send('generate-solution', screenshotCache, extractedTextCache);
    }
  });

  // Reset app
  globalShortcut.register('CommandOrControl+R', () => {
    if (mainWindow) {
      mainWindow.webContents.send('reset-app');
      // Delete all screenshots from disk when app is reset
      if (screenshotCache.length > 0) {
        deleteAllScreenshots(screenshotCache)
          .then(() => console.log('All screenshots deleted successfully'))
          .catch(err => console.error('Error deleting screenshots:', err));
      }
      // Clear cache arrays
      screenshotCache.length = 0;
      extractedTextCache.length = 0;
    }
  });
  
  // Move window with arrow keys
  globalShortcut.register('CommandOrControl+Up', () => {
    moveWindow(0, -20);
  });
  
  globalShortcut.register('CommandOrControl+Down', () => {
    moveWindow(0, 20);
  });
  
  globalShortcut.register('CommandOrControl+Left', () => {
    moveWindow(-20, 0);
  });
  
  globalShortcut.register('CommandOrControl+Right', () => {
    moveWindow(20, 0);
  });
}

// Helper function to move the window
function moveWindow(deltaX: number, deltaY: number) {
  if (!mainWindow) return;
  
  const [x, y] = mainWindow.getPosition();
  mainWindow.setPosition(x + deltaX, y + deltaY);
}

// Set up IPC handlers
function setupIPCHandlers() {
  // Window control handlers
  ipcMain.handle('minimize-window', () => {
    mainWindow?.minimize();
  });

  ipcMain.handle('toggle-visibility', () => {
    if (mainWindow?.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow?.show();
    }
  });

  ipcMain.handle('quit-app', () => {
    app.quit();
  });

  // Screenshot and solution handlers
  ipcMain.handle('get-screenshots', () => {
    return screenshotCache;
  });

  ipcMain.handle('delete-screenshots', async (_, screenshotPaths?: string[]) => {
    try {
      // If no paths are provided, use the cached screenshots
      const pathsToDelete = screenshotPaths || [...screenshotCache];
      
      if (pathsToDelete.length > 0) {
        console.log(`Deleting ${pathsToDelete.length} screenshots`);
        await deleteAllScreenshots(pathsToDelete);
        
        // If we're deleting the cached screenshots, clear the cache
        if (!screenshotPaths) {
          screenshotCache.length = 0;
          extractedTextCache.length = 0;
        }
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting screenshots:', error);
      throw error;
    }
  });

  ipcMain.handle('analyze-problem', async (_, screenshotPaths: string[], extractedText?: string) => {
    try {
      console.log("Analyzing problem with extracted text:", extractedText);
      
      // If extractedText is not provided, use the cached text if available
      if (!extractedText && extractedTextCache.length > 0) {
        extractedText = extractedTextCache.join('\n\n');
        console.log("Using cached extracted text:", extractedText);
      }
      
      return await analyzeProblem(screenshotPaths, extractedText);
    } catch (error) {
      console.error('Error analyzing problem:', error);
      throw error;
    }
  });

  // Voice recording handlers
  ipcMain.handle('start-voice-recording', () => {
    voiceService.startRecording();
    return true;
  });

  ipcMain.handle('stop-voice-recording', async () => {
    try {
      const transcription = await voiceService.stopRecordingAndTranscribe();
      return transcription;
    } catch (error) {
      console.error('Error stopping voice recording:', error);
      throw error;
    }
  });

  ipcMain.handle('process-voice-to-answer', async (_, transcription: string) => {
    try {
      return await voiceService.processVoiceToAnswer(transcription);
    } catch (error) {
      console.error('Error processing voice to answer:', error);
      throw error;
    }
  });

  ipcMain.handle('is-recording', () => {
    return voiceService.isCurrentlyRecording();
  });
  
  // Speech recognition IPC handlers
  ipcMain.on('speech-recognition-result', (_event, text) => {
    voiceService.receiveSpeechResult(text);
  });
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Clean up shortcuts when app is about to quit
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
 