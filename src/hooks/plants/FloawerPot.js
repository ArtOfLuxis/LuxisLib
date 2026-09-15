import { wrapObjDataOwnPlant } from "./Plant"

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const floawerPot = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/FloawerPot.ts")
        const proto = floawerPot.FloawerPotPlant.prototype

        wrapObjDataOwnPlant(ctx, proto, {
            "CanTransportOtherPlants": null,
            "OnlyTransportShovelablePlants": null,
        })

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "sniperPlantLocatable",
            handler: ({ args, thisArg, callNext }) => {
                if (thisArg.objdataOwn.CanTransportOtherPlants === true) {
                    return thisArg.ironed
                }
                return callNext(...args)
            }
        })

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "specialSniperPlantTrigger",
            handler: ({ args, thisArg, callNext }) => {
                const [targetSquare] = args

                if (thisArg.objdataOwn.CanTransportOtherPlants !== true) {
                    return callNext(...args)
                }

                const sourceSquare = thisArg.plantInLnC
                const passengers = sourceSquare
                    ? sourceSquare
                        .getAllPlants()
                        .filter((plant) =>
                            plant !== thisArg &&
                            !plant.dead &&
                            !plant.fooding &&
                            !plant.leapTween
                        )
                        .filter((plant) =>
                            thisArg.objdataOwn.OnlyTransportShovelablePlants !== true ||
                            plant.shovelable()
                        )
                    : []

                if (targetSquare.putPlantAvailable(true, thisArg.ID)) {
                    let duration = thisArg._objdataOwn.MoveToPosTime

                    if (thisArg._cdScale) {
                        duration *= thisArg._cdScale
                    }

                    const transported = passengers.map((plant) => ({
                        plant,
                        visualYOffset:
                            (plant.worldPositionY + plant.height_depth) -
                            (thisArg.worldPositionY + thisArg.height_depth),
                    }))

                    thisArg.__transportedPlants = transported

                    thisArg.leapTo(targetSquare, duration, 0, true, false, "quadOut")

                    transported.forEach(({ plant, visualYOffset }) => {
                        plant.leapTo(targetSquare, duration, 0, true, false, "quadOut")

                        plant.height_depth =
                            thisArg.worldPositionY +
                            thisArg.height_depth +
                            visualYOffset -
                            plant.worldPositionY
                    })

                    thisArg.anmControl.IdleAnim = "Moving"
                    thisArg.anmControl.RandomAnim = []
                    thisArg.anmControl.playIdle()
                } else {
                    if (!thisArg.planted) {
                        thisArg.anmControl.IdleAnim = thisArg.idle
                        thisArg.anmControl.RandomAnim = thisArg.random
                    }
                    thisArg.anmControl.playIdle()
                }
            }
        })

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "specialPlantUpdateForce",
            handler: ({ args, thisArg, callNext }) => {
                const result = callNext(...args)
                const transported = thisArg.__transportedPlants

                if (!transported) {
                    return result
                }

                transported.forEach(({ plant, visualYOffset }) => {
                    if (!plant || plant.dead || !plant.node?.isValid) {
                        return
                    }

                    plant.height_depth =
                        thisArg.worldPositionY +
                        thisArg.height_depth +
                        visualYOffset -
                        plant.worldPositionY
                })

                const finished =
                    !thisArg.leapTween &&
                    transported.every(({ plant }) => !plant?.leapTween)

                if (finished) {
                    delete thisArg.__transportedPlants
                }

                return result
            }
        })
    })
}