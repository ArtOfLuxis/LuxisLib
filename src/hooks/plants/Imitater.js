import {wrapObjDataOwnPlant} from "./Plant";

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const imitater = ctx.engine.getSystemModule("chunks:///_virtual/Imitater.ts")
        const plants = ctx.engine.getSystemModule("chunks:///_virtual/Plants.ts")
        const levelController = ctx.engine.getSystemModule("chunks:///_virtual/levelController.ts")
        const arrayGet = ctx.engine.getSystemModule("chunks:///_virtual/ArrayGet.ts")
        const proto = imitater.ImitaterPlant.prototype

        wrapObjDataOwnPlant(ctx, proto, {
            "DoesntImitate": null,
            "RandomPlantList": null
        })

        ctx.hooks.wrapMethod({
            target: proto,
            methodName: "getRandomPlantID",
            handler: ({ thisArg }) => {
                const randomPlantList = thisArg.objdataOwn.RandomPlantList

                const plantsList = []

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

                for (const { id, type } of arrayGet.ArrayGet.shuffle(plantsList)) {
                    if (levelController.LevelPlay.component.imitaterExcludePlantList.includes(id))
                        continue

                    if (!thisArg.plantInLnC?.putPlantAvailable(true, id))
                        continue

                    return type
                }
            }
        })



    })
}