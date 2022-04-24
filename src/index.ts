import { Action, Middleware, State } from 'natur';
import { castDraft, createDraft, Draft, finishDraft, isDraft, isDraftable } from 'immer';


export const isPromise = <T>(obj: any): obj is Promise<T> => obj && typeof obj.then === 'function'

const _finishDraft = (s: any) => {
	if (isDraft(s)) {
		return finishDraft(s);
	}
	return s;
}

export const thunkMiddleware: Middleware<any> = ({getState, getMaps, dispatch}) => next => record => {
	if (typeof record.state === 'function') {
		
		const setState = (s: State) => {
            return next({
                ...record,
                state: _finishDraft(s),
            });
        };
		const _dispatch = (action: string, ...arg: any[]) => {
			if (/^\w+\/\w+$/.test(action)) {
				const moduleName = action.split('/')[0];
				const actionName = action.split('/').slice(1).join('/');
				return dispatch(moduleName, actionName, ...arg);
			}
			return dispatch(record.moduleName, action, ...arg);
		}
        const _getState = () => {
			const s = getState();
            if (isDraftable(s)) {
                return createDraft(s);
            } else {
				console.warn(`natur-immer: ${record.moduleName}/${record.actionName} state can not use immer!`);
			}
            return s;
        }
        const ns = record.state({
            getState: _getState,
            setState,
            getMaps,
            dispatch: _dispatch
        });
		return next({
			...record,
			state: _finishDraft(ns),
		});
	}
	return next(record);
}
export const promiseMiddleware: Middleware<any> = () => next => record => {
	if (isPromise<ReturnType<Action>>(record.state)) {
		return (record.state as Promise<ReturnType<Action>>)
			.then(ns => next({
				...record,
				state: _finishDraft(ns),
			}));
	}
	return next(record);
}
