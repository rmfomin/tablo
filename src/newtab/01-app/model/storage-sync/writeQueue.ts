type WriteQueueOptions<T> = {
  write(value: T): Promise<void>;
  onSaved(value: T): void;
  onError(error: unknown): void;
};

// Пока идёт запись, промежуточные снимки заменяются последним состоянием
export function createLatestWriteQueue<T>(options: WriteQueueOptions<T>) {
  let pending: { value: T } | undefined;
  let running: Promise<boolean> | undefined;

  async function drain(): Promise<boolean> {
    let allSaved = true;
    try {
      while (pending) {
        let current = pending;
        pending = undefined;
        let saved = false;
        let failure: unknown;
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            await options.write(current.value);
            saved = true;
            break;
          } catch (error) {
            failure = error;
            // Повторная попытка сохраняет более свежий снимок, если он уже поступил
            if (attempt === 0 && pending) {
              current = pending;
              pending = undefined;
            }
          }
        }
        if (saved) options.onSaved(current.value);
        else {
          allSaved = false;
          options.onError(failure);
        }
      }
      return allSaved;
    } finally {
      running = undefined;
    }
  }

  return {
    enqueue(value: T): Promise<boolean> {
      pending = { value };
      if (running) return running;
      let resolve!: (saved: boolean) => void;
      let reject!: (error: unknown) => void;
      const completion = new Promise<boolean>((done, fail) => { resolve = done; reject = fail; });
      // Регистрируем операцию до drain: write может выбросить синхронное исключение
      running = completion;
      void drain().then(resolve, reject);
      return completion;
    },
    wait(): Promise<boolean> { return running ?? Promise.resolve(true); },
  };
}
