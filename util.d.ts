export default class Util {
    static formatValidateParam(param: string | object): {
        result: boolean;
        method: string;
        option?: any;
    };
    static formatSanitizerParam(param: string | object): {
        method: string;
        option?: any;
    };
    private static _getResult(str);
    private static _getMethod(str);
}
export declare function makeDeferred(): {
    resolve: any;
    reject: any;
    promise: Promise<{}>;
};
