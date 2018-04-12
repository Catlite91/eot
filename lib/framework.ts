/* tslint:disable */
import * as path from 'path'
import * as Koa from 'koa'
import * as Router from 'koa-router'
import * as _ from 'lodash'
import * as bodyParser from 'koa-bodyparser'
import * as moment from 'moment'
import container from './container'
import { Scanner } from 'eot-core'
import { METADATA, COMPONENT } from './constant'
import {
  ControllerMetadata,
  ControllerMethodMetadata,
  ControllerParameterMetadata,
  MiddlewareMetadata
} from './interface/metadata'
// import {
//   init,
//   initProvider
// } from './dubbo'
import * as winston from 'winston'
const DEFAULT_CONFIG_PATH: string = path.resolve(__dirname, '.', 'conf.json')
const DEFAULT_CONFIG: any = require(DEFAULT_CONFIG_PATH)
const CURRENT_ENV = process.env.NODE_ENV || 'local'

export default class Framework {
  public app: Koa = new Koa()
  private logger: winston.LoggerInstance
  private scanner: Scanner
  private router: Router = new Router()
  private container = container

  constructor(configFile: string) {
    const config = Object.assign({}, DEFAULT_CONFIG, require(configFile))
    config.__dirname = path.dirname(configFile)
    this._initCoreLogger()
    this.scanner = new Scanner(config)
  }

  get port() {
    return container.get('Framework', COMPONENT.CONFIG, CURRENT_ENV)['port']
  }

  get coreLogger() {
    return this.logger
  }

  _initCoreLogger() {
    if (this.logger) {
      return
    }
    const logger = new winston.Logger({
      level: 'silly',
      transports: [
        new winston.transports.Console({
          colorize: true,
          prettyPrint: true,
          timestamp: () => moment().format("YYYY-MM-DD HH:mm:ss,SSS")
        })
      ]
    })
    this.logger = logger
    container.bindConstantValue(this.logger, METADATA.LOGGER, METADATA.LOGGER)
  }
  async beforeStart(): Promise<any> { }

  async afterStart(): Promise<any> { }

  async applyRouter(): Promise<any> {
    const controllers = this.container.getAll(COMPONENT.CONTROLLER)
    controllers.forEach(controller => {
      const controllerMetadata: ControllerMetadata = Reflect.getMetadata(METADATA.CONTROLLER, controller.constructor)
      const methodMetadataArray: Array<ControllerMethodMetadata> = Reflect.getMetadata(METADATA.CONTROLLER_METHOD, controller)
      const parameterMetadataArray: Array<ControllerParameterMetadata> = Reflect.getMetadata(METADATA.CONTROLLER_PARAMETER, controller)
      const { prefix } = controllerMetadata
      methodMetadataArray.forEach(methodMetadata => {
        const { method, path: path2, key } = methodMetadata
        const args = _.filter(parameterMetadataArray, item => item.key === key)
        const route = path.resolve(`/${prefix}/${path2}`)
        this.router[method](route, controller[key].bind(controller, ...args))
      })
    })

    this.app
      .use(bodyParser())
      .use(this.router.routes())
      .use(this.router.allowedMethods())
  }

  // order? 如何知道自己应该是什么顺序, 可以利用toposort
  async applyMiddleware(): Promise<any> {
    const middlewares = this.container.getAll(COMPONENT.MIDDLEWARE) || []
    const applyMiddlewares = middlewares.sort((a, b) => {
      const _a: MiddlewareMetadata = Reflect.getMetadata(COMPONENT.MIDDLEWARE, a.constructor)
      const _b: MiddlewareMetadata = Reflect.getMetadata(COMPONENT.MIDDLEWARE, b.constructor)
      return _a.order > _b.order ? 1 : -1
    })

    for (const middleware of applyMiddlewares) {
      await middleware['init'].apply(middleware)
      this.app.use(middleware['doFilter'].bind(middleware))
    }
  }

  async applyDubboPovider(): Promise<any> {
    this.logger.info('[framework:dubbo] start init dubbo')
    const start = Date.now()
    // await init()
    this.logger.info(`[framework:dubbo] init dubbo ${Date.now() - start}ms`)
    // await initProvider()
    this.logger.info('[framework:dubbo] init dubbo succesfully')
  }

  async run(): Promise<any> {
    await this.beforeStart()
    // await this.applyDubboPovider()
    await this.applyMiddleware()
    await this.applyRouter()
    await this.app.listen(this.port)
    await this.afterStart()
  }

}
export interface IFramework {
  new (confFile: string): Framework
}
