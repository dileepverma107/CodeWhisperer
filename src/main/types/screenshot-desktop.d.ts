declare module 'screenshot-desktop' {
  /**
   * Takes a screenshot of the entire desktop
   * @returns A promise that resolves with the screenshot as a Buffer
   */
  function captureScreen(): Promise<Buffer>;

  export = captureScreen;
} 