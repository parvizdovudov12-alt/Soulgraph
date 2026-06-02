declare global {
  namespace Express {
    interface Request {
      session: {
        userId?: string;
        destroy: (callback: (err?: Error) => void) => void;
      };
    }
  }
}

export {};
