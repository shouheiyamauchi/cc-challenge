import fs from 'fs-extra'

import { start } from './commands'

const hello = async () => {
  console.log(await fs.pathExists('./downloads/yes'))
  console.log(await fs.pathExists('./downloads/www.breakinotes.com'))
}

// hello()

start()
