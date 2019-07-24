import { FileTransferStats } from '../FileTransfer'

export interface CurrentFileTransferStats {
  [key: string]: FileTransferStats
}

export interface ConcurrentFileTransferInterface {
  start: () => Promise<void[]>
  getStats: () => CurrentFileTransferStats
}
