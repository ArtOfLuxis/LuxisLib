import {wrapObjDataOwnPlant} from "./Plant";

export function imitatorSeedPacketPlants(LnC, originalImitator) {
    return LnC.plantInSquare.concat(
        LnC.vineInSquare,
        LnC.hasLilyPad && LnC.lilypad ? [LnC.lilypad] : [],
        LnC.floawerpot && LnC.hasFloawerPot ? [LnC.floawerpot] : [],
        LnC.tilePlantInSquare
    ).filter(plant => plant !== originalImitator)
}

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const imitater = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/Imitater.ts")
        const plants = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/Plants.ts")
        const levelController = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/levelController.ts")
        const arrayGet = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/ArrayGet.ts")
        const sunflower = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/Sunflower.ts")
        const proto = imitater.ImitaterPlant.prototype

        wrapObjDataOwnPlant(ctx, proto, {
            "DoesntImitate": null,
            "RandomPlantList": null,
            "MakesPlantSeedPacket": null,
        })

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "getRandomPlantID",
            handler: ({ thisArg }) => {
                const randomPlantList = thisArg.objdataOwn.RandomPlantList

                let plantsList = []

                if (!randomPlantList) {
                    for (let id = 0; id < plants.PlantEnum.amount; id++) {
                        plantsList.push({
                            id,
                            type: plants.plants.getPlantFeature(id).CODENAME
                        })
                    }
                } else {
                    for (const type of randomPlantList) {
                        plantsList.push({
                            id: plants.plants.getPlantEnumByCodename(type),
                            type
                        })
                    }
                }

                plantsList = plantsList.filter(codename => codename !== thisArg.Plant_Type)

                for (const { id, type } of arrayGet.ArrayGet.shuffle(plantsList)) {
                    if (levelController.LevelPlay.component?.imitaterExcludePlantList?.includes(id))
                        continue

                    if (!thisArg.plantInLnC?.putPlantAvailable(true, id))
                        continue

                    return type
                }
            }
        })

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "transToPlant",
            handler: ({ args, thisArg, callNext }) => {
                const makesPlantSeedPacket = thisArg.objdataOwn.MakesPlantSeedPacket
                if (!makesPlantSeedPacket) return callNext(...args)

                const lnc = thisArg.inLnC

                const plants = imitatorSeedPacketPlants(lnc, thisArg)

                const plantType = plants[0]?.Plant_Type
                if (plantType) sunflower.sunflower.dropOnePlantCard(thisArg.worldPosition, plantType)
            }
        })



    })
}