"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const eot_core_1 = require("eot-core");
const cluster = require("cluster");
const os = require("os");
const node_cluster_client_1 = require("node-cluster-client");
const DEFAULT_CONFIG_PATH = path.resolve(__dirname, '.', 'conf.json');
const DEFAULT_CONFIG = require(DEFAULT_CONFIG_PATH);
class Bootstrap {
    constructor(configFile) {
        const config = Object.assign({}, DEFAULT_CONFIG, require(configFile));
        config.__dirname = path.dirname(configFile);
        this.scanner = new eot_core_1.Scanner(config);
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            if (cluster.isMaster) {
                node_cluster_client_1.default.initMaster();
                const forkNum = os.cpus().length <= 3 ? 3 : os.cpus().length;
                for (let i = 0; i < forkNum; i++) {
                    cluster.fork();
                }
            }
            else {
                yield node_cluster_client_1.default.initWorker();
                yield this.scanner.run();
            }
        });
    }
}
exports.default = Bootstrap;
