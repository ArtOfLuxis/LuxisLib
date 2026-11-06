
export type WrapPropertyArgs = {
    target: any
    key: string
    priority?: number
    get?: (context: {
        owner: object
        getBase: () => any
        getNext: () => any
        thisArg: any
    }) => any
    set?: (context: {
        owner: object
        getBase: () => any
        setBase: (value: any) => void
        getNext: () => any
        setNext: (value: any) => void
        thisArg: any
        nextValue: any
    }) => void
}

type PropertyHook = {
    id: number
    priority: number
    get?: WrapPropertyArgs["get"]
    set?: WrapPropertyArgs["set"]
}

type PropertyState = {
    descriptor: PropertyDescriptor
    dataValue: any
    hooks: PropertyHook[]
}

const propertyStates = new WeakMap<object, Map<string, PropertyState>>()
let propertyHookId = 0

function rebuildProperty(target: object, key: string, state: PropertyState) {
    state.hooks.sort((a, b) => b.priority - a.priority || a.id - b.id)

    const {descriptor} = state

    const getBase = (thisArg: any) => {
        if (descriptor.get) {
            return descriptor.get.call(thisArg)
        }

        if (thisArg !== target) {
            const ownDescriptor = Object.getOwnPropertyDescriptor(thisArg, key)

            if (ownDescriptor) {
                return ownDescriptor.get ? ownDescriptor.get.call(thisArg) : ownDescriptor.value
            }
        }

        return state.dataValue
    }

    const setBase = (thisArg: any, value: any) => {
        if (descriptor.set) {
            descriptor.set.call(thisArg, value)
            return
        }

        if (!descriptor.writable) {
            throw new TypeError(`Cannot assign to read only property '${key}'`)
        }

        if (thisArg === target) {
            state.dataValue = value
            return
        }

        Object.defineProperty(thisArg, key, {
            value,
            writable: true,
            enumerable: descriptor.enumerable,
            configurable: true
        })
    }

    const runGet = (depth: number, thisArg: any): any => {
        const hook = state.hooks[depth]

        if (!hook) {
            return getBase(thisArg)
        }

        if (!hook.get) {
            return runGet(depth + 1, thisArg)
        }

        return hook.get({
            owner: target,
            getBase: () => getBase(thisArg),
            getNext: () => runGet(depth + 1, thisArg),
            thisArg
        })
    }

    const runSet = (depth: number, thisArg: any, nextValue: any): void => {
        const hook = state.hooks[depth]

        if (!hook) {
            setBase(thisArg, nextValue)
            return
        }

        if (!hook.set) {
            runSet(depth + 1, thisArg, nextValue)
            return
        }

        hook.set({
            owner: target,
            getBase: () => getBase(thisArg),
            setBase: (value) => setBase(thisArg, value),
            getNext: () => runGet(depth + 1, thisArg),
            setNext: (value) => runSet(depth + 1, thisArg, value),
            thisArg,
            nextValue
        })
    }

    Object.defineProperty(target, key, {
        configurable: true,
        enumerable: descriptor.enumerable,
        get: function() {
            return runGet(0, this)
        },
        set: function(nextValue) {
            runSet(0, this, nextValue)
        }
    })
}

export function wrapProperty(args: WrapPropertyArgs): () => boolean {
    const {target, key, get, set, priority = 0} = args

    let properties = propertyStates.get(target)

    if (!properties) {
        properties = new Map()
        propertyStates.set(target, properties)
    }

    let state = properties.get(key)

    if (!state) {
        const descriptor = Object.getOwnPropertyDescriptor(target, key)

        if (!descriptor) {
            throw new Error(`Property '${key}' does not exist on target`)
        }

        if (!descriptor.configurable) {
            throw new Error(`Property '${key}' is not configurable`)
        }

        state = {
            descriptor,
            dataValue: descriptor.value,
            hooks: []
        }

        properties.set(key, state)
    }

    const hook: PropertyHook = {
        id: propertyHookId++,
        priority,
        get,
        set
    }

    state.hooks.push(hook)
    rebuildProperty(target, key, state)

    const dispose = () => {
        const index = state!.hooks.indexOf(hook)

        if (index === -1) {
            return false
        }

        state!.hooks.splice(index, 1)

        if (state!.hooks.length === 0) {
            Object.defineProperty(target, key, state!.descriptor)
            properties!.delete(key)

            if (properties!.size === 0) {
                propertyStates.delete(target)
            }
        } else {
            rebuildProperty(target, key, state!)
        }

        return true
    }

    console.log(`[Luxis Lib] [Wrap Property Debug] Wrapped ${key} for (${target.__classname__})`, args.target)

    return dispose
}