
export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const cardFeature = ctx.engine.getSystemModule("chunks:///_virtual/CardFeature.ts");
        const square = ctx.engine.getSystemModule("chunks:///_virtual/Square.ts");
        const proto = cardFeature.CardFeature.prototype;

        ctx.hooks.wrapProperty({
            target: proto,
            key: "SUNCOST",
            get: ({thisArg, value}) => {
                let sun = value

                const costOverride = thisArg.Prop.CostOverride
                if (square.Square.component && square.Square.component.inLawnLnCs && costOverride) {
                    let count = 0

                    if (costOverride.CounterMode === "OnField") {
                        square.Square.getAllLnC().forEach((LnC) => {
                            LnC.getAllPlants().forEach((plant) => {
                                if (plant.ID === thisArg.PF.ID) count++
                            })
                        })
                    } else if (costOverride.CounterMode === "TotalPlanted") {
                        count = thisArg.TotalPlanted || 0
                    } else {
                        ctx.ui.toast("Unknown CounterMode", "error");
                        ctx.log.error("Unknown CounterMode: " + costOverride.CounterMode)
                    }

                    const listSunCost = costOverride.ListSunCost
                    if (listSunCost.length > 0) {
                        sun = listSunCost[Math.min(count, listSunCost.length - 1)]
                    }
                    sun += costOverride.IncrementSunCost * count
                }

                return sun
            }
        })
    })
}