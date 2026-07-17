
export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const plants = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/Plants.ts");
        const proto = plants.Plants.prototype

        plants.plants.SpecificPlantMintDuration = {}

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "update",
            handler: ({ args, callNext }) => {
                callNext(...args)

                const deltaTime = args[0]
                const durations = plants.plants.SpecificPlantMintDuration

                for (const [plant, time] of Object.entries(durations)) {
                    const newTime = time - deltaTime

                    if (newTime <= 0) {
                        delete durations[plant]
                    } else {
                        durations[plant] = newTime
                    }
                }
            }
        })
    })
}