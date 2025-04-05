import { app } from 'electron';
import fs from 'fs';
import path from 'path';

// Type definitions
export interface SolutionResponse {
  explanation: string;
  code: string;
  complexity: string;
  extractedText?: string;
}

/**
 * Analyze screenshots and generate coding solution
 * @param {string[]} screenshotPaths - Paths to the screenshots
 * @returns {Promise<SolutionResponse>}
 */
export async function analyzeProblem(screenshotPaths: string[]): Promise<SolutionResponse> {
  try {
    // Load screenshots as base64
    const images = await Promise.all(
      screenshotPaths.map(async (path) => {
        const buffer = fs.readFileSync(path);
        return buffer.toString('base64');
      })
    );

    // This is a mock response since we're not actually using OpenAI
    const mockContent = `
Here's how to solve this problem:

First, we analyze the pattern and determine the optimal solution.

\`\`\`javascript
function solution(arr) {
  // Step 1: Initialize variables
  let result = 0;
  
  // Step 2: Process the input
  for (let i = 0; i < arr.length; i++) {
    // Do something with arr[i]
    result += arr[i];
  }
  
  // Step 3: Return the result
  return result;
}
\`\`\`

Time Complexity: O(n)
Space Complexity: O(1)
`;
    
    // Parse the response to extract explanation, code, and complexity
    return parseResponse(mockContent);
  } catch (error) {
    console.error('Error generating solution:', error);
    throw error;
  }
}

/**
 * Parse the response to extract explanation, code, and complexity
 * @param {string} content - The response content
 * @returns {SolutionResponse}
 */
function parseResponse(content: string): SolutionResponse {
  // In a real application, you would have more sophisticated parsing
  // For now, we'll use a simple approach
  
  const codeMatch = content.match(/```(?:\w+)?\s*([\s\S]+?)```/);
  const code = codeMatch ? codeMatch[1].trim() : '';
  
  // Remove the code block for cleaner explanation text
  let explanation = content.replace(/```(?:\w+)?\s*[\s\S]+?```/, '').trim();
  
  // Try to extract complexity information
  const complexityMatch = content.match(/Time Complexity:[\s\S]+?(?=\n\n|$)/);
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