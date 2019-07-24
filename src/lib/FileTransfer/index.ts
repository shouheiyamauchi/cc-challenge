export interface FileTransferStats {
  bytesLoaded: number
  percentProgress: number
  totalSize: number
}

export interface FileTransferInterface {
  start: () => Promise<void>
  getStats: () => FileTransferStats
}
