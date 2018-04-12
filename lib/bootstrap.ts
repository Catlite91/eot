import * as path from 'path'
import { Scanner } from 'eot-core'
import container from './container'
import { METADATA, COMPONENT, CLUSTER } from './constant'
import * as cluster from 'cluster'
import * as os from 'os'
import ClusterClient from 'node-cluster-client'

const DEFAULT_CONFIG_PATH: string = path.resolve(__dirname, '.', 'conf.json')
const DEFAULT_CONFIG: any = require(DEFAULT_CONFIG_PATH)

export default class Bootstrap {
  private scanner: Scanner

  constructor(configFile: string) {
    const config = Object.assign({}, DEFAULT_CONFIG, require(configFile))
    config.__dirname = path.dirname(configFile)
    this.scanner = new Scanner(config)
  }

  async start() {
    if (cluster.isMaster) {
      ClusterClient.initMaster()
      const forkNum = os.cpus().length <= 3 ? 3 : os.cpus().length
      for (let i = 0; i < forkNum; i++) {
        cluster.fork()
      }
    } else {
      await ClusterClient.initWorker()
      await this.scanner.run()
    }
  }
}
