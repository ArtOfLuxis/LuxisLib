import {libProperties} from "./JSONs";

export function init(ctx) {
    ctx.events.on("luxislib:properties", () => {
        const playerProperties = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/PlayerProperties.ts")
        const allPlayerProperties = playerProperties.AllPlayerProperties

        if (libProperties?.StartingWorlds)
            allPlayerProperties.StartingWorlds = libProperties.StartingWorlds.map((world) => {
            return playerProperties.WorldMapSceneDisplayEnum[world]
        })

        const tutorialLevels = [
            "tutorial1", "tutorial2", "tutorial3", "tutorial4"
        ]

        ctx.unsafe.hooks.wrapMethod({
            target: allPlayerProperties,
            methodName: "getForceLevel",
            handler: ({args, thisArg, callNext}) => {
                if (!libProperties?.ForceSkipTutorial) return callNext(...args)

                if (!thisArg.currentPlayer.forceLevel || tutorialLevels.includes(thisArg.currentPlayer.forceLevel)) {
                    thisArg.currentPlayer.forceLevel = ""
                    thisArg.savePP()
                }
                return thisArg.currentPlayer.forceLevel
            }
        })

        ctx.unsafe.hooks.wrapMethod({
            target: allPlayerProperties,
            methodName: "getToday",
            handler: ({ thisArg, callNext, args }) => {
                const [shouldReturnChangedState = false] = args
                const prev = thisArg.currentPlayer.date ?? {}

                const previousDate = new Date(
                    prev.year ?? 1970,
                    (prev.month ?? 1) - 1,
                    prev.date ?? 1,
                    prev.hour ?? 0,
                    prev.minute ?? 0,
                    prev.second ?? 0
                )

                const currentDate = new Date()

                function getPeriod(date, resetsPerDay) {
                    resetsPerDay = Math.max(0.00001, resetsPerDay)

                    return Math.floor(
                        date.getTime() / (86400000 / resetsPerDay)
                    )
                }

                const yetiChanged =
                    getPeriod(previousDate, libProperties?.YetiResetTimesPerDay ?? 1) !==
                    getPeriod(currentDate, libProperties?.YetiResetTimesPerDay ?? 1)

                const decodeChanged =
                    getPeriod(previousDate, libProperties?.DecodeResetTimesPerDay ?? 1) !==
                    getPeriod(currentDate, libProperties?.DecodeResetTimesPerDay ?? 1)

                const result = callNext()

                if (yetiChanged) {
                    thisArg.currentPlayer.yeti_spawned_today = false
                }

                if (decodeChanged) {
                    thisArg.currentPlayer.arcade_plant_decoding.played_today = false
                    thisArg.currentPlayer.arcade_plant_decoding.gem_today = 0
                }

                if (yetiChanged || decodeChanged) {
                    thisArg.savePP()
                    if (shouldReturnChangedState)
                        return { yetiChanged, decodeChanged }
                }

                return result
            }
        })

    })
}