import { libProperties } from "./JSONs";

export function init(ctx) {
    ctx.events.on("luxislib:properties", () => {
        const sun = ctx.engine.getSystemModule("chunks:///_virtual/sun.ts")
        const droppings = ctx.engine.getSystemModule("chunks:///_virtual/Droppings.ts")
        const sunCount = ctx.engine.getSystemModule("chunks:///_virtual/SunCount.ts")
        const multiLanguage = ctx.engine.getSystemModule("chunks:///_virtual/MultiLanguage.ts")
        const keyListener = ctx.engine.getSystemModule("chunks:///_virtual/KeyListener.ts")
        const levelController = ctx.engine.getSystemModule("chunks:///_virtual/levelController.ts")
        const proto = sun.sun.prototype

        ctx.hooks.wrapMethod({
            target: proto,
            methodName: "specialGoToUI",
            handler: ({ args, thisArg, callOriginal }) => {
                const sunOverrides = libProperties?.SunValueOverrides
                if (!sunOverrides) return callOriginal(...args)

                droppings.droppings.deleteSun(thisArg)

                thisArg.switchMode("Normal")
                thisArg.absorber = null

                const value = sunOverrides[thisArg.value.toString()] ?? thisArg.value

                sunCount.SunCount.component.playCollect()
                sunCount.SunCount.component.SunAdd(value, false)

                const level = levelController.LevelPlay.component
                if (!level?.Tutorial_Sun_Collected) return

                level.Tutorial_Sun_Collected = false
                level.Tutorial_Point_At_Card_2 = true

                keyListener.KeyListener.gameTipString(
                    multiLanguage.MultiLanguage.getDirectQuote("[ADVICE_COLLECTED_SUN]"),
                    Infinity,
                    null,
                    true
                )
            }
        })
    })
}