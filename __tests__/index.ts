import { thunkMiddleware } from './../src/index';
import { createStore } from 'natur';
import { ThunkParams, promiseMiddleware } from 'natur/dist/middlewares';


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
}, Math.random() * 1200));

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
        badAction: (age: number) => ({getState}: ThunkParams<State>) => {
            const ns = getState();
            ns.age = age;
            
            const ns2 = getState();
            ns2.name = 'age';
        },
        compatibilityAndMemoryOversizeTestAction: () => ({getState}: ThunkParams<State>) => {
            getState();
            getState();
            return getState();
        },
        updateAge: (age: number) => ({getState}: ThunkParams<State>) => {
            const ns = getState();
            ns.age = age;
            return ns;
        },
        fetchTodo: () => async ({getState}: ThunkParams<State>) => {
            const res = await mockFetchTodo();
            const ns = getState();
            // console.log('fetch todo ns: ', ns);
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
            thunkMiddleware,
            promiseMiddleware
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
    // console.log(store.getModule('user').state.todo)
    expect(store.getModule('user').state.todo.at(-1)).toEqual({
        id: id - 1,
        name: 'work task1',
        status: 0,
    });
    expect(store.getModule('user').state.todo.length).toBe(5);
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

    expect(store.getModule('user').state.todo.length).toBe(5);
    expect(store.getModule('user').state.todo.at(-1)).toEqual({
        id: id - 1,
        name: 'work task1',
        status: 0,
    });
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

    expect(store.getModule('user').state.todo.length).toBe(5);
    expect(store.getModule('user').state.todo.at(-1)).toEqual({
        id: id - 1,
        name: 'work task1',
        status: 0,
    });
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


test('async bad action', () => {
    const user = store.getModule('user');
    user.actions.badAction(1);
    expect(store.getModule('user').state).toBe(undefined);
})

test('compatibilityAndMemoryOversizeTestAction', () => {
    const user = store.getModule('user');
    for(let i = 0; i<10000000; i++) {
        user.actions.compatibilityAndMemoryOversizeTestAction();
    }
    expect(store.getModule('user').state).toBe(user.state);
});