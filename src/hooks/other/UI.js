import {libProperties} from "./JSONs";

export let isGameRunning

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const levelController = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/levelController.ts")
        const UI = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/UI.ts")
        const proto = UI.UIInGame.prototype

        const cc = ctx.unsafe.engine.getCc()

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "update",
            handler: async ({args, thisArg, callNext}) => {
                callNext(...args)

                if (!thisArg.paused) {
                    const mult =
                        levelController.LevelPlay.sandBoxModeOn && !levelController.LevelPlay.gameStarted
                            ? 6
                            : 1

                    const overrideSpeed = await ctx.settings.get("overrideFastForwardSpeed") ?
                        await ctx.settings.get("fastForwardSpeed") :
                        null

                    if (mult !== 1) {
                        cc.director.gameSpeed = mult
                        return
                    }

                    if (cc.director.gameSpeed === 1.5)
                        cc.director.gameSpeed = overrideSpeed ?? libProperties?.FastForwardSpeed ?? 1.5
                }
            }
        })
    })
}