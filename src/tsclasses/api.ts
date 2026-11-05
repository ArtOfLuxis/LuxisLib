
export abstract class GPNContext {
    public events!: GPNEvents;
    public unsafe!: GPNUnsafe;
    public ui!: GPNUI;
    [key: string]: any;
}

export abstract class GPNEvents {
    public on!: (event: string, callback: () => void) => void;
    public emit!: (event: string) => void;
}
export abstract class GPNUnsafe {
    public engine!: GPNEngine;
    public hooks!: GPNHooks;
}
export abstract class GPNUI {
    public toast!: (message: string, mode: "success" | "error" | "info") => any;
}

export abstract class GPNEngine {
    public getSystemModule!: (module: string) => any;
    public getCc!: () => any;
}
export abstract class GPNHooks {
    public wrapMethod!: (
        options: {
            target: any,
            methodName: string,
            priority?: number,
            isStatic?: boolean,
            handler: (obj: {
                args: any[]
                callNext: (...args: any[]) => any
                thisArg: any
            }) => void
        }
    ) => any;
    public wrapProperty!: (
        options: {
            owner?: any
            target: object
            key: string
            priority?: number
            get?: (context: {
                owner: any
                value: any
                target: object
                key: PropertyKey
                thisArg: any
            }) => any
            set?: (context: {
                owner: any
                value: any
                nextValue: any
                target: object
                key: PropertyKey
                thisArg: any
            }) => any
        }
    ) => () => boolean
}

export type GEProps = Record<string, any>
export type GEFeature = {
    CODENAME: string
    [key: string]: any
}
export type GEIdOrType = string | number
export type GEModifierFilter = (
    type: string,
    props: GEProps | null,
    features: GEFeature | null
) => boolean