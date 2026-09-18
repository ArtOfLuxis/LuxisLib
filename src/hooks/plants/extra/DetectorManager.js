
export let createDetector

function wrapDetector(ctx, plantID) {
    const square = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/Square.ts")
    const plant = ctx.unsafe.engine.getSystemModule(`chunks:///_virtual/${plantID}.ts`)

    const cc = ctx.unsafe.engine.getCc()

    ctx.log.info("Patching " + plantID)
    let protoID = `${plantID}Plant`
    const proto = plant[protoID].prototype

    const detectorFunctions = [
        "setDetecter",
        "specialPlantOnSquareChange"
    ]
    detectorFunctions.forEach((func) => {
        if (typeof proto[func] === "function") {
            ctx.unsafe.hooks.wrapMethod({
                target: proto,
                methodName: func,
                handler: ({args, thisArg, callNext}) => {
                    callNext(...args)
                    const detectors = createDetector(thisArg, thisArg.objdataOwn.DetectorOverride)
                    if (detectors) thisArg.detectors = detectors
                }
            })
        } else ctx.log.warn(`${func} doesnt exist for ${plantID}`)
    })

    const laneOffsetReturningPlants = new Set(["Dandelion"])
    const alwaysShootHandlers = {
        Dandelion(result) {
            return result === -2
                ? Math.floor(Math.random() * 3) - 1
                : 0
        }
    }

    let detectFunction = "detectEnemy"
    switch (plantID) {
        case "AppleMortar":
            detectFunction = "detectEnemies3"
            break
        case "BowlingBulb":
        case "Dandelion":
        case "SporeShroom":
        case "SlingPea":
            detectFunction = "detectEnemies"
            break
        case "Cactus":
            detectFunction = "detectShootEnemy"
    }

    if (typeof proto[detectFunction] === "function") {
        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: detectFunction,
            handler: ({ args, thisArg, callNext }) => {
                const overrides = thisArg.objdataOwn.DetectorOverride
                const result = callNext(...args)

                const alwaysShoots = thisArg.objdataOwn.AlwaysShoots
                if (!overrides && !alwaysShoots)
                    return result

                let newResult = false
                let laneOffset = 0

                if (alwaysShoots) {
                    newResult = true
                    laneOffset = alwaysShootHandlers[plantID]?.(result) ?? 0
                } else {
                    const overrideList = Array.isArray(overrides)
                        ? overrides
                        : [overrides]

                    const detectors = thisArg.detectors ?? []

                    outer:
                        for (let i = 0; i < overrideList.length; i++) {
                            const override = overrideList[i]
                            const detector = detectors[i]

                            if (!detector)
                                continue

                            const lanes = override.lanes ?? [0]

                            for (const offset of lanes) {
                                const laneIndex = thisArg.inLnC.lIndex + offset

                                if (laneIndex < 0 || laneIndex > 4)
                                    continue

                                const lane = square.Square.getLane(laneIndex)

                                let condition = lane.zombiePool().some(zombie =>
                                        detector.judgeCrossRec(zombie.bodyRecForShooter)
                                    ) ||
                                    lane.tombPool().some(tomb =>
                                        detector.judgeCrossRec(tomb.bodyRec)
                                    )
                                if (plantID == "HomingThistle") {
                                    const characterManager = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/CharacterManager.ts")
                                    const zombiePool = characterManager.ZombiePool;
                                    const tombpool = characterManager.TombPool;
                                    let zombie = zombiePool.getBodyRecLeftest(function(zombie) {
                                        return !zombie.objdataOwn.IgnoredByHomingThistle && zombie.height_depth <= 100
                                    })
                                    let tomb = tombpool.getLeftest(function(tomb) {
                                        return tomb.lIndexReal == lane
                                    })
                                    if (zombie || tomb)
                                        condition = (
                                            detector.judgeCrossRec(zombie?.bodyRecForShooter) ||
                                            detector.judgeCrossRec(tomb?.bodyRec)
                                        )
                                    else condition = false;
                                }
                                if (condition) {
                                    newResult = true
                                    laneOffset = offset
                                    break outer
                                }
                            }
                        }
                }

                return laneOffsetReturningPlants.has(plantID)
                    ? laneOffset
                    : newResult
            }
        })
    } else ctx.log.warn(`${detectFunction} doesn't exist for ${plantID}`)

    if (typeof proto["getDirections"] === "function") {
        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "getDirections",
            handler: ({ thisArg, callNext }) => {
                const getDirections = () => {
                    if (thisArg.objdataOwn.ForcedDirections) {
                        return thisArg.objdataOwn.ForcedDirections.map((dir) => new cc.Vec2(dir.x ?? 0, dir.y ?? 0))
                    }

                    const overrides = thisArg.objdataOwn.DetectorOverride

                    if (!overrides)
                        return callNext()

                    if (thisArg.objdataOwn.AlwaysShoots) {
                        return [
                            new cc.Vec2(1, 1),
                            new cc.Vec2(-1, 1),
                            new cc.Vec2(1, -1),
                            new cc.Vec2(-1, -1)
                        ]
                    }

                    const overrideList = Array.isArray(overrides)
                        ? overrides
                        : [overrides]

                    const detectors = thisArg.detectors ?? []
                    const directions = []

                    const addDirection = (x, y) => {
                        if (!directions.some(dir => dir.x === x && dir.y === y)) {
                            directions.push(new cc.Vec2(x, y))
                        }
                    }

                    for (let i = 0; i < overrideList.length; i++) {
                        const override = overrideList[i]
                        const detector = detectors[i]

                        if (!detector)
                            continue

                        const lanes = override.lanes ?? [0]

                        for (const offset of lanes) {
                            const laneIndex = thisArg.inLnC.lIndex + offset

                            if (laneIndex < 0 || laneIndex > 4)
                                continue

                            const lane = square.Square.getLane(laneIndex)

                            lane.zombiePool().forEach(zombie => {
                                if (!detector.judgeCrossRec(zombie.bodyRecForShooter))
                                    return

                                const dx = Math.sign(zombie.worldPositionX - thisArg.worldPositionX)
                                const dy = Math.sign(zombie.worldPositionY - thisArg.worldPositionY)

                                if (dx === 0) {
                                    if (dy === 0) {
                                        addDirection(1, 1)
                                        addDirection(1, -1)
                                        addDirection(-1, 1)
                                        addDirection(-1, -1)
                                    } else {
                                        addDirection(1, dy)
                                        addDirection(-1, dy)
                                    }
                                } else if (dy === 0) {
                                    addDirection(dx, 1)
                                    addDirection(dx, -1)
                                } else {
                                    addDirection(dx, dy)
                                }
                            })

                            lane.tombPool().forEach(tomb => {
                                if (Math.abs(tomb.cIndex - thisArg.cIndex) !== Math.abs(tomb.lIndex - thisArg.lIndex))
                                    return

                                const dx = Math.sign(tomb.worldPositionX - thisArg.worldPositionX)
                                const dy = Math.sign(tomb.worldPositionY - thisArg.worldPositionY)

                                addDirection(dx, dy)
                            })
                        }
                    }

                    return directions
                }

                if (thisArg.___LuxisLibCachedDirections) {
                    return thisArg.___LuxisLibCachedDirections
                }

                let directions = getDirections()

                const limit = thisArg.objdataOwn.LimitDirectionAmount

                if (typeof limit === "number" && limit >= 0) {
                    directions = [...directions]

                    for (let i = directions.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1))
                        ;[directions[i], directions[j]] = [directions[j], directions[i]]
                    }

                    directions.length = Math.min(limit, directions.length)

                    thisArg.___LuxisLibCachedDirections = directions
                }

                return directions
            }
        })
    }

    if (plantID === "SlingPea") {
        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "_shoot",
            handler: ({ args, thisArg, callNext }) => {
                const overrides = thisArg.objdataOwn.DetectorOverride
                if (!overrides) return callNext(...args)

                const overrideList = Array.isArray(overrides) ? overrides : [overrides]
                const detectors = thisArg.detectors ?? []
                const laneDetectors = new Map()

                overrideList.forEach((override, i) => {
                    const detector = detectors[i]
                    if (!detector) return
                    const lanes = override.lanes ?? [0]
                    lanes.forEach((offset) => {
                        const laneIndex = thisArg.inLnC.lIndex + offset
                        if (laneIndex < 0 || laneIndex > 4) return
                        if (!laneDetectors.has(laneIndex)) laneDetectors.set(laneIndex, [])
                        laneDetectors.get(laneIndex).push(detector)
                    })
                })

                const originalGetAllLane = square.Square.getAllLane
                square.Square.getAllLane = (...laneArgs) => {
                    return originalGetAllLane.apply(square.Square, laneArgs)
                        .filter((lane) => laneDetectors.has(lane.LaneIndex))
                        .map((lane) => {
                            const rects = laneDetectors.get(lane.LaneIndex)
                            return {
                                zombiePool: () => lane.zombiePool().filter((z) =>
                                    rects.some((rect) => rect.judgeCrossRec(z.bodyRecForShooter))
                                ),
                                tombPool: () => lane.tombPool().filter((t) =>
                                    rects.some((rect) => rect.judgeCrossRec(t.bodyRec))
                                )
                            }
                        })
                }

                try {
                    return callNext(...args)
                } finally {
                    square.Square.getAllLane = originalGetAllLane
                }
            }
        })
    }
}

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const characterManager = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/CharacterManager.ts")
        const square = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/Square.ts")

        const cc = ctx.unsafe.engine.getCc()

        ctx.log.info("Patching plant detectors")

        createDetector = function (thisArg, overrides) {
            if (!overrides || overrides.length <= 0)
                return null

            if (!Array.isArray(overrides))
                overrides = [overrides]

            const detectors = []

            const LnC = thisArg.inLnC

            for (const override of overrides) {
                const isCentered = override.isCentered ?? false

                const xOffset = override.xOffset ?? 0
                const yOffset = override.yOffset ?? 0

                let center
                let width

                const limitDetectorOutsideLawn = override.limitDetectorOutsideLawn ?? true

                if (isCentered) {
                    if (limitDetectorOutsideLawn) {
                        const behind = Math.min(
                            Math.max(0, LnC.cIndex - xOffset),
                            override.x - 1
                        )

                        const inFront = Math.min(
                            Math.max(0, 8 - LnC.cIndex + xOffset),
                            override.x - behind - 1
                        )

                        width = (behind + inFront + 1) * square.Square.SquareWidth

                        center = new cc.Vec2(
                            thisArg.worldPosition.x +
                            (inFront - behind) * square.Square.SquareWidth / 2 +
                            xOffset * square.Square.SquareWidth,
                            thisArg.worldPosition.y +
                            yOffset * square.Square.SquareHeight
                        )
                    } else {
                        width = override.x * square.Square.SquareWidth

                        center = new cc.Vec2(
                            thisArg.worldPosition.x +
                            xOffset * square.Square.SquareWidth,
                            thisArg.worldPosition.y +
                            yOffset * square.Square.SquareHeight
                        )
                    }
                } else {
                    if (limitDetectorOutsideLawn) {
                        width =
                            Math.min(
                                override.x,
                                9 - LnC.cIndex + xOffset
                            ) * square.Square.SquareWidth
                    } else {
                        width = override.x * square.Square.SquareWidth
                    }

                    center = new cc.Vec2(
                        LnC.node.worldPosition.x +
                        xOffset * square.Square.SquareWidth +
                        width / 2,
                        LnC.node.worldPosition.y +
                        yOffset * square.Square.SquareHeight
                    )
                }

                const height = override.y * square.Square.SquareHeight

                const angle = override.rotobagaDetectorRotation
                    ? (
                    override.rotobagaDetectorRotation === "first"
                        ? Math.atan2(square.Square.SquareHeight, square.Square.SquareWidth)
                        : Math.atan2(-square.Square.SquareHeight, square.Square.SquareWidth)
                ) * 180 / Math.PI
                    : undefined

                detectors.push(
                    characterManager.Rectangle.createRectangleCenter(
                        center,
                        width,
                        height,
                        angle
                    )
                )
            }

            return detectors
        }

        const detectorPlants = [
            "Peashooter", "ThreePeater", "PuffShroom",
            "RedStinger", "AppleMortar", "Peanut",
            "StarFruit", "ShootingStarfruit",
            "BowlingBulb", "CabbagePult",
            "Cactus", "Dandelion",
            "Anthurium", "SplitPea",
            "FirePeashooter", "SporeShroom",
            "Rotobaga", "SlingPea", "HomingThistle"
        ]

        detectorPlants.forEach((plantID) => {
            wrapDetector(ctx, plantID)
        })
    })
}