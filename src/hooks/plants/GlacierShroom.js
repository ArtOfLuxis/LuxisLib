import {wrapObjDataOwnPlant} from "./Plant";
import {createDetector} from "./extra/DetectorManager";

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const glacierShroom = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/GlacierShroom.ts")
        const nodePools = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/NodePools.ts")
        const square = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/Square.ts")
        const character = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/Character.ts")
        const proto = glacierShroom.GlacierShroomPlant.prototype

        const cc = ctx.unsafe.engine.getCc()

        wrapObjDataOwnPlant(ctx, proto, {
            "IceAuraOverride": null,
        })


        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "specialPlantOnSquareChange",
            handler: ({args, thisArg, callNext}) => {
                const iceAuraOverride = thisArg.objdataOwn.IceAuraOverride
                if (!iceAuraOverride) return callNext(...args)

                const newSquare = args[1]

                const detector = iceAuraOverride.DetectorOverride
                if (detector) createDetector(thisArg, detector)
                else thisArg.detector = character.Rectangle.createRectangleNodeCenter(
                    newSquare.node,
                    square.Square.SquareWidth * 3,
                    square.Square.SquareHeight * 3
                )

                thisArg.tileBuffParticles.forEach(function (tileParticle) {
                    tileParticle.playAnimation("Fade", 1)
                })
                thisArg.tileBuffParticles = []

                const laneOffsets = iceAuraOverride.AuraLanes ?? [-1,0,1]
                laneOffsets.forEach(function (offset) {
                    const laneIndex = thisArg.inLane.LaneIndex + offset

                    if (laneIndex >= 0 && laneIndex <= 4) {
                        const lane = square.Square.getLane(laneIndex)
                        const tile = nodePools.NodePools.instantiatePooly(thisArg.tileChillBuff)
                        tile.parent = lane.node

                        const armature = tile.components.find(c => c.playAnimation && c.armature)
                        armature.playAnimation("Spawn", 1)

                        const position = square.Square.getSquareWorldPosition(lane.LaneIndex, thisArg.inLnC.cIndex)
                        tile.worldPosition = new cc.Vec3(position.x, position.y, 4)
                        tile.setSiblingIndex(0)

                        thisArg.tileBuffParticles.push(armature)
                    }
                })

                thisArg.tileBuffParticles.forEach(function (tileParticle) {
                    tileParticle.scale = new cc.Vec3(5, 5, 1)
                    tileParticle.armature().getSlots().forEach(function (slot) {
                        if (slot.name.includes("_snow")) {
                            slot._setDisplayIndex(thisArg.lit ? 0 : -1)
                        }
                    })
                })
            }
        })

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "detectInRangeEnemies",
            handler: ({ args, thisArg, callNext }) => {
                const override = thisArg.objdataOwn.IceAuraOverride
                const detector = override?.DetectorOverride

                if (!detector) return callNext(...args)

                const zombies = new Set()

                const laneOffsets = detector.lanes ?? [-1, 0, 1]

                laneOffsets.forEach(offset => {
                    const laneIndex = thisArg.inLane.LaneIndex + offset

                    if (laneIndex < 0 || laneIndex > 4) return

                    const lane = square.Square.getLane(laneIndex)

                    lane.zombiePool().forEach(zombie => {
                        if (thisArg.detector.judgeCrossRec(zombie.bodyRecReal)) {
                            zombies.add(zombie)
                        }
                    })
                })

                return zombies
            }
        })



        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "specialPlantUpdate",
            handler: ({ args, thisArg, callNext }) => {
                const override = thisArg.objdataOwn.IceAuraOverride
                if (!override) return callNext(...args)

                const deltaTime = args[0]

                if (thisArg.eatFreezeCooldown > 0)
                    thisArg.eatFreezeCooldown -= deltaTime

                if (!thisArg.fooding) {
                    if (thisArg.sleeping > 0)
                        thisArg.sleeping -= deltaTime

                    if (thisArg.sleeping < 0 && !thisArg.awaken) {
                        thisArg.awaken = true
                        thisArg.anmControl.playAnimation("Wake", 1)
                        thisArg.soundRes.playWakeSound()
                        thisArg.anmControl.IdleAnim = "Idle"
                        thisArg.anmControl.RandomAnim = ["Rand1", "Rand2"]
                        thisArg.baseColor = new cc.Color(255, 255, 255, 255)
                    }

                    thisArg.litSlots.forEach(slot => {
                        slot._setDisplayIndex(thisArg.lit ? 0 : -1)
                    })
                }

                thisArg.detectInRangeEnemies().forEach(zombie => {
                    zombie.setChill(override.AuraChillDuration ?? 2)
                })

                if (thisArg.lit || override.NeedsPFToBoost === false) {
                    const boostArea = override.BoostArea ?? {"x": 3, "y": 3}
                    const squares = thisArg.inLnC.getArea(
                        boostArea.x, boostArea.y,
                        boostArea.xOffset ?? 0,
                        boostArea.yOffset ?? 0
                    )

                    const boostedFamilies = override.BoostedFamilies ?? [thisArg.family_str]
                    const boostedPlants = override.BoostedPlants ?? []
                    const boostSpeedMultiplier = override.BoostSpeedMultiplier ?? 2

                    squares.forEach(square => {
                        square?.getAllPlants()?.forEach(plant => {
                            if (
                                plant !== thisArg && (
                                    boostedFamilies.includes(plant.family_str) ||
                                    boostedPlants.includes(plant.Plant_Type)
                                )
                            ) {
                                plant.plantCDScaleSetter(1 / boostSpeedMultiplier, 1)
                            }
                        })
                    })
                }

                const laneOffsets = override.DetectorOverride?.lanes ?? [-1, 0, 1]

                laneOffsets.forEach(offset => {
                    const laneIndex = thisArg.inLane.LaneIndex + offset

                    if (laneIndex < 0 || laneIndex > 4) return

                    const lane = square.Square.getLane(laneIndex)

                    lane.tntPool().forEach(tnt => {
                        if (tnt.ignited && thisArg.detector.judgeInRecP(tnt.ropeSideWP)) {
                            tnt.ignited = false
                        }
                    })
                })
            }
        })


    })
}