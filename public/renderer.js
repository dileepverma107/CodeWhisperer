// DOM Elements
const welcomeScreen = document.getElementById('welcome-screen');
const screenshotScreen = document.getElementById('screenshot-screen');
const voiceScreen = document.getElementById('voice-screen');
const solutionScreen = document.getElementById('solution-screen');
const screenshotContainer = document.getElementById('screenshot-container');
const screenshotCounter = document.getElementById('screenshot-counter');
const analyzeBtn = document.getElementById('analyze-btn');
const resetBtn = document.getElementById('reset-btn');
const loadingIndicator = document.getElementById('loading-indicator');
const solutionContainer = document.getElementById('solution-container');
const explanation = document.getElementById('explanation');
const codeSolution = document.getElementById('code-solution');
const complexity = document.getElementById('complexity');
const backBtn = document.getElementById('back-btn');
const resetSolutionBtn = document.getElementById('reset-solution-btn');
const toggleBtn = document.getElementById('toggleBtn');
const quitBtn = document.getElementById('quitBtn');
const autostartToggle = document.getElementById('autostart-toggle');
const titlebar = document.querySelector('.titlebar');

// Voice recording elements
const voiceStatus = document.getElementById('voice-status');
const voiceRecordBtn = document.getElementById('voice-record-btn');
const voiceQuestion = document.getElementById('voice-question');
const voiceAnalyzeBtn = document.getElementById('voice-analyze-btn');
const voiceResetBtn = document.getElementById('voice-reset-btn');

// Keyboard shortcuts container
const keyboardShortcutsContainer = document.querySelector('.keyboard-shortcuts');

// Application state
let screenshotPaths = [];
let extractedTextCache = [];
const MAX_SCREENSHOTS = 5; // Maximum number of screenshots allowed
let currentScreen = 'welcome';
let isDragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;
let isRecording = false;
let currentTranscription = '';

// Voice Screen - Add textarea for manual input
const voiceTranscriptionContainer = document.getElementById('voice-transcription-container');
if (voiceTranscriptionContainer) {
  // Add a manual input section
  const manualInputSection = document.createElement('div');
  manualInputSection.className = 'voice-question-section manual-input-section';
  
  const manualInputTitle = document.createElement('h3');
  manualInputTitle.textContent = 'Manual Question Input';
  
  const manualInputTextarea = document.createElement('textarea');
  manualInputTextarea.id = 'manual-question-input';
  manualInputTextarea.className = 'manual-question-textarea';
  manualInputTextarea.placeholder = 'Type or paste interview question here if voice recognition fails...';
  
  const useManualInputBtn = document.createElement('button');
  useManualInputBtn.id = 'use-manual-input-btn';
  useManualInputBtn.className = 'action-button small-button';
  useManualInputBtn.textContent = 'Use This Question';
  useManualInputBtn.addEventListener('click', () => {
    const manualText = manualInputTextarea.value.trim();
    if (manualText) {
      voiceQuestion.textContent = manualText;
      currentTranscription = manualText;
      voiceAnalyzeBtn.disabled = false;
      voiceStatus.textContent = 'Manual question set';
    }
  });
  
  manualInputSection.appendChild(manualInputTitle);
  manualInputSection.appendChild(manualInputTextarea);
  manualInputSection.appendChild(useManualInputBtn);
  
  // Insert after the voice question section but before analyze button
  voiceTranscriptionContainer.insertBefore(manualInputSection, voiceAnalyzeBtn);
}

// Add support for browser speech recognition
let speechRecognition = null;
let isListening = false;

// Function to initialize and start speech recognition
function startBrowserSpeechRecognition() {
  try {
    // Check if speech recognition is supported
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.error('Speech recognition not supported in this browser');
      voiceStatus.textContent = 'Speech recognition not supported';
      return;
    }
    
    // Stop any existing recognition 
    stopBrowserSpeechRecognition();
    
    // Create speech recognition instance
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    speechRecognition = new SpeechRecognition();
    
    // Configure for best results
    speechRecognition.continuous = true;
    speechRecognition.interimResults = true;
    speechRecognition.lang = 'en-US';
    speechRecognition.maxAlternatives = 1;

    // For debugging network issues
    console.log('Network status:', navigator.onLine ? 'Online' : 'Offline');
    
    // Set up event handlers
    speechRecognition.onstart = () => {
      console.log('Speech recognition started successfully');
      isListening = true;
      
      // Update UI to show active recording
      if (voiceStatus) {
        voiceStatus.textContent = 'Listening... Speak clearly';
        voiceStatus.classList.add('recording');
        voiceRecordBtn.classList.add('recording');
      }
    };
    
    speechRecognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';
      
      console.log('Speech recognition result received:', event.results.length, 'segments');
      
      // Process results
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        const confidence = event.results[i][0].confidence;
        
        console.log(`Segment ${i}: "${transcript}" (Confidence: ${confidence.toFixed(2)})`);
        
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
          console.log('Final transcript:', finalTranscript);
          
          // Send final result to main process
          if (finalTranscript.trim().length > 0) {
            electronAPI.sendSpeechResult(finalTranscript);
          }
        } else {
          interimTranscript += transcript;
          
          // Update local display with interim results
          if (voiceQuestion) {
            // Show interim results with different styling
            const currentText = currentTranscription || '';
            voiceQuestion.innerHTML = currentText + 
              ' <span class="interim">' + interimTranscript + '</span>';
          }
        }
      }
    };
    
    speechRecognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error, 'Details:', event);
      
      // Provide more specific error feedback based on error type
      if (event.error === 'no-speech') {
        voiceStatus.textContent = 'No speech detected. Try again or use manual input.';
      } else if (event.error === 'audio-capture') {
        voiceStatus.textContent = 'No microphone detected. Check browser permissions.';
      } else if (event.error === 'not-allowed') {
        voiceStatus.textContent = 'Microphone access denied. Check browser permissions.';
      } else if (event.error === 'network') {
        // Special handling for network errors
        voiceStatus.textContent = 'Network error. Trying to reconnect...';
        
        // Log detailed network status
        console.log('Network status on error:', navigator.onLine ? 'Online' : 'Offline');
        
        // Try to restart with a delay if we're online
        if (navigator.onLine && isRecording) {
          setTimeout(() => {
            if (isRecording) {
              console.log('Attempting to restart speech recognition after network error');
              try {
                speechRecognition.start();
              } catch (e) {
                console.error('Failed to restart after network error:', e);
                voiceStatus.textContent = 'Network connection issue. Try manual input instead.';
              }
            }
          }, 1000);
        } else {
          voiceStatus.textContent = 'Network connection issue. Try manual input instead.';
        }
      } else {
        voiceStatus.textContent = 'Speech recognition error: ' + event.error;
      }
      
      // Send error to main process
      electronAPI.sendSpeechError(event.error);
    };
    
    speechRecognition.onend = () => {
      console.log('Speech recognition ended');
      isListening = false;
      
      // Restart if we're still in recording mode
      if (isRecording && !speechRecognition.aborted) {
        console.log('Restarting speech recognition...');
        try {
          // Add small delay to avoid race conditions
          setTimeout(() => {
            if (isRecording) {
              console.log('Actually restarting now');
              speechRecognition.start();
            }
          }, 300);
        } catch (e) {
          console.error('Error restarting speech recognition:', e);
          voiceStatus.textContent = 'Error restarting. Try manual input.';
        }
      } else {
        electronAPI.sendSpeechEnd();
      }
    };
    
    // Create a network status monitor to handle offline/online transitions
    window.addEventListener('online', () => {
      console.log('Network is now online');
      if (isRecording && !isListening) {
        voiceStatus.textContent = 'Network reconnected. Restarting...';
        setTimeout(() => {
          try {
            speechRecognition.start();
          } catch (e) {
            console.error('Failed to restart after coming online:', e);
          }
        }, 1000);
      }
    });
    
    window.addEventListener('offline', () => {
      console.log('Network is now offline');
      if (isListening) {
        voiceStatus.textContent = 'Network disconnected. Speech recognition may not work.';
      }
    });
    
    // Start listening
    console.log('Starting speech recognition...');
    speechRecognition.start();
    
    // Add CSS for interim results
    const style = document.createElement('style');
    style.textContent = `
      .interim {
        color: gray;
        font-style: italic;
      }
    `;
    document.head.appendChild(style);
    
  } catch (error) {
    console.error('Error initializing speech recognition:', error);
    voiceStatus.textContent = 'Speech recognition error. Use manual input instead.';
  }
}

// Function to stop speech recognition
function stopBrowserSpeechRecognition() {
  if (speechRecognition) {
    speechRecognition.aborted = true; // Custom flag to prevent auto-restart
    try {
      speechRecognition.stop();
    } catch (error) {
      console.error('Error stopping speech recognition:', error);
    }
    isListening = false;
  }
}

// Function to update transcription from main process
function updateTranscription(text) {
  if (voiceQuestion && text) {
    voiceQuestion.textContent = text;
    currentTranscription = text;
    
    // Enable the analyze button since we have transcription
    if (voiceAnalyzeBtn) {
      voiceAnalyzeBtn.disabled = false;
    }
  }
}

// Function to update the screenshot counter
function updateScreenshotCounter() {
  if (screenshotCounter) {
    screenshotCounter.textContent = `Screenshots: ${screenshotPaths.length}/${MAX_SCREENSHOTS}`;
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  showScreen('welcome');
  
  // Register IPC handlers from preload script
  electronAPI.onScreenshotTaken(handleScreenshotTaken);
  electronAPI.onGenerateSolution(handleGenerateSolution);
  electronAPI.onResetApp(resetApp);
  electronAPI.onVoiceRecordingStarted(handleVoiceRecordingStarted);
  electronAPI.onVoiceAnswerReady(handleVoiceAnswerReady);
  electronAPI.onStartBrowserSpeechRecognition(() => startBrowserSpeechRecognition());
  electronAPI.onStopBrowserSpeechRecognition(() => stopBrowserSpeechRecognition());
  electronAPI.onUpdateTranscription((text) => updateTranscription(text));
});

function setupEventListeners() {
  // Button event listeners
  toggleBtn.addEventListener('click', toggleVisibility);
  quitBtn.addEventListener('click', quitApp);
  analyzeBtn.addEventListener('click', analyzeProblem);
  resetBtn.addEventListener('click', resetApp);
  backBtn.addEventListener('click', () => showScreen('screenshot'));
  resetSolutionBtn.addEventListener('click', resetApp);
  
  // Voice recording event listeners
  voiceRecordBtn.addEventListener('click', toggleVoiceRecording);
  voiceAnalyzeBtn.addEventListener('click', analyzeVoiceTranscription);
  voiceResetBtn.addEventListener('click', resetApp);
  
  // Manual input button
  const useManualInputBtn = document.getElementById('use-manual-input-btn');
  if (useManualInputBtn) {
    useManualInputBtn.addEventListener('click', handleManualInput);
  }
  
  // Autostart toggle
  if (autostartToggle) {
    autostartToggle.addEventListener('change', toggleAutostart);
  }
  
  // Window drag event - Allow dragging the window from the titlebar
  if (titlebar) {
    titlebar.addEventListener('mousedown', handleWindowDragStart);
    document.addEventListener('mousemove', handleWindowDragMove);
    document.addEventListener('mouseup', handleWindowDragEnd);
  }
  
  // Add screen navigation buttons to welcome screen
  const welcomeButtons = document.createElement('div');
  welcomeButtons.className = 'screen-nav-buttons';
  
  const screenshotButton = document.createElement('button');
  screenshotButton.className = 'screen-nav-button';
  screenshotButton.textContent = 'Screenshot Mode';
  screenshotButton.addEventListener('click', () => showScreen('screenshot'));
  
  const voiceButton = document.createElement('button');
  voiceButton.className = 'screen-nav-button';
  voiceButton.textContent = 'Voice Mode';
  voiceButton.addEventListener('click', () => showScreen('voice'));
  
  welcomeButtons.appendChild(screenshotButton);
  welcomeButtons.appendChild(voiceButton);
  
  // Append to welcome screen after keyboard shortcuts
  keyboardShortcutsContainer.after(welcomeButtons);
}

// Window Dragging
function handleWindowDragStart(e) {
  if (e.target.closest('.controls')) return; // Don't start drag if clicking controls
  
  isDragging = true;
  // Calculate the offset from the mouse position to the top-left corner of the window
  const rect = titlebar.getBoundingClientRect();
  dragOffsetX = e.clientX - rect.left;
  dragOffsetY = e.clientY - rect.top;
  
  // Add a dragging class for styling
  document.body.classList.add('dragging');
}

function handleWindowDragMove(e) {
  if (!isDragging) return;
  
  // Send the drag info to the main process
  electronAPI.windowDrag({ mouseX: dragOffsetX, mouseY: dragOffsetY });
}

function handleWindowDragEnd() {
  isDragging = false;
  document.body.classList.remove('dragging');
}

// Voice Recording Functions
async function toggleVoiceRecording() {
  try {
    // Check if currently recording
    const currentlyRecording = await electronAPI.isRecording();
    
    if (currentlyRecording) {
      // Stop recording
      isRecording = false;
      voiceStatus.textContent = 'Processing audio...';
      voiceStatus.classList.remove('recording');
      voiceRecordBtn.classList.remove('recording');
      voiceRecordBtn.textContent = 'Start Recording';
      
      // Stop the browser speech recognition
      stopBrowserSpeechRecognition();
      
      const transcription = await electronAPI.stopVoiceRecording();
      currentTranscription = transcription;
      
      if (transcription && transcription.trim().length > 0) {
        voiceQuestion.textContent = transcription;
        voiceStatus.textContent = 'Recording stopped - Ready to analyze';
        voiceAnalyzeBtn.disabled = false;
      } else {
        voiceStatus.textContent = 'No speech detected. Try again or use manual input.';
        voiceQuestion.textContent = '';
      }
    } else {
      // Start recording
      isRecording = true;
      currentTranscription = '';
      voiceQuestion.textContent = '';
      voiceStatus.textContent = 'Starting recording...';
      voiceRecordBtn.textContent = 'Stop Recording';
      
      await electronAPI.startVoiceRecording();
      voiceAnalyzeBtn.disabled = true;
    }
  } catch (error) {
    console.error('Error toggling voice recording:', error);
    voiceStatus.textContent = 'Error: ' + error.message;
    isRecording = false;
    voiceRecordBtn.textContent = 'Start Recording';
  }
}

// Handler for when recording starts
function handleVoiceRecordingStarted() {
  isRecording = true;
  voiceStatus.textContent = 'Listening... Speak now';
  voiceStatus.classList.add('recording');
  voiceRecordBtn.classList.add('recording');
  voiceRecordBtn.textContent = 'Stop Recording';
  voiceAnalyzeBtn.disabled = true;
}

// Handler for when transcription and answer are ready
function handleVoiceAnswerReady(transcription, answer) {
  currentTranscription = transcription;
  voiceQuestion.textContent = transcription;
  voiceStatus.textContent = 'Answer ready';
  voiceStatus.classList.remove('recording');
  voiceRecordBtn.classList.remove('recording');
  
  // Display the answer in the solution screen
  displaySolution(answer);
  showScreen('solution');
}

// Analyze the transcribed voice
async function analyzeVoiceTranscription() {
  if (!currentTranscription) return;
  
  voiceStatus.textContent = 'Getting answer...';
  loadingIndicator.classList.remove('hidden');
  solutionContainer.classList.add('hidden');
  showScreen('solution');
  
  try {
    const answer = await electronAPI.processVoiceToAnswer(currentTranscription);
    displaySolution(answer);
  } catch (error) {
    console.error('Error getting answer:', error);
    explanation.textContent = 'Error generating solution. Please try again.';
    codeSolution.innerHTML = `<code>// Error: ${error.message}</code>`;
    complexity.textContent = '';
  } finally {
    loadingIndicator.classList.add('hidden');
    solutionContainer.classList.remove('hidden');
  }
}

// IPC Handlers
function handleScreenshotTaken(screenshotPath, extractedText) {
  console.log('Screenshot taken:', screenshotPath);
  console.log('Extracted text:', extractedText);
  
  screenshotPaths.push(screenshotPath);
  extractedTextCache.push(extractedText || '');
  
  addScreenshotToDisplay(screenshotPath, extractedText);
  showScreen('screenshot');
}

async function handleGenerateSolution(paths, extractedTexts) {
  console.log('Generating solution for paths:', paths);
  console.log('With extracted texts:', extractedTexts);
  
  showScreen('solution');
  
  loadingIndicator.classList.remove('hidden');
  solutionContainer.classList.add('hidden');
  
  try {
    // Get text from all screenshot containers (editable textareas)
    const manuallyEditedText = getExtractedText();
    console.log('Manually edited text:', manuallyEditedText);
    
    // Use the manually edited text if available, otherwise use the OCR extracted text
    const finalText = manuallyEditedText || extractedTexts.join('\n\n');
    
    console.log('Submitting for analysis:', finalText);
    
    // Call the main process to analyze the problem - pass all paths at once
    const solution = await electronAPI.analyzeProblem(paths, finalText);
    
    // Check if we received a valid solution
    if (!solution || !solution.explanation || !solution.code) {
      throw new Error('Received invalid solution from analysis');
    }
    
    console.log('Analysis complete, displaying solution');
    displaySolution(solution);
  } catch (error) {
    console.error('Error generating solution:', error);
    // Show error message
    explanation.textContent = 'Error generating solution. Please try again.';
    codeSolution.innerHTML = `<code>// Error: ${error.message}</code>`;
    complexity.textContent = '';
  } finally {
    loadingIndicator.classList.add('hidden');
    solutionContainer.classList.remove('hidden');
  }
}

// Helper Functions
function getExtractedText() {
  const textElements = screenshotContainer.querySelectorAll('.screenshot-text');
  let extractedText = '';
  textElements.forEach(element => {
    if (element.value && element.value.trim() !== '') {
      extractedText += element.value + '\n\n';
    }
  });
  return extractedText.trim();
}

function addScreenshotToDisplay(screenshotPath, extractedText) {
  // Check if we've reached the maximum number of screenshots
  if (screenshotPaths.length >= MAX_SCREENSHOTS) {
    // Remove the oldest screenshot (first one)
    if (screenshotContainer.firstChild) {
      screenshotContainer.removeChild(screenshotContainer.firstChild);
    }
    // Remove the oldest path and text from arrays
    screenshotPaths.shift();
    extractedTextCache.shift();
  }

  // Create screenshot container
  const container = document.createElement('div');
  container.className = 'screenshot-item';
  
  // Add screenshot image
  const img = document.createElement('img');
  img.src = `file://${screenshotPath}`;
  img.className = 'screenshot-img';
  container.appendChild(img);
  
  // Add editable text area
  const textarea = document.createElement('textarea');
  textarea.className = 'screenshot-text';
  textarea.placeholder = 'Extracted text will appear here. You can edit it if needed.';
  
  // Use the extracted text if available, otherwise use a placeholder
  if (extractedText && extractedText.trim() !== '') {
    textarea.value = extractedText;
  } else {
    textarea.value = "No text extracted. Please type the coding problem here.";
  }
  
  container.appendChild(textarea);
  
  // Add screenshot container to the display
  screenshotContainer.appendChild(container);
  
  // Update screenshot counter
  updateScreenshotCounter();
  
  // Update analyze button state
  analyzeBtn.disabled = false;
}

function displaySolution(solution) {
  console.log('Displaying solution:', solution);
  
  // Display explanation
  explanation.innerHTML = formatExplanation(solution.explanation);
  
  // Detect language from code (default to javascript)
  const language = detectLanguage(solution.code);
  
  // Display code with syntax highlighting
  codeSolution.innerHTML = `<code class="language-${language}">${escapeHTML(solution.code)}</code>`;
  codeSolution.className = `code-solution line-numbers language-${language}`;
  
  // Add copy button to code solution
  addCopyButton(codeSolution, solution.code);
  
  // Display complexity
  complexity.innerHTML = formatComplexity(solution.complexity);
  
  // Apply syntax highlighting
  if (window.Prism) {
    Prism.highlightAll();
    
    // Ensure our custom styling is applied after Prism initializes
    setTimeout(() => {
      // Force custom background color on all code elements
      document.querySelectorAll('#code-solution, #code-solution code, .line-numbers-rows').forEach(el => {
        el.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        if (el.tagName.toLowerCase() === 'code') {
          el.style.color = 'rgba(255, 255, 255, 0.95)';
        }
      });
    }, 100);
  }
}

// Add copy button to a code block element
function addCopyButton(codeBlock, codeText) {
  // Remove existing copy button if there is one
  const existingButton = codeBlock.querySelector('.copy-btn');
  if (existingButton) {
    existingButton.remove();
  }
  
  // Create copy button
  const copyButton = document.createElement('button');
  copyButton.className = 'copy-btn';
  copyButton.textContent = 'Copy';
  
  // Add click event listener
  copyButton.addEventListener('click', () => {
    // Copy the code to clipboard
    navigator.clipboard.writeText(codeText).then(() => {
      // Change button text temporarily
      copyButton.textContent = 'Copied!';
      setTimeout(() => {
        copyButton.textContent = 'Copy';
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy text: ', err);
      copyButton.textContent = 'Error';
      setTimeout(() => {
        copyButton.textContent = 'Copy';
      }, 2000);
    });
  });
  
  // Append button to code block
  codeBlock.appendChild(copyButton);
}

function detectLanguage(code) {
  // Auto-detect language from code
  if (code.includes('def ') && code.includes('return ')) return 'python';
  if (code.includes('function ') && code.includes('return ')) return 'javascript';
  if (code.includes('public class ') || code.includes('private ')) return 'java';
  if (code.includes('#include') || code.includes('int main(')) return 'cpp';
  if (code.includes('package ') && code.includes('import ')) return 'go';
  
  // Default to JavaScript
  return 'javascript';
}

function formatExplanation(text) {
  // Convert markdown-style formatting
  
  // Replace **bold** text
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  
  // Replace *italic* text
  text = text.replace(/\*([^\*]+?)\*/g, '<em>$1</em>');
  
  // Replace markdown-style headers
  text = text.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  text = text.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  text = text.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  
  // Replace markdown lists
  text = text.replace(/^- (.+)$/gm, '<li>$1</li>');
  text = text.replace(/^([0-9]+)\. (.+)$/gm, '<li>$1. $2</li>');
  
  // Replace inline code
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // Convert line breaks to paragraphs
  return text.split('\n\n')
    .filter(paragraph => paragraph.trim() !== '')
    .map(paragraph => `<p>${paragraph}</p>`)
    .join('');
}

function formatComplexity(text) {
  // Apply same markdown formatting as in formatExplanation
  
  // Replace **bold** text
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  
  // Replace *italic* text
  text = text.replace(/\*([^\*]+?)\*/g, '<em>$1</em>');
  
  // Replace inline code
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // Convert newlines to breaks for maintaining format
  text = text.replace(/\n/g, '<br>');
  
  return text;
}

function escapeHTML(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function showScreen(screenName) {
  currentScreen = screenName;
  
  // Hide all screens
  welcomeScreen.classList.add('hidden');
  screenshotScreen.classList.add('hidden');
  voiceScreen.classList.add('hidden');
  solutionScreen.classList.add('hidden');
  
  // Show the selected screen
  switch (screenName) {
    case 'welcome':
      welcomeScreen.classList.remove('hidden');
      break;
    case 'screenshot':
      screenshotScreen.classList.remove('hidden');
      break;
    case 'voice':
      voiceScreen.classList.remove('hidden');
      break;
    case 'solution':
      solutionScreen.classList.remove('hidden');
      break;
  }
  
  // Update nav buttons if they exist
  const navButtons = document.querySelectorAll('.screen-nav-button');
  if (navButtons.length) {
    navButtons.forEach(button => {
      if (button.textContent.toLowerCase().includes(screenName)) {
        button.classList.add('active');
      } else {
        button.classList.remove('active');
      }
    });
  }
}

function resetApp() {
  // Delete screenshots from disk
  if (screenshotPaths.length > 0) {
    console.log('Deleting screenshots from disk...');
    electronAPI.deleteScreenshots(screenshotPaths)
      .then(() => console.log('Screenshots deleted successfully'))
      .catch(err => console.error('Error deleting screenshots:', err));
  }
  
  // Clear screenshots
  screenshotPaths = [];
  extractedTextCache = [];
  screenshotContainer.innerHTML = '';
  
  // Reset screenshot counter
  updateScreenshotCounter();
  
  // Clear voice transcription
  isRecording = false;
  currentTranscription = '';
  if (voiceQuestion) {
    voiceQuestion.textContent = '';
    voiceQuestion.innerHTML = '';
  }
  if (voiceStatus) voiceStatus.textContent = 'Ready to record';
  if (voiceStatus) voiceStatus.classList.remove('recording');
  if (voiceRecordBtn) voiceRecordBtn.classList.remove('recording');
  if (voiceRecordBtn) voiceRecordBtn.textContent = 'Start Recording';
  if (voiceAnalyzeBtn) voiceAnalyzeBtn.disabled = true;
  
  // Stop any active speech recognition
  stopBrowserSpeechRecognition();
  
  // Clear solution
  explanation.textContent = '';
  codeSolution.innerHTML = '';
  complexity.textContent = '';
  
  // Disable analyze button
  analyzeBtn.disabled = true;
  
  // Show welcome screen
  showScreen('welcome');
}

// Window Controls
function toggleVisibility() {
  electronAPI.toggleVisibility();
}

function quitApp() {
  electronAPI.quitApp();
}

function toggleAutostart(event) {
  // In a real app, you would call the main process to toggle autostart
  console.log('Toggle autostart:', event.target.checked);
}

// Stub for the analyzeProblem function
function analyzeProblem() {
  if (screenshotPaths.length > 0) {
    handleGenerateSolution(screenshotPaths, extractedTextCache);
  }
}

// Handle manual input from textarea
function handleManualInput() {
  const manualInput = document.getElementById('manual-question-input');
  if (!manualInput) return;
  
  const text = manualInput.value.trim();
  if (text.length > 0) {
    // Update the transcription
    currentTranscription = text;
    voiceQuestion.textContent = text;
    
    // Update status and enable analyze button
    voiceStatus.textContent = 'Manual input received';
    voiceAnalyzeBtn.disabled = false;
    
    // If currently recording, stop it
    if (isRecording) {
      isRecording = false;
      voiceStatus.classList.remove('recording');
      voiceRecordBtn.classList.remove('recording');
      voiceRecordBtn.textContent = 'Start Recording';
      stopBrowserSpeechRecognition();
      
      // Notify main process
      electronAPI.stopVoiceRecording().catch(err => {
        console.error('Error stopping recording:', err);
      });
    }
    
    // Optional: clear the textarea
    manualInput.value = '';
  }
}

// Add CSS for new elements
const style = document.createElement('style');
style.textContent = `
  .manual-input-section {
    margin-top: 15px;
  }
  
  .manual-question-textarea {
    width: 100%;
    min-height: 80px;
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
    font-size: 14px;
    padding: 10px;
    margin: 10px 0;
    background-color: rgba(0, 0, 0, 0.1);
    border: 1px solid var(--section-border);
    border-radius: 4px;
    color: var(--text-color);
    resize: vertical;
  }
  
  .small-button {
    padding: 5px 10px;
    font-size: 12px;
  }
`;
document.head.appendChild(style); 