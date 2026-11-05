import {evaluate} from "../../modules/JSONActionsSystem.ts";
import {imitatorSeedPacketPlants} from "../plants/Imitater";

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const LnC = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/LnC.ts")
        const cards = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/Cards.ts")
        const plants = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/Plants.ts")
        const square = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/Square.ts")
        const ui = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/UI.ts")
        const levelController = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/levelController.ts")
        const nodePools = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/NodePools.ts")
        const characterManager = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/CharacterManager.ts")
        const particles = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/Particles.ts")
        const soundResources = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/SoundRescourses.ts")
        const levelTaskCount = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/LevelTaskCount.ts")
        const proto = LnC.LnC.prototype

        const cc = ctx.unsafe.engine.getCc()

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

        const getPlantSunCostForLevelTask = (lnc, plantID, props) => {
            const ui = lnc.UIInGame
            const currentCard = ui.currentCF

            if (currentCard && (currentCard.ID === plantID || currentCard.Type === plantID)) {
                return currentCard.SUNCOST ?? 0
            }

            return 0
        }

        const wouldBreakSunCostLimit = (lnc, plantID, props) => {
            const ui = lnc.UIInGame
            const task = ui.getLevelTaskObject(levelTaskCount.LevelTaskCountModeEnum.SunCostLimit)

            if (!task || task.LeftSun === undefined || task.LeftSun === null) return false

            const cost = getPlantSunCostForLevelTask(lnc, plantID, props)

            return cost > task.LeftSun
        }

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "putPlantAvailable",
            handler: ({ args, thisArg, callNext }) => {
                let result = callNext(...args)

                const plantID = args[1]

                if (plants.plants.getPlantFeature(plantID).RES.Plant === "Imitater") {
                    result = true

                    if (plants.plants.getPlantProps(plantID).MakesPlantSeedPacket) {
                        result = imitatorSeedPacketPlants(thisArg, null).length > 0
                    }
                }

                if (!result) return result

                const props = plants.plants.getPlantProps(plantID)

                if (wouldBreakSunCostLimit(thisArg, plantID, props)) {
                    thisArg.UIInGame.warnLevelTask(
                        levelTaskCount.LevelTaskCountModeEnum.SunCostLimit
                    )
                    return false
                }

                if (typeof plantID === "number" && !isNaN(plantID)) {
                    const dynamicPlantableCondition = props.DynamicPlantableCondition

                    if (dynamicPlantableCondition) {
                        return evaluate(dynamicPlantableCondition, {
                            target: thisArg,
                            source: thisArg,
                            originalResult: result,
                            checkOverlap: args[0],
                            plantID: plantID,
                            terrainRestrictions: args[2] ?? true
                        })
                    }
                }

                return result
            }
        })

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "explodeCherry3x3",
            handler: ({args, thisArg, callNext}) => {
                let [
                    damage,
                    showExplosionText = false,
                    explosionPrefab = null,
                    explosionSound = null,
                    color = null,
                    scale = { "x": 1, "y": 1, "z": 1 },
                    explosionWidth = 3,
                    explosionHeight = 3,
                    explosionLanes = [-1,0,1],
                    explosionFogClear = 150,
                    xOffset = 0,
                    yOffset = 0,
                    armorProtection = false,
                    armorKnockSound = false,
                    bodyKnockSound = false,
                    damageType = "fire",
                    screenShakeDuration = 0.2,
                    position = null,
                    playSound = true,
                    extraZombieCallback = (zombie) => {}
                ] = args

                position = (position ?? thisArg.node.worldPosition).clone()
                position.x += xOffset * square.Square.SquareWidth
                position.y += yOffset * square.Square.SquareHeight

                damageType = characterManager.ZombieDamageType[damageType]

                const scaleVec = new cc.Vec3(
                    (scale.x ?? 1) * 0.7,
                    (scale.y ?? 1) * 0.7,
                    (scale.z ?? scale.x ?? 1) * 0.7,
                )

                square.Square.setFogLight(thisArg.node.worldPosition.toVec2(), explosionFogClear)

                if (screenShakeDuration >= 0.2) {
                    levelController.LevelPlay.shakeScreen(screenShakeDuration)
                }

                const damageInstance = new characterManager.ZombieDamageDetails(
                    damage,
                    armorProtection,
                    armorKnockSound,
                    bodyKnockSound,
                    null,
                    damageType,
                    true,
                    true
                )

                damageInstance.bugKiller = true

                const zombies = thisArg.getEntitiesInArea(
                    (lane) => lane.zombiePool(),
                    position,
                    explosionWidth,
                    explosionHeight,
                    0,
                    0,
                    explosionLanes,
                    (zombie) => zombie.bodyRecReal
                )

                zombies.forEach((zombie) => {
                    if (extraZombieCallback)
                        extraZombieCallback(zombie)

                    const direction = new cc.Vec2(
                        zombie.worldPositionX - thisArg.node.worldPosition.x,
                        zombie.zombieHeight + zombie.height
                    ).normalize().multiplyScalar(25)

                    zombie.dealDamage(damageInstance.replaceDirection(direction))
                })

                if (thisArg.inLane) {
                    const tombs = thisArg.getEntitiesInArea(
                        (lane) => lane.tombPool(),
                        position,
                        explosionWidth,
                        explosionHeight,
                        0,
                        0,
                        explosionLanes,
                        (tomb) => tomb.bodyRec
                    )

                    tombs.forEach((tomb) => {
                        tomb.dealDamage(damageInstance)
                    })
                }

                if (playSound) {
                    if (explosionSound) {
                        soundResources.sounds.playOneShot(explosionSound, 1, 0.1)
                    } else {
                        soundResources.sounds.playExplosion()
                    }
                }

                explosionPrefab ||= particles.particle.explosion(showExplosionText)

                const explosion = nodePools.instantiatePooly(explosionPrefab)
                explosion.parent = thisArg.inLane.prjLayer
                explosion.worldPosition = position
                explosion.scale = scaleVec

                explosion.components.forEach(c => {
                    c.color = cc.Color.WHITE
                })

                if (color) {
                    explosion.components.forEach(c => {
                        c.color = color
                    })
                }

                if (
                    thisArg.squareType === LnC.SquareType.solid ||
                    thisArg.squareType === LnC.SquareType.deck ||
                    thisArg.squareType === LnC.SquareType.water
                ) {
                    const rearExplosion = nodePools.instantiatePooly(particles.particle.explosionRear())

                    rearExplosion.parent = thisArg.inLane.tileLiquidLayer
                    rearExplosion.worldPosition = position
                    rearExplosion.scale = scaleVec
                }
            }
        })


        proto.getEntitiesInArea = function (
            entityPool,
            centerPosition,
            width,
            height,
            xOffset = 0,
            yOffset = 0,
            lanes = [0],
            getHitbox = entity => entity.bodyRecReal
        ) {
            const area = characterManager.Rectangle.createRectangleCenter(
                new cc.Vec2(
                    centerPosition.x + xOffset,
                    centerPosition.y + yOffset
                ),
                square.Square.SquareWidth * width,
                square.Square.SquareHeight * height
            )

            const entities = []

            lanes.forEach((offset) => {
                const lane = square.Square.getLane(this.lIndex + offset)
                if (!lane) return

                entityPool(lane).forEach((entity) => {
                    const hitbox = getHitbox(entity)

                    if (!hitbox)
                        console.warn("null hitbox", hitbox, {
                            entityPool,
                            centerPosition,
                            width,
                            height,
                            xOffset,
                            yOffset,
                            lanes,
                            getHitbox
                        })

                    if (
                        hitbox &&
                        area.judgeCrossRec(hitbox) &&
                        !entities.includes(entity)
                    ) {
                        entities.push(entity)
                    }
                })
            })

            return entities
        }


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