import { Action, Middleware, State } from 'natur';
import { castDraft, createDraft, Draft, finishDraft, isDraft, isDraftable } from 'immer';


export const isPromise = <T>(obj: any): obj is Promise<T> => obj && typeof obj.then === 'function'

export const thunkMiddleware: Middleware<any> = ({getState, getMaps, dispatch}) => next => record => {
	if (typeof record.state === 'function') {
		let draftCache: any[] = [];

		const _finishDraft = (s: any) => {
			let _s = s;
			if (Array.isArray(draftCache) && draftCache.length > 1 && _s === undefined) {
				console.error(`natur-immer: you may forgeted returning state`);
				return _s;
			}
			if (Array.isArray(draftCache) && draftCache.length >= 1 && _s !== undefined) {
				draftCache = draftCache.filter(i => i !== _s);
			}
			if (Array.isArray(draftCache) && draftCache.length === 1 && _s === undefined) {
				_s = draftCache.pop();
			}
			if (isDraft(_s)) {
				return finishDraft(_s);
			}
			return _s;
		}

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
				const ds = createDraft(s);
				draftCache.push(ds);
                return ds;
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
		if (isPromise<ReturnType<Action>>(ns)) {
			return (ns as Promise<ReturnType<Action>>)
				.then(ns => next({
					...record,
					state: _finishDraft(ns),
				}));
		}
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
				state: ns,
			}));
	}
	return next(record);
}
