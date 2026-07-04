
export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const LnC = ctx.engine.getSystemModule("chunks:///_virtual/LnC.ts")
        const cards = ctx.engine.getSystemModule("chunks:///_virtual/Cards.ts")
        const proto = LnC.LnC.prototype

        ctx.hooks.wrapMethod({
            target: proto,
            methodName: "PlaceUIPlant",
            handler: ({thisArg, callOriginal}) => {
                const currentCF = thisArg.UIInGame.currentCF
                if (!currentCF.TotalPlanted) {
                    currentCF.TotalPlanted = 0
                }
                currentCF.TotalPlanted++

                return callOriginal();
            }
        })

        ctx.hooks.wrapMethod({
            target: proto,
            methodName: "removePlant",
            handler: ({thisArg, callOriginal}) => {
                const result = callOriginal();

                cards.Cards.component.CFs.forEach((card) => {
                    card.SUNCOST += 0 // to update suncost on all cards
                })

                return result;
            }
        })

    })
}