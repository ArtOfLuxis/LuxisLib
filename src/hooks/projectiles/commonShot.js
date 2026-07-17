import {executeActions} from "../../modules/JSONActionsSystem";
import {libProperties} from "../other/JSONs";

export let createProjectileSpread
export let createLobberProjectileSpread

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const commonShot = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/commonShot.ts")
        const projectiles = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/Projectiles.ts")
        const character = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/Character.ts")
        const zombie = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/Zombie.ts")
        const characterManager = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/CharacterManager.ts")
        const square = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/Square.ts")
        const levelController = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/levelController.ts")
        const projectileShootingFunctions = projectiles.ProjectileShootingFunctions
        const proto = commonShot.commonShot.prototype

        const cc = ctx.unsafe.engine.getCc()

        const projectileKeys = {
            "Scale": null,
            "ColorOffset": null,
            "ColorMult": null,
            "ProjectileSpread": null,
            "LobberProjectileSpread": null,
            "ZombieInvisibilityPotion": null,
            "ZombieToughnessPotion": null,
            "ZombieSpeedPotion": null,
            "OnEnableActions": null,
            "OnHitActions": null,
            "OnUpdateActions": null,
            "EnemyTypeOverride": null,
            "CanBePeaVineBuffed": null,
            "PierceOverride": null,
        }

        ctx.unsafe.hooks.wrapProperty({
            target: proto,
            key: "objdata",
            set: ({ nextValue, thisArg }) => {
                Object.entries(projectileKeys).forEach(([key, value]) => {
                    if (thisArg._objdata[key] === undefined) {
                        thisArg._objdata[key] = value
                    }
                })

                return nextValue
            }
        })

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "defaultReadObjdata",
            handler: ({ args, thisArg, callNext }) => {
                callNext(...args)

                const objdata = args[0]

                Object.keys(projectileKeys).forEach((key) => {
                    const value = objdata[key]

                    if (value === undefined || value === null) return

                    switch (key) {
                        case "LobberProjectileSpread":
                        case "ProjectileSpread": {
                            thisArg[key] = value
                            thisArg.speedScale = 0
                            break
                        }
                        case "Scale": {
                            thisArg.scale = value
                            break
                        }
                        case "PierceOverride": {
                            thisArg.___LuxisLibPiercePlayHitSound = value.PlayHitSound ?? true
                            thisArg.___LuxisLibPiercePlayHitParticle = value.PlayHitParticle ?? false
                            const min = value.Amount.min
                            const max = value.Amount.max
                            thisArg.___LuxisLibMaxPierceAmount = Math.floor(Math.random() * (max - min + 1)) + min
                            thisArg.___LuxisLibDealtTargetAmount = 0
                            thisArg.___LuxisLibContactingEnemies = []
                            break
                        }
                        default: {
                            thisArg[key] = value
                            break
                        }
                    }
                })
            }
        })

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "characterOnEnable",
            handler: ({ args, thisArg, callNext }) => {
                callNext(...args)

                if (thisArg.ProjectileSpread || thisArg.LobberProjectileSpread) {
                    thisArg.speedScale = 0
                }

                if (thisArg.OnEnableActions) {
                    executeActions(thisArg.OnEnableActions, {
                        target: thisArg,
                        source: thisArg,
                    })
                }
            }
        })

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "shouldMaterial",
            handler: ({ args, thisArg, callNext }) => {
                callNext(...args)

                const color = new cc.Vec4(0, 0, 0, 1)

                const offset = thisArg.ColorOffset
                if (offset) {
                    color.x += offset.r / 255 ?? 0
                    color.y += offset.g / 255  ?? 0
                    color.z += offset.b / 255  ?? 0
                }

                const colorMult = thisArg.objdataOwn.ColorMult

                const pass = thisArg.material.passes[0]

                pass.setUniform(pass.getHandle("addColor"), color)
                if (colorMult) pass.setUniform(pass.getHandle("multColor"), new cc.Vec4(
                    colorMult.r ?? 1,
                    colorMult.g ?? 1,
                    colorMult.b ?? 1,
                    1
                ))

                thisArg.db.customMaterial = thisArg.material
            }
        })

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "detectEnemy",
            handler: ({args, thisArg, callNext}) => {
                if (thisArg.EnemyTypeOverride) {
                    thisArg.enemyType = character.CharacterType[thisArg.EnemyTypeOverride]
                }

                if (thisArg._hasSpread || (!thisArg.ProjectileSpread && !thisArg.LobberProjectileSpread))
                    return callNext(...args)

                const originX = thisArg._worldPositionX
                const originY = thisArg._worldPositionY
                const height = thisArg.height
                const prjLayer = thisArg.inLane.prjLayer
                const speed = Math.hypot(
                    thisArg.linearVelocity.x,
                    thisArg.linearVelocity.y
                )
                const enemyType = thisArg.enemyType

                if (thisArg.ProjectileSpread) {
                    createProjectileSpread(
                        thisArg.ProjectileSpread,
                        thisArg.inLnC,
                        originX, originY,
                        height, speed,
                        prjLayer, enemyType
                    )
                }
                if (thisArg.LobberProjectileSpread) {
                    createLobberProjectileSpread(
                        thisArg.LobberProjectileSpread,
                        thisArg.inLnC,
                        originX, originY,
                        height, thisArg.gravity,
                        prjLayer,
                        thisArg.inLnC,
                        thisArg.linearVelocity.clone(),
                        thisArg.bodyLinearVelocity,
                        enemyType
                    )
                }
                thisArg.fade()
            }
        })

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "dealDamageToZombie",
            handler: ({args, thisArg, callNext}) => {
                callNext(...args)

                const zombie = args[0]

                const invisibilityPotion = thisArg.ZombieInvisibilityPotion
                if (
                    invisibilityPotion !== undefined &&
                    (
                        invisibilityPotion.value ||
                        (zombie.potionInvisible && invisibilityPotion.forced)
                    )
                ) {
                    zombie.potionInvisible = invisibilityPotion
                }

                const clamp = (v, min, max) => Math.min(max, Math.max(min, v))

                const toughnessPotion = thisArg.ZombieToughnessPotion
                if (toughnessPotion !== undefined) {
                    zombie.potionToughnessLevel = clamp(
                        zombie.potionToughnessLevel + toughnessPotion.value,
                        toughnessPotion.min,
                        toughnessPotion.max
                    )
                }
                const speedPotion = thisArg.ZombieSpeedPotion
                if (speedPotion !== undefined)
                    zombie.potionSpeedLevel = clamp(
                        zombie.potionSpeedLevel + speedPotion.value,
                        speedPotion.min,
                        speedPotion.max
                    )


                const onHitActions = thisArg.OnHitActions
                if (onHitActions) {
                    executeActions(onHitActions, {
                        target: zombie,
                        source: thisArg
                    })
                }
            }
        })

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "addPeaBuff",
            handler: ({args, thisArg, callNext}) => {
                if (thisArg.CanBePeaVineBuffed || thisArg.CanBePeaVineBuffed === undefined) {
                    callNext(...args)
                }
            }
        })

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "update",
            handler: ({args, thisArg, callNext}) => {
                callNext(...args)

                const onUpdateActions = thisArg.OnUpdateActions
                if (onUpdateActions) {
                    executeActions(onUpdateActions, {
                        target: thisArg,
                        source: thisArg,
                        deltaTime: args[0]
                    })
                }
            }
        })


        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "detectEnemyNormal",
            handler: ({ args, thisArg, callNext }) => {
                const hasPierceProperties = typeof thisArg.___LuxisLibDealtTargetAmount === "number"
                if (
                    !hasPierceProperties &&
                    ((libProperties?.PeaVineDamageBoost ?? 1.5) === 1.5 || !thisArg.havePeaBuff)
                ) return callNext(...args)
                // there's some issues with piercing projectiles i have no idea how to fix
                // so always try to get vanilla behavior if possible

                const someArgIDK = args[0]

                if (!thisArg.inLane || !thisArg.detectEnemyOn)
                    return

                if (thisArg.targetLocked && thisArg.targetLocked instanceof zombie.Zombie) {
                    if (thisArg.targetLocked.potionInvisible || !thisArg.targetLocked.isAlive()) {
                        thisArg.targetLocked = null
                    }
                }

                const body = thisArg.bodyRec()

                thisArg.___LuxisLibContactingEnemies ??= []
                thisArg.___LuxisLibDealtTargetAmount ??= 0
                thisArg.___LuxisLibMaxPierceAmount ??= 1


                const pool = [
                    ...thisArg.inLane.zombiePool(),
                    ...thisArg.inLane.plantPool(),
                    ...thisArg.inLane.tombPool()
                ]

                thisArg.___LuxisLibContactingEnemies =
                    thisArg.___LuxisLibContactingEnemies.filter(enemy =>
                        pool.includes(enemy) &&
                        enemy.bodyRec?.judgeCrossRec(body)
                    )

                if (
                    thisArg.enemyType === character.CharacterType.zombie ||
                    thisArg.enemyType === character.CharacterType.plant
                ) {
                    let zombie = null
                    let minX = Infinity
                    let maxY = -Infinity

                    let pool =
                        thisArg.enemyType === character.CharacterType.zombie
                            ? thisArg.inLane?.zombiePool()
                            : thisArg.inLane?.hypnoZombiePool()

                    if (thisArg.ignoreDifferentLane || levelController.LevelPlay.AirRaidProps) {
                        pool =
                            thisArg.enemyType === character.CharacterType.zombie
                                ? character.ZombiePool.pool().concat()
                                : character.ZombiePool.hypnoPool().concat()
                    }

                    pool?.forEach(candidate => {
                        if (thisArg.___LuxisLibContactingEnemies.includes(candidate))
                            return

                        if (thisArg.targetLocked && zombie === thisArg.targetLocked)
                            return

                        const bodyRec = thisArg.JudgesZombieBodyRecForShooter
                            ? candidate.bodyRecForShooter
                            : candidate.bodyRec

                        if (!bodyRec || !bodyRec.judgeCrossRec(body))
                            return

                        if (thisArg.targetLocked && candidate !== thisArg.targetLocked)
                            return

                        const pos = bodyRec.prjX()

                        if (
                            !zombie ||
                            (thisArg.linearVelocity.x >= 0 && pos.x < minX) ||
                            (thisArg.linearVelocity.x < 0 && pos.y > maxY)
                        ) {
                            zombie = candidate
                            minX = pos.x
                            maxY = pos.y
                        }
                    })

                    const damageBuff = thisArg.havePeaBuff ?
                        (libProperties?.PeaVineDamageBoost ?? 1.5) :
                        1

                    const damage = new characterManager.ZombieDamageDetails(
                        thisArg.damage * thisArg.damageScale * damageBuff,
                        thisArg.armorProtection,
                        thisArg.armorKnockSound,
                        thisArg.bodyKnockSound,
                        thisArg,
                        thisArg.damageType,
                        true,
                        true
                    )

                    if (
                        thisArg.enemyType === character.CharacterType.plant &&
                        thisArg.damageToShip > 0 &&
                        body.prjX().x < levelController.LevelPlay.SkyCityShipProps?.EdgeXABS
                    ) {
                        levelController.LevelPlay.SkyCityShipProps.dealDamage(thisArg.damageToShip)
                        thisArg.dealSplashDamage()

                        if (thisArg.specialOnGroundHit(thisArg.inLnC)) {
                            thisArg.pop()
                        }

                        return
                    }

                    if (zombie) {
                        if (!thisArg.___LuxisLibContactingEnemies.includes(zombie)) {
                            if (zombie.commonShotPopOnTouch(thisArg)) {
                                thisArg.beforeZombieHit(zombie)
                                thisArg.dealDamageToZombie(zombie)
                                thisArg.onZombieHit(zombie)

                                thisArg.___LuxisLibContactingEnemies.push(zombie)
                                thisArg.___LuxisLibDealtTargetAmount++

                                if (thisArg.___LuxisLibDealtTargetAmount >= thisArg.___LuxisLibMaxPierceAmount) {
                                    thisArg.pop()
                                    return
                                }

                                if (thisArg.___LuxisLibPiercePlayHitSound === true) thisArg.playPopSound()
                                if (thisArg.___LuxisLibPiercePlayHitParticle === true) thisArg.playParticle()
                            }
                        }

                        return
                    }

                    if (!thisArg.objdataOwn.IgnoreTombstones) {
                        let tomb = null

                        thisArg.inLane?.tombPool(thisArg.enemyType === character.CharacterType.plant ? 1 : 0).forEach(candidate => {
                            if (
                                candidate.bodyRec.judgeCrossRec(body) &&
                                (!thisArg.targetLocked || candidate === thisArg.targetLocked)
                            ) {
                                tomb = candidate
                            }
                        })

                        if (tomb) {
                            if (!thisArg.___LuxisLibContactingEnemies.includes(tomb)) {
                                tomb.dealDamage(damage)
                                thisArg.onTombHit(tomb)
                                thisArg.dealSplashDamage(null, tomb)

                                thisArg.___LuxisLibContactingEnemies.push(tomb)
                                thisArg.___LuxisLibDealtTargetAmount++

                                if (thisArg.___LuxisLibDealtTargetAmount >= thisArg.___LuxisLibMaxPierceAmount) {
                                    thisArg.pop()
                                    return
                                }

                                thisArg.playPopSound()
                                thisArg.playParticle()
                            }

                            return
                        }
                    }
                }

                if (thisArg.enemyType === character.CharacterType.plant) {
                    thisArg.detectPlant(someArgIDK, body)
                }
            }
        })




        createProjectileSpread = function createProjectileSpread(
            spreadData, scheduler,
            originX, originY,
            height, speed,
            layer, enemyType
        ) {
            spreadData.forEach((spreadPattern) => {
                const projectilesPerInterval = Math.floor(spreadPattern.ProjectilesPerInterval)
                const intervalTimes = spreadPattern.ProjectileAmount / projectilesPerInterval
                if (intervalTimes !== Math.floor(intervalTimes)) {
                    ctx.ui.toast("ProjectileAmount is not a multiple of ProjectilesPerInterval", "error")
                    console.error("ProjectileAmount is not a multiple of ProjectilesPerInterval:", spreadPattern)
                }
                scheduler.schedule(async function () {
                        for (let i = 0; i < projectilesPerInterval; i++) {
                            const spread = spreadPattern.ProjectileSpreadDegrees

                            if (!Array.isArray(spread) || spread.length === 0) {
                                ctx.ui.toast(`Invalid ProjectileSpreadDegrees: ${spread}`, "error")
                                ctx.log.error(`Invalid ProjectileSpreadDegrees: ${spread}`);
                                return;
                            }

                            const initialDegreeOffset = spreadPattern.InitialDegreeOffset ?? 0

                            const randomSpread = spread[Math.floor(Math.random() * spread.length)]
                            const degrees =
                                (randomSpread.min + Math.random() *
                                    (randomSpread.max - randomSpread.min)) + initialDegreeOffset
                            // random degrees from "min" to "max" plus InitialDegreeOffset
                            const radians = degrees * Math.PI / 180;

                            const velocity = new cc.Vec2(
                                speed * Math.cos(radians),
                                speed * Math.sin(radians),
                            ); // velocity based on degrees

                            const centerOffset = spreadPattern.CenterOffset ?? {"x": 0, "y": 0}

                            const projectile = await projectileShootingFunctions.shootOnePea(
                                spreadPattern.ProjectileType,
                                {
                                    x: originX + centerOffset.x * square.Square.SquareWidth,
                                    y: originY + centerOffset.y * square.Square.SquareHeight
                                },
                                height,
                                layer,
                                velocity,
                                enemyType
                            )
                            projectile._hasSpread = true
                        }
                    },
                    spreadPattern.ProjectileInterval,
                    intervalTimes - 1,
                    spreadPattern.FirstProjectileInterval,
                )
            })
        }

        createLobberProjectileSpread = function createLobberProjectileSpread(
            spreadData, scheduler,
            originX, originY,
            height, gravity,
            layer,
            originLnC,
            linearVelocity,
            bodyLinearVelocity,
            enemyType,
        ) {
            spreadData.forEach((spreadPattern) => {
                const projectilesPerInterval = Math.floor(spreadPattern.ProjectilesPerInterval)
                const intervalTimes = spreadPattern.ProjectileAmount / projectilesPerInterval

                if (intervalTimes !== Math.floor(intervalTimes)) {
                    ctx.ui.toast("ProjectileAmount is not a multiple of ProjectilesPerInterval", "error")
                    console.error("ProjectileAmount is not a multiple of ProjectilesPerInterval:", spreadPattern)
                }

                const laneRanges = spreadPattern.ProjectileLaneOffsets ?? [{ min: 0, max: 0 }]
                let laneOffset

                const lockMode = spreadPattern.TargetLockMode ?? {}

                const getTarget = (minColumn, targetPool) => {
                    let closestX = Infinity
                    let best = null

                    for (const target of targetPool) {
                        if (!target.isAlive()) continue

                        if (target.inLnC.cIndex < minColumn) continue

                        if (target.worldPosition.x < closestX) {
                            closestX = target.worldPosition.x
                            best = target
                        }
                    }

                    return best
                }

                const findTarget = (lane) => {
                    if (!lockMode.LockOnFirstEnemy) return null

                    const minColumn = (
                        lockMode.IgnoreOriginColumn
                            ? -Infinity
                            : originLnC.cIndex
                    ) + lockMode.OriginColumnOffset ?? 0

                    const targetPool = lane.zombiePool().concat(
                        lockMode.PrioritizeTombs ? lane.tombPool() : []
                    )

                    let best = getTarget(minColumn, targetPool)

                    if (best === null && !lockMode.PrioritizeTombs && !lockMode.IgnoreTombs) {
                        best = getTarget(minColumn, lane.tombPool())
                    }

                    if (typeof best?.lobberTarget === "function") {
                        return best?.lobberTarget() ?? best
                    } else {
                        return best
                    }
                }

                const rollLaneOffset = () => {
                    const laneRange = laneRanges[Math.floor(Math.random() * laneRanges.length)]

                    let offset = laneRange.min + Math.random() * (laneRange.max - laneRange.min)

                    if (!spreadPattern.DecimalLaneOffsets) {
                        offset = Math.round(offset)
                    }

                    return offset
                }

                const findLaneAndTarget = () => {
                    let laneOffset = rollLaneOffset()
                    let laneIndex
                    let lane
                    let target

                    let tries = 0

                    while (true) {
                        tries++

                        laneIndex = originLnC.lIndex + Math.floor(laneOffset)
                        lane = square.Square.getLane(laneIndex)

                        target = lane ? findTarget(lane) : null

                        if (
                            target ||
                            !lockMode.IgnoreEmptyLanesIfPossible ||
                            tries >= 99
                        ) {
                            break
                        }

                        laneOffset = rollLaneOffset()
                    }

                    return {
                        laneOffset,
                        laneIndex,
                        lane,
                        target,
                    }
                }

                let distributedTargets = null
                if (spreadPattern.TargetLockMode?.EvenlyDistributeProjectiles) {
                    const candidates = []

                    for (const range of laneRanges) {
                        for (let offset = Math.ceil(range.min); offset <= Math.floor(range.max); offset++) {
                            const lane = square.Square.getLane(originLnC.lIndex + offset)
                            if (!lane) continue

                            const target = findTarget(lane)
                            if (!target) continue

                            candidates.push({
                                laneOffset: offset,
                                laneIndex: originLnC.lIndex + offset,
                                lane,
                                target,
                            })
                        }
                    }

                    candidates.sort((a, b) => a.target.worldPosition.x - b.target.worldPosition.x)

                    if (typeof lockMode.MaxDistributionTargets === "number") {
                        candidates.length = Math.min(
                            candidates.length,
                            lockMode.MaxDistributionTargets
                        )
                    }

                    distributedTargets = []

                    while (distributedTargets.length < spreadPattern.ProjectileAmount) {
                        let added = false

                        for (const target of candidates) {
                            distributedTargets.push(target)
                            added = true

                            if (distributedTargets.length >= spreadPattern.ProjectileAmount) {
                                break
                            }
                        }

                        if (!added) break
                    }
                }

                const centerOffset = spreadPattern.CenterOffset ?? { x: 0, y: 0 }

                scheduler.schedule(async () => {
                        for (let i = 0; i < projectilesPerInterval; i++) {
                            let columnOffset = 0

                            if (lockMode.TargetColumnOffsets?.length) {
                                const columnRange =
                                    lockMode.TargetColumnOffsets[
                                        Math.floor(Math.random() * lockMode.TargetColumnOffsets.length)
                                    ]

                                columnOffset =
                                    columnRange.min +
                                    Math.random() * (columnRange.max - columnRange.min)

                                if (!spreadPattern.DecimalColumnOffsets) {
                                    columnOffset = Math.round(columnOffset)
                                }
                            }

                            const projectile = await projectiles.projectileRes.getProjectile(
                                spreadPattern.ProjectileType,
                                layer
                            )

                            let target = null
                            let laneIndex
                            let lane

                            if (distributedTargets) {
                                const distributed = distributedTargets.shift()

                                if (distributed) {
                                    ({
                                        laneOffset,
                                        laneIndex,
                                        lane,
                                        target,
                                    } = distributed)
                                } else {
                                    ({
                                        laneOffset,
                                        laneIndex,
                                        lane,
                                        target,
                                    } = findLaneAndTarget())
                                }
                            } else {
                                ({
                                    laneOffset,
                                    laneIndex,
                                    lane,
                                    target,
                                } = findLaneAndTarget())
                            }

                            const flightTime = 60 * (spreadPattern.FlightTimeMultiplier ?? 1)

                            const spawnX = originX + centerOffset.x * square.Square.SquareWidth
                            const spawnY = originY + centerOffset.y * square.Square.SquareHeight

                            const originalTargetPos = target
                                ? target.lobberToPos(flightTime)
                                : {
                                    x: originX + linearVelocity.x * flightTime,
                                    y: originY + linearVelocity.y * flightTime,
                                }

                            const targetPos = {
                                x: originalTargetPos.x + columnOffset * square.Square.SquareWidth,
                                y: target
                                    ? originalTargetPos.y
                                    : originalTargetPos.y + laneOffset * square.Square.SquareHeight,
                            }

                            if (lockMode.ForceSpecificColumnTarget) {
                                const columnRanges = lockMode.ForceSpecificColumnTarget.Column
                                const columnRange = columnRanges[Math.floor(Math.random() * columnRanges.length)]
                                const column = columnRange.min + Math.random() * (columnRange.max - columnRange.min)

                                const columnPosition =
                                    (column + columnOffset) * square.Square.SquareWidth

                                if (lockMode.ForceSpecificColumnTarget.IsOffsetFromOrigin) {
                                    targetPos.x = originX + columnPosition
                                } else {
                                    targetPos.x = columnPosition + 5 * square.Square.SquareWidth
                                }
                            }

                            projectile.linearVelocity = new cc.Vec2(
                                (targetPos.x - spawnX) / flightTime,
                                (targetPos.y - spawnY) / flightTime
                            )

                            projectile.bodyLinearVelocity =
                                gravity * flightTime / 2 + (0 - height) / flightTime

                            projectile.node.parent = layer
                            projectile.height = height
                            projectile.worldPosition = new cc.Vec2(spawnX, spawnY)

                            projectile.gravity = gravity

                            projectile.FliesHorizontallyWhenBV0 = false
                            projectile.JudgesZombieBodyRecForShooter = false

                            projectiles.projectile.registerProjectile(projectile, enemyType)
                            projectile.rotate()

                            projectile._hasSpread = true
                        }
                    },
                    spreadPattern.ProjectileInterval,
                    intervalTimes - 1,
                    spreadPattern.FirstProjectileInterval
                )
            })
        }

    })
}