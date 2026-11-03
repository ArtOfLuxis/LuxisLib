function getLODOrder(levelIds, date) {
    const levels = [...levelIds].sort()
    console.log(levels)

    // day
    let seed = Math.floor(Date.UTC(date.year, date.month - 1, date.date) / 86400000)

    for (let i = levels.length - 1; i > 0; i--) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
        const j = seed % (i + 1)
        ;[levels[i], levels[j]] = [levels[j], levels[i]]
    }

    return levels
}

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const levelOfTheDayDisplayer = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/LevelOfTheDayDisplayer.ts")
        const playerProperties = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/PlayerProperties.ts")
        const arrayGet = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/ArrayGet.ts")

        let deterministicPinatasEnabled = false

        ctx.unsafe.hooks.wrapMethod({
            target: levelOfTheDayDisplayer.LevelOfTheDayDisplayer.prototype,
            methodName: "getLOD",
            handler: ({args, callNext, thisArg}) => {
                if (!deterministicPinatasEnabled) {
                    return callNext(...args)
                }
                const originalShuffle = arrayGet.ArrayGet.shuffle
                const date = playerProperties.AllPlayerProperties.currentPlayer.date

                arrayGet.ArrayGet.shuffle = function (levelIds) {
                    return getLODOrder(levelIds, date)
                }

                console.log("getting LOD")

                try {
                    return callNext(...args)
                } finally {
                    arrayGet.ArrayGet.shuffle = originalShuffle
                }
            }
        })

        ctx.unsafe.hooks.wrapMethod({
            target: levelOfTheDayDisplayer.LevelOfTheDayDisplayer.prototype,
            methodName: "onLoad",
            handler: async ({args, callNext}) => {
                deterministicPinatasEnabled = await ctx.settings.get("deterministicPinatas")
                return await callNext(...args)
            }
        })

        ctx.unsafe.hooks.wrapMethod({
            target: playerProperties.AllPlayerProperties,
            methodName: "getLevelOfTheDayProps",
            handler: ({args, callNext}) => {
                if (!deterministicPinatasEnabled) {
                    return callNext(...args)
                }
                const props = callNext(...args)

                props.date_changed = true

                for (const event of Object.values(props.events)) {
                    event.played_levels = []
                }

                return props
            }
        })

    })
}