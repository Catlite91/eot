export interface Aspect {
    before(data?: any): Promise<any> | any;
    after(data?: any): Promise<any> | void;
}
