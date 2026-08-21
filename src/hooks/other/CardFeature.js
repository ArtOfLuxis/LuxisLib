
let plantAnimations

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const cardFeature = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/CardFeature.ts")
        const square = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/Square.ts")
        const proto = cardFeature.CardFeature.prototype

        const cc = ctx.unsafe.engine.getCc()

        proto.Prop = { Cooldown: 0, SunCost: 0, BeghouledCost: 0 }
        ctx.unsafe.hooks.wrapProperty({
            target: proto,
            key: "SUNCOST",
            get: ({thisArg, value}) => {
                let sun = value

                const costOverride = thisArg.Prop.CostOverride
                if (square.Square.component?.inLawnLnCs && costOverride) {
                    let count = 0

                    if (costOverride.CounterMode === "OnField") {
                        square.Square.getAllLnC().forEach((LnC) => {
                            LnC.getAllPlants().forEach((plant) => {
                                if (plant.ID === thisArg.PF.ID) count++
                            })
                        })
                    } else if (costOverride.CounterMode === "TotalPlanted") {
                        count = thisArg.TotalPlanted ?? 0
                    } else {
                        ctx.ui.toast("Unknown CounterMode", "error");
                        ctx.log.error("Unknown CounterMode: " + costOverride.CounterMode)
                    }

                    const listSunCost = costOverride.ListSunCost
                    if (listSunCost.length > 0) {
                        sun = listSunCost[Math.min(count, listSunCost.length - 1)]
                    }
                    if (typeof sun === "number")
                        sun += (costOverride.IncrementSunCost ?? 0) * count
                }

                return sun
            }
        })

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "cardGrouperPlant",
            handler: ({ thisArg, callNext, args }) => {
                callNext(...args)

                const assets = cc.assetManager.assets._map

                const plantAsset = assets["91731241-49e8-4db3-bb69-f04d4f4762d6"]
                const plantAtlas = assets["2c339223-8acf-4c14-99cb-018fa35f1174"]

                const zombieAsset = assets["52499037-3d67-4db4-a1c1-d5055559bc09"]
                const zombieAtlas = assets["1460d3f3-5bba-411c-bad2-47aa2d6b278f"]

                const db = thisArg.ca._plantDB

                const animations = db._armature?.animation?._animations;

                if (!plantAnimations) {
                    if (!animations) {
                        return;
                    }

                    plantAnimations = Object.keys(animations);
                }

                const animation = thisArg.PF._CARDSPRITENAME
                if (!plantAnimations.includes(animation)) {
                    db._dragonAsset = zombieAsset
                    db._dragonAtlasAsset = zombieAtlas
                    db._armatureName = "Zombie"
                } else {
                    db._dragonAsset = plantAsset
                    db._dragonAtlasAsset = plantAtlas
                    db._armatureName = "plants"
                }

                db._buildArmature()
                db.playAnimation(animation)
            }
        })
    })
}