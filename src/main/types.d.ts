declare module 'mic' {
  interface MicOptions {
    rate?: string;
    channels?: string;
    debug?: boolean;
    exitOnSilence?: number;
    fileType?: string;
    device?: string;
    endian?: string;
    bitwidth?: string;
    encoding?: string;
  }

  interface Mic {
    start: () => void;
    stop: () => void;
    pause: () => void;
    resume: () => void;
    getAudioStream: () => NodeJS.ReadableStream;
  }

  function mic(options: MicOptions): Mic;
  export = mic;
}

declare module 'node-fetch' {
  export default function fetch(url: string, options?: any): Promise<any>;
} 