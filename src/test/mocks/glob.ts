export default () => {
  const callbacks: {
    [key: string]: (error: any, files: string[]) => void
  } = {}

  const mockGlob = (
    path: string,
    _: any,
    fn: (error: any, files: string[]) => void
  ) => {
    callbacks[path] = fn
  }

  const emitCallback = (path: string, files: string[]) => {
    callbacks[path](undefined, files)
  }

  return {
    emitCallback,
    mockGlob
  }
}
