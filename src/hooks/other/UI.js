import {libProperties} from "./JSONs";

export let isGameRunning

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const levelController = ctx.engine.getSystemModule("chunks:///_virtual/levelController.ts")
        const UI = ctx.engine.getSystemModule("chunks:///_virtual/UI.ts")
        const proto = UI.UIInGame.prototype

        const cc = ctx.engine.getCc()

        ctx.hooks.wrapMethod({
            target: proto,
            methodName: "update",
            handler: ({ args, thisArg, callOriginal }) => {
                callOriginal(...args)

                if (!thisArg.paused) {
                    const mult =
                        levelController.LevelPlay.sandBoxModeOn && !levelController.LevelPlay.gameStarted
                            ? 6
                            : 1

                    if (mult !== 1) {
                        cc.director.gameSpeed = mult
                        return
                    }

                    if (cc.director.gameSpeed === 1.5)
                        cc.director.gameSpeed = libProperties.FastForwardSpeed ?? 1.5
                }
            }
        })
    })
}