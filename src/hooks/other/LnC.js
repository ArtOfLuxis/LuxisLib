import {evaluate} from "../../modules/JSONActionsSystem";

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const LnC = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/LnC.ts")
        const cards = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/Cards.ts")
        const plants = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/Plants.ts")
        const square = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/Square.ts")
        const proto = LnC.LnC.prototype

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "PlaceUIPlant",
            handler: ({args, thisArg, callNext}) => {
                const currentCF = thisArg.UIInGame.currentCF
                if (!currentCF.TotalPlanted) {
                    currentCF.TotalPlanted = 0
                }
                currentCF.TotalPlanted++

                return callNext(...args)
            }
        })

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "removePlant",
            handler: ({args, thisArg, callNext}) => {
                const result = callNext(...args)

                cards.Cards.component.CFs.forEach((card) => {
                    card.SUNCOST += 0 // to update suncost on all cards
                })

                return result
            }
        })

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "putPlantAvailable",
            handler: ({args, thisArg, callNext}) => {

                const result = callNext(...args)

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

                    if (plants.plants.getPlantFeature(plantID).RES.Plant === "Imitater")
                        return true
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

        proto.getArea = function (x, y, xOffset = 0, yOffset = 0) {
            const result = []
            const startX = this.cIndex + xOffset - Math.floor(x / 2)
            const startY = this.lIndex - yOffset - Math.floor(y / 2)

            for (let ly = 0; ly < y; ly++) {
                for (let lx = 0; lx < x; lx++) {
                    const lnc = square.Square.getLnC(startY + ly, startX + lx)
                    if (lnc) result.push(lnc)
                }
            }

            return result
        }

    })
}