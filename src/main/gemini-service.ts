import fetch from 'node-fetch';
import * as fs from 'fs';

// Type definitions
export interface SolutionResponse {
  explanation: string;
  code: string;
  complexity: string;
  extractedText?: string;
}

// Using the API key (in production, this should be in environment variables)
const API_KEY = 'AIzaSyDU7XEzuHLd7axJ0Ub2R-iqDTlz7qJEZOA';
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

/**
 * Analyze problem using Google's Gemini API
 * @param {string[]} screenshotPaths - Paths to the screenshots
 * @param {string} extractedText - Text extracted from screenshots
 * @returns {Promise<SolutionResponse>}
 */
export async function analyzeProblem(
  screenshotPaths: string[],
  extractedText?: string
): Promise<SolutionResponse> {
  try {
    const prompt = generatePrompt(extractedText || "Write a function to find the sum of an array");
    console.log("Generated prompt:", prompt);
    
    // Call the Gemini API for real responses
    const response = await callGeminiAPI(prompt);
    return parseResponse(response);
  } catch (error) {
    console.error('Error analyzing problem:', error);
    throw error;
  }
}

/**
 * Generate a prompt for the Gemini API
 * @param {string} extractedText - Text extracted from screenshots
 * @returns {string} - Formatted prompt
 */
function generatePrompt(extractedText: string): string {
  // Clean up the extracted text by removing comment markers
  let cleanedText = extractedText.replace(/\/\//g, '').trim();
  
  // Only fallback to default problem if text is definitely not usable
  if (!cleanedText || 
      cleanedText.includes('edit this text') || 
      cleanedText.includes('would appear here') || 
      cleanedText.includes('No text extracted') ||
      cleanedText.length < 10) {
    console.log('Using default problem statement due to insufficient extracted text');
    cleanedText = "Given an array of integers, find two numbers such that they add up to a specific target. Return the indices of the two numbers. You may assume that each input would have exactly one solution.";
  } else {
    console.log('Using extracted text from screenshots:', cleanedText.substring(0, 100) + '...');
  }
  
  return `
You are an expert coding assistant helping with a technical interview problem.
Please analyze the following problem and provide:
1. A clear explanation of the approach to solve it
2. An implementation of the solution in code
3. Time and space complexity analysis

Problem:
${cleanedText}

Format your response with the following sections clearly separated with headings:
- Explanation (heading: "Explanation")
- Code (in a code block using markdown triple backticks with the appropriate language specified, heading: "Code")
- Time and Space Complexity (heading: "Time and Space Complexity")

Use proper markdown formatting:
- Use **bold** for emphasis
- Use headings with # (e.g., # Explanation)
- Use \`code\` for inline code references
- Always place code in triple backtick blocks with language specified
- Use bullet points with - for lists

Use only the extracted text to solve one problem at a time. Do not attempt to solve multiple problems if they appear in the text.
`;
}

/**
 * Call the Gemini API with the prompt
 * @param {string} prompt - The prompt to send to Gemini
 * @returns {Promise<string>} - The response from Gemini
 */
async function callGeminiAPI(prompt: string): Promise<string> {
  try {
    console.log(`Calling Gemini API with URL: ${API_URL}?key=${API_KEY}`);
    
    const response = await fetch(`${API_URL}?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
      }),
    });

    const data = await response.json();
    console.log("API response:", JSON.stringify(data, null, 2));
    
    // Extract the text from the response based on Gemini 2.0 format
    if (data.candidates && data.candidates.length > 0) {
      const content = data.candidates[0].content;
      if (content && content.parts && content.parts.length > 0) {
        return content.parts[0].text;
      }
    }
    
    throw new Error('Failed to get proper response from Gemini API');
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    throw error;
  }
}

/**
 * Parse the response to extract explanation, code, and complexity
 * @param {string} content - The response content
 * @returns {SolutionResponse}
 */
function parseResponse(content: string): SolutionResponse {
  console.log("Parsing response:", content);
  
  // Extract code blocks - look for markdown code blocks
  const codeMatch = content.match(/```(?:\w+)?\s*([\s\S]+?)```/);
  const code = codeMatch ? codeMatch[1].trim() : '';
  
  // Remove the code block for cleaner explanation text
  let explanation = content.replace(/```(?:\w+)?\s*[\s\S]+?```/, '').trim();
  
  // Try to extract complexity information
  const complexityMatch = content.match(/Time (?:and|&) Space Complexity:[\s\S]+?(?=\n\n|$)/) || 
                          content.match(/Time Complexity:[\s\S]+?(?=\n\n|$)/);
  let complexity = '';
  
  if (complexityMatch) {
    complexity = complexityMatch[0].trim();
    // Also remove complexity from explanation if found
    explanation = explanation.replace(complexityMatch[0], '').trim();
  }
  
  return {
    explanation,
    code,
    complexity,
  };
} 