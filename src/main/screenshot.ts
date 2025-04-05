import screenshot from 'screenshot-desktop';
import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';
import Tesseract from 'tesseract.js';

/**
 * Takes a screenshot and saves it to a temporary directory
 * @returns Promise<string> The path to the saved screenshot
 */
export async function captureScreenshot(): Promise<string> {
  try {
    // Create a temporary directory for screenshots if it doesn't exist
    const tempDir = path.join(app.getPath('temp'), 'interview-coder');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Take screenshot using screenshot-desktop
    const imgBuffer = await screenshot();
    
    // Create a unique filename based on timestamp
    const fileName = `screenshot-${Date.now()}.png`;
    const filePath = path.join(tempDir, fileName);
    
    // Save the screenshot to disk
    fs.writeFileSync(filePath, imgBuffer);
    
    return filePath;
  } catch (error) {
    console.error('Error capturing screenshot:', error);
    throw new Error(`Failed to capture screenshot: ${(error as Error).message}`);
  }
}

/**
 * Extract text from a screenshot using OCR
 * @param imagePath Path to the screenshot image
 * @returns Promise<string> The extracted text
 */
export async function extractTextFromImage(imagePath: string): Promise<string> {
  try {
    console.log('Extracting text from image:', imagePath);
    
    // Use Tesseract OCR to extract text
    const result = await Tesseract.recognize(imagePath, 'eng');
    
    console.log('OCR extraction complete');
    return result.data.text;
  } catch (error) {
    console.error('Error extracting text from image:', error);
    throw new Error(`Failed to extract text: ${(error as Error).message}`);
  }
}

/**
 * Delete all screenshots from the temporary directory
 * @param screenshotPaths Optional array of specific paths to delete. If not provided, deletes all screenshots.
 * @returns Promise<void>
 */
export async function deleteAllScreenshots(screenshotPaths?: string[]): Promise<void> {
  try {
    if (screenshotPaths && screenshotPaths.length > 0) {
      // Delete specific screenshots
      console.log(`Deleting ${screenshotPaths.length} screenshots...`);
      for (const filePath of screenshotPaths) {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`Deleted: ${filePath}`);
        }
      }
    } else {
      // Delete all screenshots in the temp directory
      const tempDir = path.join(app.getPath('temp'), 'interview-coder');
      if (fs.existsSync(tempDir)) {
        const files = fs.readdirSync(tempDir);
        const screenshotFiles = files.filter(file => file.startsWith('screenshot-') && file.endsWith('.png'));
        
        console.log(`Deleting ${screenshotFiles.length} screenshots from ${tempDir}...`);
        
        for (const file of screenshotFiles) {
          const filePath = path.join(tempDir, file);
          fs.unlinkSync(filePath);
          console.log(`Deleted: ${filePath}`);
        }
      }
    }
  } catch (error) {
    console.error('Error deleting screenshots:', error);
    throw new Error(`Failed to delete screenshots: ${(error as Error).message}`);
  }
} 