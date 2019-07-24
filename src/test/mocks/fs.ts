export default {
  createWriteStream: () => {
    // mock
  },
  ensureDir: () => {
    // mock
  },
  readFile: async () => {
    // mock
  },
  statSync: (file: { size: number }) => file
}
