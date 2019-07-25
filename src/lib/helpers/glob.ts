import globLib from 'glob'

export const globToPromise = (glob: typeof globLib) => async (
  dir: any,
  opts: any
): Promise<string[]> => {
  return new Promise((resolve, reject) =>
    glob(dir, opts, (err, files) => {
      if (err) {
        reject(err)
      } else {
        resolve(files)
      }
    })
  )
}
