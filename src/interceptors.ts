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

type Last<F extends AnyFun, T = Parameters<F>, > = T extends [...any, infer L] ? L : never

export type ExcludeLastParamIfItIsWIA<
    F extends AnyFun,
    P = Parameters<F>,
    LP = Last<F>,
> = LP extends WIA ? P extends [...infer A, any] ? A : never : P;

export type ExcludeWIA<F extends AnyFun> = ExcludeLastParamIfItIsWIA<F>;

function withImmerAPI<F extends (...arg: any) => any>(fn: F) {
  const fnProxy = (...arg: ExcludeWIA<F>) => {
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
  return fnProxy as (...args: ExcludeWIA<F>) => ReturnType<F>;
};

export const withAPI = withImmerAPI;

const f1 = (age: number, {setState}: WIA<State>) =>  {
    return setState(s => {
        s.age = age;
    });
};

export {
    withImmerAPI,
}


