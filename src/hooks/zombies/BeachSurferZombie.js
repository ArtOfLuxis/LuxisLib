
export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const beachSurferZombie =
            ctx.unsafe.engine.getSystemModule("chunks:///_virtual/BeachSurferZombie.ts")
        const proto = beachSurferZombie.BeachSurferZombie.prototype

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "onObjdataSet",
            handler: ({ args, callNext, thisArg }) => {
                const result = callNext(...args)

                args[0].PlantBlockers ??= []
                args[0].ZombieBlockers ??= []

                return result
            }
        })
    })
}