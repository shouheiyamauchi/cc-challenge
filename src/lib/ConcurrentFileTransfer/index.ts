export interface ConcurrentFileTransferInterface {
  start: () => Promise<void[]>
  getStats: () => {}
}
