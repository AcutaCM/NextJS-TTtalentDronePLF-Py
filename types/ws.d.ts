declare module 'ws' {
  export class WebSocket {
    constructor(url: string);
    on(event: 'open', listener: () => void): void;
    on(event: 'message', listener: (data: any) => void): void;
    on(event: 'error', listener: (err: Error) => void): void;
    on(event: 'close', listener: () => void): void;
    send(data: string | Buffer): void;
    close(): void;
  }
}