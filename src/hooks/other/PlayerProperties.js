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

    })
}