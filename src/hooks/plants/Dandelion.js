
export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const dandelion = ctx.engine.getSystemModule("chunks:///_virtual/Dandelion.ts")
        const proto = dandelion.DandelionPlant.prototype


        ctx.hooks.wrapMethod({
            target: proto,
            methodName: "detectEnemies",
            handler: ({args, thisArg, callOriginal}) => {
                const result = callOriginal(...args)

                if (result === -2 && thisArg.objdataOwn.AlwaysShoots) {
                    return Math.floor(Math.random() * 3) - 1
                }

                return result
            }
        })


    })
}