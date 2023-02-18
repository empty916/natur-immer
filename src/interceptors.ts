import { GenMapsType, Interceptor, Maps, State } from "natur";

import produce from "immer";

export type AnyFun = (...arg: any) => any;

export class StateContainer {
  state: State = null;
  constructor(state: State) {
    this.state = state;
  }
}

export type WithImmerAPI<S = any, M extends Maps = any> = {
  getState: () => S;
  setState: (s: Partial<S> | ((s: S) => any)) => S;
  getMaps: () => GenMapsType<M, S>;
  localDispatch: (actionName: string, ...params: any) => any;
};

export type WIA<S = any, M extends Maps = any> = WithImmerAPI<S, M>;

export const withImmerAPIInterceptor: Interceptor<any> =
  (api) => (next) => (record: any) => {
    const { getMaps, getState, dispatch } = api;
    if (record.actionFunc?.meta?.withAPI) {
      const localDispatch = (action: string, ...arg: any[]) => {
        return dispatch(record.moduleName, action, ...arg);
      };
      const setState = (s: State | ((s: State) => any)) => {
        if (typeof s === "function") {
          return next({
            ...record,
            actionArgs: [new StateContainer(produce(s)(getState()))],
          });
        }
        return next({
          ...record,
          actionArgs: [new StateContainer(s)],
        });
      };
      return next({
        ...record,
        actionArgs: [
          ...record.actionArgs,
          {
            getMaps,
            getState,
            setState,
            localDispatch,
          },
        ],
      });
    }
    return next(record);
  };


export type ExcludeWIA<F extends AnyFun, A = Parameters<F>> = A;

type NumberToArray<
    T extends number,
    V extends any[] = []
> = V["length"] extends T ? V : NumberToArray<T, [...V, 1]>;

type Plus<T extends number, S extends number> = Extract<[
    ...NumberToArray<T>,
    ...NumberToArray<S>
]["length"], number>;

export type PickNumParams<
    F extends AnyFun,
    N extends number,
    I extends number = 0,
    R extends any[] = []
> = I extends N ? Parameters<F>[I] : [...R, Parameters<F>[I], PickNumParams<F, N, Plus<I, 1>, [...R, Parameters<F>[I]]>]

export type GenFn<
    N extends number,
    F extends (...arg: any) => any = () => any
> = [...Parameters<F>, WIA]['length'] extends N ? (...args: [...Parameters<F>, WIA]) => any : GenFn<N, (...arg: [...Parameters<F>, any]) => any>;


function withImmerAPI<F extends (A: WIA) => any>
    (fn: F): () => ReturnType<F>;
function withImmerAPI<F extends (a: any, A: WIA) => any>
    (fn: F): (...arg: [PickNumParams<F, 0>]) => ReturnType<F>;
function withImmerAPI<F extends (a: any, a2: any, A: WIA) => any>
    (fn: F): (...arg: PickNumParams<F, 1>) => ReturnType<F>;
function withImmerAPI<F extends (a: any, a2: any, a3: any, A: WIA) => any>
    (fn: F): (...arg: PickNumParams<F, 2>) => ReturnType<F>;
function withImmerAPI<F extends (a: any, a2: any, a3: any, a4: any, A: WIA) => any>
    (fn: F): (...arg: PickNumParams<F, 3>) => ReturnType<F>;
function withImmerAPI<F extends (a: any, a2: any, a3: any, a4: any, a5:any, A: WIA) => any>
    (fn: F): (...arg: PickNumParams<F, 4>) => ReturnType<F>;
function withImmerAPI<F extends (a: any, a2: any, a3: any, a4: any, a5:any, a6: any, A: WIA) => any>
    (fn: F): (...arg: PickNumParams<F, 5>) => ReturnType<F>;
function withImmerAPI<F extends (a: any, a2: any, a3: any, a4: any, a5:any, a6: any, a7: any, A: WIA) => any>
    (fn: F): (...arg: PickNumParams<F, 6>) => ReturnType<F>;
function withImmerAPI<F extends (a: any, a2: any, a3: any, a4: any, a5:any, a6: any, a7: any, a8: any, A: WIA) => any>
    (fn: F): (...arg: PickNumParams<F, 7>) => ReturnType<F>;
function withImmerAPI<F extends (a: any, a2: any, a3: any, a4: any, a5:any, a6: any, a7: any, a8: any, a9: any, A: WIA) => any>
    (fn: F): (...arg: PickNumParams<F, 8>) => ReturnType<F>;
function withImmerAPI<F extends (a: any, a2: any, a3: any, a4: any, a5:any, a6: any, a7: any, a8: any, a9: any, a10: any, A: WIA) => any>
    (fn: F): (...arg: PickNumParams<F, 9>) => ReturnType<F>;
function withImmerAPI<F extends (...arg: any) => any>(fn: F) {
  const fnProxy = (...arg: Parameters<F>) => {
    if (arg.length === 1 && arg[0] instanceof StateContainer) {
      return arg[0].state;
    }
    return fn(...arg) as ReturnType<F>;
  };
  // @ts-ignore
  fnProxy.meta = {
    ...(fnProxy?.meta || {}),
    withAPI: true,
  };
  return fnProxy as (...args: Exclude<Parameters<F>, WithImmerAPI<any, any>>) => ReturnType<F>;
};

export const withAPI = withImmerAPI;

export {
    withImmerAPI,
}


