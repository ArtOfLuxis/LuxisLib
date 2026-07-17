import {wrapObjDataOwnPlant} from "./Plant";

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const mint = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/Mint.ts");
        const characterManager = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/CharacterManager.ts")
        const plants = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/Plants.ts")
        const plant = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/Plant.ts")
        const proto = mint.MintPlant.prototype;

        wrapObjDataOwnPlant(ctx, proto, {
            "BoostedFamilies": null,
            "BoostedPlants": null,
            "BoostsPlants": null,
        })

        plants.plants.SpecificPlantMintDuration = {}

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "animationListener",
            handler: ({args, thisArg, callNext}) => {
                const animation = args[0]
                if (animation.name === "boost_begin") {
                    thisArg.minting = true
                    thisArg.LifeCD = thisArg.objdataOwn.Lifespan

                    const boosts = thisArg.objdataOwn.BoostsPlants
                    if (boosts !== false) {
                        const boostedPlants = thisArg.objdataOwn.BoostedPlants ?? []
                        const boostedFamilies = thisArg.objdataOwn.BoostedFamilies ?? [thisArg.family_str]

                        characterManager.PlantPool.pool().filter(function (plant) {
                            return (
                                boostedFamilies.includes(plant.family_str) ||
                                boostedPlants.includes(plant.Plant_Type)
                            )
                        }).forEach(function (plant) {
                            plant.onMintBoostStart()
                        })

                        boostedFamilies.forEach((boostedFamily) => {
                            plants.plants.MintDuration[boostedFamily] = Math.max(
                                thisArg.objdataOwn.Lifespan,
                                plants.plants.MintDuration[boostedFamily]
                            )
                        })
                        boostedPlants.forEach((boostedPlant) => {
                            plants.plants.SpecificPlantMintDuration[boostedPlant] = Math.max(
                                thisArg.objdataOwn.Lifespan,
                                plants.plants.SpecificPlantMintDuration[boostedPlant] ?? 0
                            )
                        })
                    }

                    thisArg.specialMintAnimationListener(animation)
                } else {
                    callNext(animation)
                }
            }
        })


        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "shovelable",
            handler: ({args, thisArg, callNext}) => {
                const forceShovelableMode = thisArg.objdataOwn.ForceShovelableMode
                if (typeof forceShovelableMode === "boolean") return forceShovelableMode

                return callNext(...args)
            }
        })

    })
}