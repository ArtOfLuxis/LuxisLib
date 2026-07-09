import {evaluate} from "../../modules/JSONActionsSystem";

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const LnC = ctx.engine.getSystemModule("chunks:///_virtual/LnC.ts")
        const cards = ctx.engine.getSystemModule("chunks:///_virtual/Cards.ts")
        const plants = ctx.engine.getSystemModule("chunks:///_virtual/Plants.ts")
        const proto = LnC.LnC.prototype

        ctx.hooks.wrapMethod({
            target: proto,
            methodName: "PlaceUIPlant",
            handler: ({args, thisArg, callOriginal}) => {
                const currentCF = thisArg.UIInGame.currentCF
                if (!currentCF.TotalPlanted) {
                    currentCF.TotalPlanted = 0
                }
                currentCF.TotalPlanted++

                return callOriginal(...args)
            }
        })

        ctx.hooks.wrapMethod({
            target: proto,
            methodName: "removePlant",
            handler: ({args, thisArg, callOriginal}) => {
                const result = callOriginal(...args)

                cards.Cards.component.CFs.forEach((card) => {
                    card.SUNCOST += 0 // to update suncost on all cards
                })

                return result
            }
        })

        ctx.hooks.wrapMethod({
            target: proto,
            methodName: "putPlantAvailable",
            handler: ({args, thisArg, callOriginal}) => {

                const result = callOriginal(...args)

                const plantID = args[1]
                if (typeof plantID === "number" && !isNaN(plantID)) {
                    const props = plants.plants.getPlantProps(plantID)
                    const dynamicPlantableCondition = props.DynamicPlantableCondition
                    if (dynamicPlantableCondition) return evaluate(dynamicPlantableCondition, {
                        "target": thisArg,
                        "source": thisArg,
                        "originalResult": result,
                        "checkOverlap": args[0],
                        "plantID": plantID,
                        "terrainRestrictions": args[2] ?? true
                    })
                }


                return result
            }
        })


        proto.plantableIgnoreConditions = function (
            checkOverlap, plantID, terrainRestrictions,
            ignoreRails,
            ignoreTombs,
            ignoreWater,
            ignoreSky,
            ignoreSea
        ) {
            let cart

            if (terrainRestrictions === undefined) {
                terrainRestrictions = true
            }

            let canOverlap = true

            this.plantInSquare.forEach(function (plant) {
                if (canOverlap) {
                    if (!plant.allowOverlap || plantID === plant.ID) {
                        canOverlap = false
                    }
                }
            });

            return (
                (!this.plantCooling || !checkOverlap) &&
                (!checkOverlap || canOverlap) &&
                (ignoreRails || !this.rail || this.cart) &&
                (ignoreTombs || !this.haveTomb) &&
                (
                    !terrainRestrictions ||
                    ignoreWater ||
                    this.squareType !== LnC.SquareType.water ||
                    ((cart = this.cart) != null && cart.aboveTide) ||
                    this.hasLilyPad ||
                    this.hasFloawerPot
                ) &&
                (
                    !terrainRestrictions ||
                    ignoreSky ||
                    this.squareType !== LnC.SquareType.sky ||
                    this.hasFloawerPot
                ) &&
                !this.iceTile &&
                (
                    ignoreSea ||
                    this.squareType !== LnC.SquareType.sea
                )
            )
        }

    })
}