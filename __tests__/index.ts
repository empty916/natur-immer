import { thunkMiddleware } from './../src/index';
import { createStore } from 'natur';
import {
    ThunkParams,
    promiseMiddleware,
    fillObjectRestDataMiddleware,
    shallowEqualMiddleware, 
    filterUndefinedMiddleware,
} from 'natur/dist/middlewares';


let id = 1;

const mockFetchTodo = () => new Promise<{name: string; status: number, id: number}[]>(res => res([
    {
        name: 'play game',
        status: 0,
        id: id++,
    },
    {
        name: 'work task1',
        status: 0,
        id: id++,
    }
]));

const mockFetchTodo2 = () => new Promise<
    {
        name: string;
        status: number,
        id: number
    }[]
>(res => setTimeout(() => {
    res([
        {
            name: 'play game',
            status: 0,
            id: id++,
        },
        {
            name: 'work task1',
            status: 0,
            id: id++,
        }
    ])
}, Math.random() * 1500));

const _createStore = () => {
    const state = {
        name: 'tom',
        age: 10,
        todo: [
            {
                name: 'study english',
                status: 0,
                id: 0,
            }
        ]
    };
    type State = typeof state;
    const actions = {
        repeatGetState: (age: number) => ({getState}: ThunkParams<State>) => {
            const ns = getState();
            ns.age = age;
            
            const ns2 = getState();
            ns2.name = 'age';
        },
        repeatAddAge: (age: number) => ({getState}: ThunkParams<State>) => {
            const ns = getState();
            ns.age = age;
            
            const ns2 = getState();
            ns2.age++;

            ns2.age = ns2.age + 1;
            ns.age++;
        },
        badAction: () => ({getState}: ThunkParams<State>) => {
            getState();
            const s = getState();
            return {
                ...s
            };
        },
        compatibilityAndMemoryOversizeTestAction: () => ({getState}: ThunkParams<State>) => {
            getState();
            const s = getState();
            return s;
        },
        compatibilityAndMemoryOversizeTestAction2: () => ({getState}: ThunkParams<State>) => {
            const s = getState();
            return {
                age: s.age + 1,
            };
        },
        updateAge: (age: number) => ({getState}: ThunkParams<State>) => {
            const ns = getState();
            ns.age = age;
            return ns;
        },
        fetchTodo: () => async ({getState}: ThunkParams<State>) => {
            const res = await mockFetchTodo();
            const ns = getState();
            ns.todo.push(...res);
            return ns;
        },
        fetchTodoWithoutReturn: () => async ({getState}: ThunkParams<State>) => {
            const ns = getState();
            const res = await mockFetchTodo();
            ns.todo.push(...res);
        },
        fetchTodoWithoutReturn1: () => async ({getState}: ThunkParams<State>) => {
            const ns = getState();
            const res = await mockFetchTodo();
        },
        fetchTodoWithoutReturn2: () => async ({getState}: ThunkParams<State>) => {
            const ns = getState();
            const res = await mockFetchTodo2();
            ns.todo.push(...res);
        },
        fetchTodoWithoutReturn3: () => async ({getState}: ThunkParams<State>) => {
            const res = await mockFetchTodo2();
            const ns = getState();
            ns.todo.push(...res);
        },
    }
    return createStore({
        user: {
            state,
            actions,
        }
    }, {}, {
        middlewares: [
            thunkMiddleware, // action??????????????????????????????????????????
            promiseMiddleware, // action??????????????????
            fillObjectRestDataMiddleware, // ????????????/????????????
            shallowEqualMiddleware, // ??????state??????????????????
            filterUndefinedMiddleware, // ?????????????????????action
        ]
    })
}

let store = _createStore();

beforeEach(() => {
    id = 1;
    store = _createStore();
});

test('sync', () => {
    const user = store.getModule('user');
    user.actions.updateAge(1);
    expect(user.state).not.toEqual(store.getModule('user').state);
    expect(store.getModule('user').state.age).toBe(1);

    user.actions.updateAge(2);
    user.actions.updateAge(3);
    user.actions.updateAge(4);

    expect(store.getModule('user').state.age).toBe(4);
});

test('repeatAddAge', () => {
    const user = store.getModule('user');
    user.actions.repeatAddAge(20);
    expect(store.getModule('user').state.age).toBe(12);
})

test('async', async () => {
    const user = store.getModule('user');
    await user.actions.fetchTodo();
    expect(user.state).not.toEqual(store.getModule('user').state);
    expect(store.getModule('user').state.todo[2]).toEqual({
        name: 'work task1',
        status: 0,
        id: 2,
    });

    await user.actions.fetchTodo();
    await user.actions.fetchTodo();
    await user.actions.fetchTodo();
    await user.actions.fetchTodo();
    expect(store.getModule('user').state.todo.at(-1)).toEqual({
        id: id - 1,
        name: 'work task1',
        status: 0,
    });
    expect(store.getModule('user').state.todo.length).toBe(11);
});


test('async paralle', async () => {
    const user = store.getModule('user');
    await user.actions.fetchTodo();
    expect(user.state).not.toEqual(store.getModule('user').state);
    expect(store.getModule('user').state.todo[2]).toEqual({
        name: 'work task1',
        status: 0,
        id: 2
    });
    await Promise.all([
        user.actions.fetchTodo(),
        user.actions.fetchTodo(),
        user.actions.fetchTodo(),
        user.actions.fetchTodo(),
    ]);
    // expect(store.getModule('user').state.todo.at(-1)).toEqual({
    //     id: id - 1,
    //     name: 'work task1',
    //     status: 0,
    // });
    expect(store.getModule('user').state.todo.length).toBe(11);
});

test('return', async () => {
    const user = store.getModule('user');
    const res = await user.actions.fetchTodoWithoutReturn();
    const res1 = await user.actions.fetchTodoWithoutReturn1();
    expect(res).not.toBe(undefined);
    expect(res1).toBe(undefined);
});

test('async without return', async () => {
    const user = store.getModule('user');
    await user.actions.fetchTodoWithoutReturn();
    expect(user.state).not.toEqual(store.getModule('user').state);
    expect(store.getModule('user').state.todo[2]).toEqual({
        name: 'work task1',
        status: 0,
        id: 2,
    });

    await user.actions.fetchTodoWithoutReturn();
    await user.actions.fetchTodoWithoutReturn();
    await user.actions.fetchTodoWithoutReturn();
    await user.actions.fetchTodoWithoutReturn();

    expect(store.getModule('user').state.todo.at(-1)).toEqual({
        id: id - 1,
        name: 'work task1',
        status: 0,
    });

    expect(store.getModule('user').state.todo.length).toBe(11);
});

test('async without return in paraller', async () => {
    const user = store.getModule('user');
    await user.actions.fetchTodoWithoutReturn();
    expect(user.state).not.toEqual(store.getModule('user').state);
    expect(store.getModule('user').state.todo[2]).toEqual({
        name: 'work task1',
        status: 0,
        id: 2,
    });

    await Promise.all([
        user.actions.fetchTodoWithoutReturn(),
        user.actions.fetchTodoWithoutReturn(),
        user.actions.fetchTodoWithoutReturn(),
        user.actions.fetchTodoWithoutReturn(),
    ]);

    expect(store.getModule('user').state.todo.length).toBe(11);
    // expect(store.getModule('user').state.todo.at(-1)).toEqual({
    //     id: id - 1,
    //     name: 'work task1',
    //     status: 0,
    // });
});





test('async without return2', async () => {
    const user = store.getModule('user');
    await user.actions.fetchTodoWithoutReturn2();
    expect(user.state).not.toEqual(store.getModule('user').state);
    expect(store.getModule('user').state.todo[2]).toEqual({
        name: 'work task1',
        status: 0,
        id: 2,
    });

    await user.actions.fetchTodoWithoutReturn2();
    await user.actions.fetchTodoWithoutReturn2();
    await user.actions.fetchTodoWithoutReturn2();
    await user.actions.fetchTodoWithoutReturn2();

    expect(store.getModule('user').state.todo.at(-1)).toEqual({
        id: id - 1,
        name: 'work task1',
        status: 0,
    });

    expect(store.getModule('user').state.todo.length).toBe(11);
});

test('async without return in paraller2', async () => {
    const user = store.getModule('user');
    await user.actions.fetchTodoWithoutReturn2();
    expect(user.state).not.toEqual(store.getModule('user').state);
    expect(store.getModule('user').state.todo[2]).toEqual({
        name: 'work task1',
        status: 0,
        id: 2,
    });

    await Promise.all([
        user.actions.fetchTodoWithoutReturn2(),
        user.actions.fetchTodoWithoutReturn2(),
        user.actions.fetchTodoWithoutReturn2(),
        user.actions.fetchTodoWithoutReturn2(),
    ]);

    expect(store.getModule('user').state.todo.length).toBe(11);
});





test('async without return3', async () => {
    const user = store.getModule('user');
    await user.actions.fetchTodoWithoutReturn3();
    expect(user.state).not.toEqual(store.getModule('user').state);
    expect(store.getModule('user').state.todo[2]).toEqual({
        name: 'work task1',
        status: 0,
        id: 2,
    });

    await user.actions.fetchTodoWithoutReturn3();
    await user.actions.fetchTodoWithoutReturn3();
    await user.actions.fetchTodoWithoutReturn3();
    await user.actions.fetchTodoWithoutReturn3();

    expect(store.getModule('user').state.todo.at(-1)).toEqual({
        id: id - 1,
        name: 'work task1',
        status: 0,
    });

    expect(store.getModule('user').state.todo.length).toBe(11);
});

test('async without return in paraller3', async () => {
    const user = store.getModule('user');
    await user.actions.fetchTodoWithoutReturn3();
    expect(user.state).not.toEqual(store.getModule('user').state);
    expect(store.getModule('user').state.todo[2]).toEqual({
        name: 'work task1',
        status: 0,
        id: 2,
    });

    await Promise.all([
        user.actions.fetchTodoWithoutReturn3(),
        user.actions.fetchTodoWithoutReturn3(),
        user.actions.fetchTodoWithoutReturn3(),
        user.actions.fetchTodoWithoutReturn3(),
    ]);

    expect(store.getModule('user').state.todo.length).toBe(11);
    expect(store.getModule('user').state.todo.at(-1)).toEqual({
        id: id - 1,
        name: 'work task1',
        status: 0,
    });
});


test('repeat get state action', () => {
    const user = store.getModule('user');
    user.actions.repeatGetState(1);
    expect(store.getModule('user').state.name).toBe('age');
})

test('repeat get state action', () => {
    const user = store.getModule('user');
    for(let i = 0; i<10000; i++) {
        user.actions.repeatGetState(1);
    }
    expect(store.getModule('user').state.name).toBe('age');
})

test('bad action', () => {
    const user = store.getModule('user');
    expect(() => {
        for(let i = 0; i<10000; i++) {
            user.actions.badAction();
        }
    }).toThrow();
})


test('compatibilityAndMemoryOversizeTestAction', () => {
    const user = store.getModule('user');
    for(let i = 0; i<10000; i++) {
        user.actions.compatibilityAndMemoryOversizeTestAction();
    }
    expect(store.getModule('user').state).toBe(user.state);
});

test('compatibilityAndMemoryOversizeTestAction2', () => {
    const user = store.getModule('user');
    for(let i = 0; i<10000; i++) {
        user.actions.compatibilityAndMemoryOversizeTestAction2();
    }
    expect(store.getModule('user').state.age).toBe(user.state.age + 10000);
});