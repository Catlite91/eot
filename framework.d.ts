import * as Koa from 'koa';
export default class Framework {
    app: Koa;
    private logger;
    private scanner;
    private router;
    private container;
    constructor(configFile: string);
    readonly port: any;
    readonly coreLogger: any;
    _initCoreLogger(): void;
    beforeStart(): Promise<any>;
    afterStart(): Promise<any>;
    applyRouter(): Promise<any>;
    applyMiddleware(): Promise<any>;
    applyDubboPovider(): Promise<any>;
    run(): Promise<any>;
}
export interface IFramework {
    new (confFile: string): Framework;
}
