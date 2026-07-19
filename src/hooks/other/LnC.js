import {evaluate} from "../../modules/JSONActionsSystem";
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

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "putPlantAvailable",
            handler: ({args, thisArg, callNext}) => {

                let result = callNext(...args)

                const plantID = args[1]

                if (plants.plants.getPlantFeature(plantID).RES.Plant === "Imitater") {
                    result = true
                    if (plants.plants.getPlantProps(plantID).MakesPlantSeedPacket) {
                        result = imitatorSeedPacketPlants(thisArg, null).length > 0
                    }
                }

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
                    scale = { "x": 0.7, "y": 0.7, "z": 0.7 },
                    explosionWidth = 3,
                    explosionHeight = 3,
                    explosionLanes = [-1,0,1],
                    xOffset = 0,
                    yOffset = 0,
                    armorProtection = false,
                    armorKnockSound = false,
                    bodyKnockSound = false,
                    damageType = "fire",
                    screenShakeDuration = 0.2,
                    position = null,
                    extraZombieCallback = (zombie) => {}
                ] = args

                position = (position ?? thisArg.node.worldPosition).clone()
                position.x += xOffset
                position.y += yOffset

                damageType = characterManager.ZombieDamageType[damageType]

                const scaleVec = new cc.Vec3(
                    scale.x ?? 0.7,
                    scale.y ?? 0.7,
                    scale.z ?? scale.x ?? 0.7,
                )

                const column = thisArg.cIndex
                const lane = thisArg.lIndex

                const fogWidth = Math.ceil(explosionWidth)
                const fogHeight = Math.ceil(explosionHeight)

                const outerRadiusX = Math.ceil(fogWidth / 2)
                const outerRadiusY = Math.ceil(fogHeight / 2)

                const innerRadiusX = Math.floor(fogWidth / 2)
                const innerRadiusY = Math.floor(fogHeight / 2)

                for (let ly = -outerRadiusY; ly <= outerRadiusY; ly++) {
                    for (let lx = -outerRadiusX; lx <= outerRadiusX; lx++) {
                        if (
                            Math.abs(lx) <= innerRadiusX &&
                            Math.abs(ly) <= innerRadiusY
                        ) {
                            continue
                        }

                        const fog = square.Square.getFog(lane + ly, column + lx)
                        if (fog) fog.setPlanternCD(7)
                    }
                }

                for (let ly = -innerRadiusY; ly <= innerRadiusY; ly++) {
                    for (let lx = -innerRadiusX; lx <= innerRadiusX; lx++) {
                        const fog = square.Square.getFog(lane + ly, column + lx)
                        if (fog) fog.setPlanternCD(10)
                    }
                }

                levelController.LevelPlay.shakeScreen(screenShakeDuration)

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

                if (explosionSound) {
                    soundResources.sounds.playOneShot(explosionSound, 1, 0.1)
                } else {
                    soundResources.sounds.playExplosion()
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

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "selection",
            handler: ({ thisArg }) => {
                const currentCF = ui.UIInGame.component.currentCF
                const plantType = currentCF?.Type

                const plantData = plantType
                    ? plants.plants.getPlantEnumWithPropByPlantTypes(plantType)
                    : null

                const plantID = plantData?.id ?? NaN

                thisArg.index = 0

                const canPlacePlant =
                    (thisArg.putPlantAvailable(true, plantID, true, true, plantData?.spf) ||
                        thisArg.replantable(plantID)) &&
                    ui.UIInGame.index >= 0 &&
                    ui.UIInGame.index <= 8

                if (canPlacePlant) {
                    thisArg.index = 1
                } else if (square.Square.component?.indexShovel === 1) {
                    const hasShovelTarget = thisArg
                        .getAllPlants()
                        .some(plant => plant.shovelable())

                    if (hasShovelTarget) {
                        thisArg.index = 1
                    } else if (levelController.LevelPlay.isBeghouled) {
                        if (thisArg.crackleCountdown > 0) {
                            thisArg.index = 1
                        }
                    } else if (
                        levelController.LevelPlay.sandBoxModeOn &&
                        (
                            thisArg.iceTile ||
                            thisArg.crackleCountdown > 0 ||
                            thisArg.haveTomb ||
                            thisArg.TileLiquids.length > 0 ||
                            thisArg.tilesInSquare[0] ||
                            thisArg.octopus ||
                            thisArg.iceblock
                        )
                    ) {
                        thisArg.index = 1
                    }
                } else {
                    const canUseSpecialAction =
                        (thisArg.foodable() && square.Square.component?.indexPF === 1) ||
                        ui.UIInGame.index === 9 ||
                        (ui.UIInGame.index === -4 && thisArg.indexPoint === 1) ||
                        (ui.UIInGame.index === -1 &&
                            thisArg.vases.length > 0 &&
                            thisArg.indexPoint === 1)

                    if (canUseSpecialAction) {
                        thisArg.index = 1
                    }
                }

                if (thisArg.index === 0) {
                    thisArg.selectionDB?.playAnimation("Nope")
                    return
                }

                if (thisArg.indexPoint === 0) {
                    thisArg.selectionDB?.playAnimation(
                        square.Square.lncSelectionMode === 0 ? "Slow" : "Nope"
                    )
                } else if (thisArg.indexPoint === 1) {
                    thisArg.selectionDB?.playAnimation(
                        square.Square.lncSelectionMode === 0 ? "Fast" : "Nope"
                    )
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