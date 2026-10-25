import { createLatestWriteQueue } from "@/newtab/01-app/model/storage-sync/writeQueue";

test("a synchronous write failure does not block later writes", async () => {
  const failure = new Error("Storage context invalidated");
  const write = vi.fn<(value: string) => Promise<void>>()
    .mockImplementationOnce(() => { throw failure; })
    .mockImplementationOnce(() => { throw failure; })
    .mockResolvedValue(undefined);
  const onSaved = vi.fn();
  const onError = vi.fn();
  const queue = createLatestWriteQueue({ write, onSaved, onError });

  await expect(queue.enqueue("first")).resolves.toBe(false);
  expect(write).toHaveBeenCalledTimes(2);
  expect(onError).toHaveBeenCalledExactlyOnceWith(failure);
  expect(onSaved).not.toHaveBeenCalled();
  await expect(queue.enqueue("second")).resolves.toBe(true);
  expect(write).toHaveBeenCalledTimes(3);
  expect(onSaved).toHaveBeenCalledExactlyOnceWith("second");
});
