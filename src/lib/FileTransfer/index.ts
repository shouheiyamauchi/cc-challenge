export interface FileTransferInterface {
  start: () => Promise<void>
  getStats: () => {
    bytesLoaded: number
    percentProgress: number
    totalSize: number
  }
}
