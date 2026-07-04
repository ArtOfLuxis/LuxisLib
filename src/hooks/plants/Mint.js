import {wrapDetector} from "./extra/DetectorManager";

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const mint = ctx.engine.getSystemModule("chunks:///_virtual/Mint.ts");
        const characterManager = ctx.engine.getSystemModule("chunks:///_virtual/CharacterManager.ts")
        const plants = ctx.engine.getSystemModule("chunks:///_virtual/Plants.ts");
        const plant = ctx.engine.getSystemModule("chunks:///_virtual/Plant.ts");
        const proto = mint.MintPlant.prototype;

        const plantKeys = {
            "BoostedFamilies": null,
            "BoostsPlants": null,
        }

        ctx.hooks.wrapProperty({
            target: proto,
            key: "_objdata",
            get: ({thisArg, value}) => {
                if (value) {
                    Object.entries(plantKeys).forEach(([prop, value]) => {
                        if (thisArg[prop] === undefined) thisArg[prop] = value
                    })
                }
                return value
            }
        })

        ctx.hooks.wrapMethod({
            target: proto,
            methodName: "animationListener",
            handler: ({args, thisArg, callOriginal}) => {
                const animation = args[0]
                if (animation.name === "boost_begin") {
                    thisArg.minting = true
                    thisArg.LifeCD = thisArg.objdataOwn.Lifespan

                    const boosts = thisArg.objdata.BoostsPlants
                    if (boosts || boosts === undefined) {
                        const families = thisArg.objdata.BoostedFamilies ?? [plant.PlantFamily[thisArg.family]]

                        console.log(thisArg.objdata.BoostedFamilies)
                        console.log(thisArg.family)
                        console.log(thisArg.family_str)
                        console.log(families)

                        characterManager.PlantPool.pool().filter(function (plant) {
                            return families.includes(plant.family_str);
                        }).forEach(function (t) {
                            t.onMintBoostStart();
                        });

                        families.forEach((boostedFamily) => {
                            plants.plants.MintDuration[boostedFamily] = Math.max(
                                thisArg.objdataOwn.Lifespan,
                                plants.plants.MintDuration[boostedFamily]
                            )
                        })
                    }

                    thisArg.specialMintAnimationListener(animation);
                } else {
                    callOriginal(animation)
                }
            }
        })

    })
}