import { GenMapsType, Interceptor, Maps, State } from "natur";

import produce from "immer";
import { warning } from "./utils";

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
      const args: any[] = (record.actionArgs || []).slice();
      const fnLength = record.actionFunc?.meta?.fnLength;
      if (fnLength !== 0) {
        if (fnLength <= args.length) {
          const removeRes = args.length - fnLength + 1;
          args.splice(args.length - removeRes, removeRes);
          args.push({
            getMaps,
            getState,
            setState,
            localDispatch,
          });
          warning('natur-immer withAPI: more parameters than expected were passed in' + record.actionName || '');
        } else if (fnLength === args.length + 1) {
          args.push({
            getMaps,
            getState,
            setState,
            localDispatch,
          });
        } else if(fnLength > args.length + 1) {
          const undefArgLen = fnLength - args.length - 1;
          const undefArgArray = new Array(undefArgLen).fill(undefined);
          args.push(...undefArgArray, {
            getMaps,
            getState,
            setState,
            localDispatch,
          });
          warning('natur-immer withAPI: less parameters than expected were passed in' + record.actionName || '');
        }
      }
      return next({
        ...record,
        actionArgs: args,
      });
    }
    return next(record);
  };

export type Last<F extends AnyFun, T = Parameters<F>, > = T extends [...any, infer L] ? L : never

export type ExcludeLastParamIfItIsWIA<
    F extends AnyFun,
    P = Parameters<F>,
    LP = Last<F>,
> = LP extends WIA ? P extends [...infer A, any] ? A : never : P;

export type ExcludeWIA<F extends AnyFun> = ExcludeLastParamIfItIsWIA<F>;

function withImmerAPI<F extends (...arg: any) => any>(fn: F) {
  const fnLength = fn.length;

  const fnProxy = (...arg: ExcludeWIA<F>) => {
    if (arg.length === 1 && arg[0] instanceof StateContainer) {
      return arg[0].state;
    }
    return fn(...arg) as ReturnType<F>;
    // if (fnLength === arg.lenght - 1) {
    // }
    // if (fnLength === arg.lenght) { 
    //   return fn(...arg.slice(0, fnLength - 1), ) as ReturnType<F>;
    // }
  };
  // @ts-ignore
  fnProxy.meta = {
    ...(fnProxy?.meta || {}),
    withAPI: true,
    fnLength: fn.length,
  };
  return fnProxy as (...args: ExcludeWIA<F>) => ReturnType<F>;
};

export const withAPI = withImmerAPI;


export {
    withImmerAPI,
}


