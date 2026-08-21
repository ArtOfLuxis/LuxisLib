import {createProjectileSpread} from "../hooks/projectiles/commonShot";
import {libProperties} from "../hooks/other/JSONs";

export let executeActions
export let evaluateExpression
export let evaluate

function resolveProperty(action, context) {
    const object = action.object
        ? evaluate(action.object, context)
        : context.target

    const path = evaluate(action.property, context).split(".")
    const last = path.pop()

    let target = object
    for (const key of path) {
        target = target?.[key]
    }

    return { target, last }
}

function withVariable(context, name, value, fn) {
    const old = context[name]
    const existed = name in context

    context[name] = value

    try {
        return fn()
    } finally {
        if (existed)
            context[name] = old
        else
            delete context[name]
    }
}

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const projectiles = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/Projectiles.ts")
        const character = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/Character.ts")
        const frontYard = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/FrontYard.ts")
        const square = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/Square.ts")
        const LnC = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/LnC.ts")
        const characterManager = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/CharacterManager.ts")
        const levelController = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/levelController.ts")
        const sunCount = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/SunCount.ts")
        const jalapeno = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/Jalapeno.ts")
        const groundFire = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/GroundFire.ts")
        const soundResources = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/SoundRescourses.ts")
        const sunflower = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/Sunflower.ts")

        const cc = ctx.unsafe.engine.getCc()

        executeActions = function (actions, context) {
            for (const action of actions) {
                try {
                    switch (action.kind) {
                        case "If": {
                            if (action.then === undefined && action.else === undefined) {
                                ctx.ui.toast("Expected \"then\" OR \"else\" in an If action", "error")
                                ctx.log.error(`Expected \"then\" OR \"else\" in an If action: ${JSON.stringify(action)}`)
                            }

                            if (evaluate(action.condition, context)) {
                                executeActions(action.then ?? [], context)
                            } else {
                                executeActions(action.else ?? [], context)
                            }
                            break
                        }

                        case "For": {
                            const iterable = evaluate(action.iterable, context)
                            const variable = evaluate(action.variable, context)
                            const actions = action.actions ?? []

                            for (const item of iterable ?? []) {
                                withVariable(context, variable, item, () => {
                                    executeActions(actions, context)
                                })
                            }

                            break
                        }

                        case "Repeat": {
                            const times = Number(evaluate(action.times, context)) || 0
                            const variable = evaluate(action.variable, context)
                            const actions = action.actions ?? []

                            for (let i = 0; i < times; i++) {
                                withVariable(context, variable, i, () => {
                                    executeActions(actions, context)
                                })
                            }

                            break
                        }

                        case "SetObjectProperty": {
                            const { target, last } = resolveProperty(action, context)

                            target[last] = evaluate(action.value, context)
                            break
                        }


                        case "SetObjectProperties": {
                            const object = action.object
                                ? evaluate(action.object, context)
                                : context.target

                            const properties = evaluate(action.properties, context)

                            for (const [property, value] of Object.entries(properties)) {
                                const path = property.split(".")
                                const last = path.pop()

                                let target = object
                                for (const key of path) {
                                    target = target?.[key]
                                }

                                target[last] = value
                            }
                            break
                        }

                        case "IncrementObjectProperty": {
                            const { target, last } = resolveProperty(action, context)

                            target[last] = Math.max(
                                Math.min(
                                    target[last] + evaluate(action.value, context),
                                    evaluate(action.max, context) ?? Infinity
                                ),
                                evaluate(action.min, context) ?? -Infinity
                            )
                            break
                        }

                        case "DecrementObjectProperty": {
                            const { target, last } = resolveProperty(action, context)

                            target[last] = Math.max(
                                Math.min(
                                    target[last] - evaluate(action.value, context),
                                    evaluate(action.max, context) ?? Infinity
                                ),
                                evaluate(action.min, context) ?? -Infinity
                            )
                            break
                        }

                        case "ModifyObjectProperty": {
                            const { target, last } = resolveProperty(action, context)

                            let result
                            switch (evaluate(action.operator, context)) {
                                case "+=": {
                                    result = target[last] + evaluate(action.value, context)
                                    break
                                }
                                case "-=": {
                                    result = target[last] - evaluate(action.value, context)
                                    break
                                }
                                case "*=": {
                                    result = target[last] * evaluate(action.value, context)
                                    break
                                }
                                case "**=": {
                                    result = Math.pow(target[last], evaluate(action.value, context))
                                    break
                                }
                                case "/=": {
                                    result = target[last] / evaluate(action.value, context)
                                    break
                                }
                                case "//=": {
                                    result = Math.floor(target[last] / evaluate(action.value, context))
                                    break
                                }
                                case "%=": {
                                    result = target[last] % evaluate(action.value, context)
                                    break
                                }
                            }

                            target[last] = Math.max(
                                Math.min(
                                    result,
                                    evaluate(action.max, context) ?? Infinity
                                ),
                                evaluate(action.min, context) ?? -Infinity
                            )
                            break
                        }

                        case "SetRandomObjectProperties": {
                            const object = action.object
                                ? evaluate(action.object, context)
                                : context.target

                            for (const choices of evaluate(action.properties, context)) {
                                const totalWeight = choices.reduce(
                                    (sum, choice) => sum + (choice.weight ?? 1),
                                    0
                                )

                                let roll = Math.random() * totalWeight
                                let selected = choices[0]

                                for (const choice of choices) {
                                    roll -= choice.weight ?? 1
                                    if (roll < 0) {
                                        selected = choice
                                        break
                                    }
                                }

                                for (const [property, value] of Object.entries(selected.properties ?? {})) {
                                    const path = property.split(".")
                                    const last = path.pop()

                                    let target = object
                                    for (const key of path) {
                                        target = target[key]
                                    }

                                    target[last] = evaluate(value, context)
                                }
                            }

                            break
                        }

                        case "SetContextObject": {
                            const name = evaluate(action.name, context)
                            context[name] = evaluate(action.object, context)
                            break
                        }

                        case "ConsoleLog": {
                            const values = evaluate(action.values, context)
                            console.log(...values)
                            break
                        }

                        case "UIToast": {
                            ctx.ui.toast(
                                String(evaluate(action.text, context)),
                                evaluate(action.type, context)
                            )
                            break
                        }

                        case "Sleep": {
                            const object = action.object
                                ? evaluate(action.object, context)
                                : context.target

                            const newContext = evaluate(action.cloneContext, context)
                                ? { ...context }
                                : context

                            object.scheduleOnce(() => {
                                executeActions(action.actions, newContext)
                            }, evaluate(action.time, context))
                            break
                        }

                        case "ExplodeCherryBomb": {
                            const object = action.lnc
                                ? evaluate(action.lnc, context)
                                : context.target.inLnC

                            object.explodeCherry3x3(
                                evaluate(action.damage, context) ?? 1800,
                                evaluate(action.showExplosionText, context) ?? false,
                                null,
                                null,
                                evaluate(action.color, context) ?? null,
                                evaluate(action.scale, context) ?? { x: 1, y: 1, z: 1 },
                                evaluate(action.explosionWidth, context) ?? 3,
                                evaluate(action.explosionHeight, context) ?? 3,
                                evaluate(action.explosionLanes, context) ?? [-1, 0, 1],
                                evaluate(action.xOffset, context) ?? 0,
                                evaluate(action.yOffset, context) ?? 0,
                                evaluate(action.armorProtection, context) ?? false,
                                evaluate(action.armorKnockSound, context) ?? false,
                                evaluate(action.bodyKnockSound, context) ?? false,
                                evaluate(action.damageType, context) ?? "fire",
                                evaluate(action.screenShakeDuration, context) ?? 0.2,
                                evaluate(action.positionOverride, context) ?? null,
                                evaluate(action.playSound, context) ?? true,
                                () => {
                                    if (action.zombieCallback) {
                                        executeActions(action.zombieCallback, context)
                                    }
                                },
                            )

                            break
                        }

                        case "DealDamageZombie": {
                            const target = action.zombie
                                ? evaluate(action.zombie, context)
                                : context.target

                            target.dealDamage(
                                evaluate(action.damageDetails, context) ?? null
                            )

                            break
                        }
                        case "DealDamagePlant": {
                            const target = action.plant
                                ? evaluate(action.plant, context)
                                : context.target

                            target.dealDamage(
                                evaluate(action.damage, context) ?? null
                            )

                            break
                        }

                        case "SpawnLaneFire": {
                            const legacyProperties = {
                                length: "height",
                                fireLength: "spreadSpeed",
                                fireWidth: "spreadDistance",
                                whitelist: "zombieWhitelist",
                                parent: "parentObject"
                            }

                            for (const [oldName, newName] of Object.entries(legacyProperties)) {
                                if (oldName in action) {
                                    ctx.log.error(
                                        `[JSON Actions] SpawnLaneFire: "${oldName}" property was deprecated and renamed to "${newName}".`
                                    )
                                }
                            }

                            jalapeno.jalapeno.burnFromLnC(
                                evaluate(action.lnc, context),
                                evaluate(action.damage, context),
                                evaluate(action.armorProtection, context),
                                evaluate(action.duration, context),
                                evaluate(action.height, context) ?? 10,
                                groundFire.GroundFireColorEnum[
                                    evaluate(action.color, context) ?? "yellow"
                                ],
                                groundFire.GroundFireSpreadStyleEnum[
                                    evaluate(action.spreadStyle, context) ?? "cross"
                                ],
                                evaluate(action.spreadSpeed, context) ?? 9,
                                evaluate(action.spreadDistance, context) ?? 9,
                                evaluate(action.zombieWhitelist, context) ?? [],
                                evaluate(action.hypnoIncluded, context) ?? false,
                                evaluate(action.plantsIncluded, context) ?? false,
                                evaluate(action.isDPS, context) ?? false,
                                evaluate(action.burnsFlying, context) ?? true,
                                evaluate(action.parentObject, context) ?? null
                            )
                            break
                        }

                        case "SpawnProjectileSpread": {
                            const origin = evaluate(action.origin, context)
                            createProjectileSpread(
                                evaluate(action.spread, context),
                                evaluate(action.scheduler, context) ?? context.target,
                                origin.x, origin.y,
                                evaluate(action.height, context) ?? 0,
                                evaluate(action.speed, context) ?? 8,
                                evaluate(action.layer, context) ?? context.target?.inLane?.prjLayer,
                                character.CharacterType[evaluate(action.enemyType, context) ?? "zombie"]
                            )
                            break
                        }

                        case "SpawnZombie": {
                            evaluateExpression(action, context)
                            break
                        }
                        case "SpawnGridItem": {
                            evaluateExpression(action, context)
                            break
                        }
                        case "InvokeObjectMethod": {
                            evaluateExpression(action, context)
                            break
                        }
                        case "InvokeJavaScript": {
                            evaluateExpression(action, context)
                            break
                        }

                        case "DropSun": {
                            return sunflower.sunflower.produceSun(
                                evaluate(action.value, context) ?? 50,
                                evaluate(action.position, context) ?? context.target?.worldPosition,
                                evaluate(action.height, context) ?? 20,
                                evaluate(action.addsToLevelTask, context) ?? true,
                                evaluate(action.singleBurst, context) ?? false,
                                evaluate(action.shineVineBoosted, context) ?? false,
                            )
                        }


                        default:
                            ctx.ui.toast("Unknown action kind", "error")
                            ctx.log.error(`Unknown action kind: '${action.kind}' (${JSON.stringify(action)})`)
                    }
                } catch (e) {
                    ctx.ui.toast("Error while executing action", "error")
                    console.error("Error while executing action ", action.kind, action, `\n${e}`)
                }
            }
        }

        evaluateExpression = function (expr, context) {
            try {
                switch (expr.kind) {
                    case "InvokeJavaScript": {
                        const code = evaluate(expr.code, context)
                        const vars = {}

                        const variables = evaluate(expr.variables, context) ?? {}
                        const defaultVariables = {
                            "Eval": {evaluate, evaluateExpression, executeActions}
                        }

                        for (const [name, value] of Object.entries(defaultVariables)) {
                            vars[name] = value
                        }

                        for (const [name, value] of Object.entries(variables)) {
                            vars[name] = value
                        }

                        const fn = new Function(
                            ...Object.keys(vars),
                            code
                        )

                        return fn(...Object.values(vars))
                    }
                    case "InvokeObjectMethod": {
                        let object = expr.object
                            ? evaluate(expr.object, context)
                            : context.target

                        const path = evaluate(expr.method, context).split(".")
                        const last = path.pop()

                        for (const key of path) {
                            object = object?.[key]
                        }

                        const fn = object?.[last]

                        if (typeof fn !== "function") {
                            ctx.ui.toast("InvokeObjectMethod failed", "error")
                            console.error("InvokeObjectMethod failed", {
                                object,
                                last,
                                value: fn,
                                method: evaluate(expr.method, context)
                            })
                            return
                        }

                        return fn.apply(object, evaluate(expr.args ?? [], context))
                    }
                    case "InvokeConstructor": {
                        const object = evaluate(expr.object, context)
                        const args = evaluate(expr.args, context) ?? []
                        return new object.constructor(...Array.isArray(args) ? args : [args])
                    }

                    case "RectangleIntersectsRectangle": {
                        return evaluate(expr.rectangle1, context).judgeCrossRec(evaluate(expr.rectangle2, context))
                    }
                    case "ZombieBodyRectangle": {
                        const zombie = evaluate(expr.zombie, context) ?? context.target
                        return evaluate(expr.rectangleForProjectiles, context) ?
                            zombie.bodyRecForShooter :
                            zombie.bodyRec
                    }
                    case "PlantBodyRectangle": {
                        const plant = evaluate(expr.plant, context) ?? context.target
                        return plant.realBodyRec
                    }
                    case "ProjectileBodyRectangle": {
                        const projectile = evaluate(expr.projectile, context) ?? context.target
                        return projectile.bodyRec()
                    }


                    case "SpawnZombie": {
                        return evaluate(expr.lnc, context).SpawnZombieByZombieType(
                            evaluate(expr.type, context),
                            LnC.LnCSpawnZombieStyleEnum[evaluate(expr.spawnStyle, context) ?? "dirtspawn"],
                            evaluate(expr.playSound, context) ?? true,
                            (evaluate(expr.columnOffset, context) ?? 0) + 0.5,
                            evaluate(expr.delay, context) ?? 0,
                            null,
                            evaluate(expr.playRiseAnimation, context) ?? true,
                            evaluate(expr.reversed, context) ?? false,
                            evaluate(expr.hypnotized, context) ?? false,
                        )
                    }

                    case "SpawnGridItem": {
                        return evaluate(expr.lnc, context).SpawnGridItem(
                            evaluate(expr.type, context),
                            evaluate(expr.spawnLight, context) ?? true,
                            evaluate(expr.playHeavySound, context) ?? false,
                            evaluate(expr.ignorePlants, context) ?? false,
                            evaluate(expr.requireLawn, context) ?? true,
                            evaluate(expr.playSpawnParticle, context) ?? true,
                            evaluate(expr.tileData, context) ?? null,
                            evaluate(expr.tileInitialize, context) ?? true,
                        )
                    }

                    case "GetContext": {
                        return context
                    }
                    case "GetContextObject": {
                        let object = context

                        for (const key of evaluate(expr.name, context).split(".")) {
                            object = object?.[key]
                        }

                        return object ?? evaluate(expr.default, context)
                    }
                    case "GetObjectProperty": {
                        let object = expr.object
                            ? evaluate(expr.object, context)
                            : context.target

                        const property = evaluate(expr.property, context)

                        for (const key of property.split(".")) {
                            object = object?.[key]
                        }

                        return object ?? evaluate(expr.default, context)
                    }
                    case "GetSystemModule": {
                        return ctx.unsafe.engine.getSystemModule(`chunks:///_virtual/${evaluate(expr.name, context)}.ts`)
                    }

                    case "GetMath":
                        return Math
                    case "MathRandomChance":
                        return (Math.random() * 100) < evaluate(expr.chance, context)
                    case "MathRandomRange": {
                        const min = evaluate(expr.min, context)
                        const max = evaluate(expr.max, context)
                        return Math.random() * (max - min) + min
                    }
                    case "MathRoundNumber": {
                        const rounding = evaluate(expr.rounding, context)
                        const number = evaluate(expr.number, context)

                        switch (rounding) {
                            case "default": return Math.round(number)
                            case "ceil": return Math.ceil(number)
                            case "floor": return Math.floor(number)
                            default: {
                                ctx.ui.toast("Unknown rounding type", "error")
                                console.error("Unknown rounding type ", rounding, expr)
                                return Math.round(number)
                            }
                        }
                    }

                    case "GetProjectileFunctions":
                        return projectiles.PrjFunctions

                    case "CreateRectangle": {
                        const node = evaluate(expr.node, context)

                        const center = node.worldPosition.clone()
                        center.x += square.Square.SquareWidth * (evaluate(expr.xOffset, context) ?? 0)
                        center.y += square.Square.SquareHeight * (evaluate(expr.yOffset, context) ?? 0)

                        return characterManager.Rectangle.createRectangleCenter(
                            center,
                            square.Square.SquareWidth * evaluate(expr.width, context) ?? 0,
                            square.Square.SquareHeight * evaluate(expr.height, context) ?? 0,
                        )
                    }
                    case "CreateVec2": {
                        return new cc.Vec2(
                            evaluate(expr.x, context) ?? 0,
                            evaluate(expr.y, context) ?? 0
                        )
                    }
                    case "CreateVec3": {
                        return new cc.Vec3(
                            evaluate(expr.x, context) ?? 0,
                            evaluate(expr.y, context) ?? 0,
                            evaluate(expr.z, context) ?? 0
                        )
                    }
                    case "CreateVec4": {
                        return new cc.Vec4(
                            evaluate(expr.x, context) ?? 0,
                            evaluate(expr.y, context) ?? 0,
                            evaluate(expr.z, context) ?? 0,
                            evaluate(expr.w, context) ?? 0
                        )
                    }
                    case "CreateDamageDetails": {
                        const damageDetails = new characterManager.ZombieDamageDetails(
                            evaluate(expr.damage, context) ?? 0,
                            evaluate(expr.armorProtection, context) ?? true,
                            evaluate(expr.armorKnockSound, context) ?? true,
                            evaluate(expr.bodyKnockSound, context) ?? true,
                            evaluate(expr.damageDirection, context) ?? null,
                            characterManager.ZombieDamageType[
                            evaluate(expr.damageType, context) ?? "physicle"
                                ],
                            evaluate(expr.flash, context) ?? true,
                            evaluate(expr.armorAlsoDamagedWhenNotProtecting, context) ?? false
                        )

                        if ("bugKiller" in expr)
                            damageDetails.bugKiller = evaluate(expr.bugKiller, context)

                        if ("balloonKiller" in expr)
                            damageDetails.balloonKiller = evaluate(expr.balloonKiller, context)

                        if ("shockRGB" in expr)
                            damageDetails.shockRGB = evaluate(expr.shockRGB, context)

                        if ("DamageScaleForArmorRack" in expr)
                            damageDetails.DamageScaleForArmorRack =
                                evaluate(expr.DamageScaleForArmorRack, context)

                        return damageDetails
                    }
                    case "GetSquareType": {
                        return LnC.SquareType[evaluate(expr.name, context)]
                    }
                    case "GetObjectLnC": {
                        let object = expr.object
                            ? evaluate(expr.object, context)
                            : context.target

                        return object.inLnC
                    }
                    case "GetObjectLane": {
                        let object = expr.object
                            ? evaluate(expr.object, context)
                            : context.target

                        return object.inLane
                    }
                    case "GetLnCInLane": {
                        return square.Square.getLnC(
                            evaluate(expr.lane, context)?.LaneIndex,
                            evaluate(expr.column, context)
                        )
                    }
                    case "GetLane": {
                        return square.Square.getLane(evaluate(expr.lane, context))
                    }
                    case "GetLaneIndex": {
                        return evaluate(expr.lane, context)?.LaneIndex
                    }
                    case "GetUpperLane": {
                        return evaluate(expr.lane, context)?.UpperLane
                    }
                    case "GetLowerLane": {
                        return evaluate(expr.lane, context)?.LowerLane
                    }
                    case "GetLaneZombiePoolArray": {
                        return evaluate(expr.lane, context)?.zombiePool()
                    }
                    case "GetZombiePoolArray": {
                        return characterManager.ZombiePool.pool()
                    }
                    case "GetLaneHypnotizedZombiePoolArray": {
                        return evaluate(expr.lane, context)?.hypnoZombiePool()
                    }
                    case "GetHypnotizedZombiePoolArray": {
                        return characterManager.ZombiePool.hypnoPool()
                    }
                    case "GetLanePlantPoolArray": {
                        return evaluate(expr.lane, context)?.plantPool()
                    }
                    case "GetPlantPoolArray": {
                        return characterManager.PlantPool.pool()
                    }
                    case "GetLaneTombPoolArray": {
                        return evaluate(expr.lane, context)?.tombPool()
                    }
                    case "GetTombPoolArray": {
                        return characterManager.TombPool.pool()
                    }
                    case "GetCharacterType": {
                        return character.CharacterType[evaluate(expr.name, context)]
                    }
                    case "GetCurrentLawnObject": {
                        return frontYard.FrontYard.CurrentLawn
                    }
                    case "GetCurrentSunCount": {
                        return sunCount.SunCount.Value
                    }
                    case "GetLevelPlayComponent": {
                        return levelController.LevelPlay.component
                    }

                    case "GetRandomArrayEntries": {
                        const array = [...evaluate(expr.array, context)]
                        const amount = Math.min(
                            evaluate(expr.amount, context),
                            array.length
                        )

                        const result = [];

                        for (let i = 0; i < amount; i++) {
                            const index = Math.floor(Math.random() * array.length)
                            result.push(array.splice(index, 1)[0])
                        }

                        return result
                    }
                    case "FilterArray": {
                        const array = evaluate(expr.array, context)
                        const variable = evaluate(expr.variable, context)

                        return array.filter(item =>
                            withVariable(context, variable, item, () =>
                                evaluate(expr.condition, context)
                            )
                        )
                    }
                    case "FindArrayObject": {
                        const array = evaluate(expr.array, context)
                        const variable = evaluate(expr.variable, context)

                        return array.find(item =>
                            withVariable(context, variable, item, () =>
                                evaluate(expr.condition, context)
                            )
                        )
                    }
                    case "ArrayAllObjects": {
                        const array = evaluate(expr.array, context)
                        const variable = evaluate(expr.variable ?? "item", context)

                        return array.every(item =>
                            withVariable(context, variable, item, () =>
                                evaluate(expr.condition, context)
                            )
                        )
                    }

                    case "Ternary": {
                        return evaluate(expr.condition, context)
                            ? evaluate(expr.then, context)
                            : evaluate(expr.else, context)
                    }

                    case ">":
                        return evaluate(expr.left, context) > evaluate(expr.right, context)
                    case ">=":
                        return evaluate(expr.left, context) >= evaluate(expr.right, context)
                    case "<":
                        return evaluate(expr.left, context) < evaluate(expr.right, context)
                    case "<=":
                        return evaluate(expr.left, context) <= evaluate(expr.right, context)
                    case "==":
                        return evaluate(expr.left, context) === evaluate(expr.right, context)
                    case "!=":
                        return evaluate(expr.left, context) !== evaluate(expr.right, context)
                    case "+":
                        return evaluate(expr.left, context) + evaluate(expr.right, context)
                    case "-":
                        return evaluate(expr.left, context) - evaluate(expr.right, context)
                    case "*":
                        return evaluate(expr.left, context) * evaluate(expr.right, context)
                    case "**":
                    case "^":
                        return Math.pow(
                            evaluate(expr.left, context),
                            evaluate(expr.right, context)
                        )
                    case "/":
                        return evaluate(expr.left, context) / evaluate(expr.right, context)
                    case "//":
                        return Math.floor(
                            evaluate(expr.left, context) / evaluate(expr.right, context)
                        )
                    case "%":
                        return evaluate(expr.left, context) % evaluate(expr.right, context)
                    case "&&":
                    case "and":
                        return evaluate(expr.left, context) && evaluate(expr.right, context)
                    case "||":
                    case "or":
                        return evaluate(expr.left, context) || evaluate(expr.right, context)
                    case "!":
                    case "not":
                        return !evaluate(expr.value, context)
                    case "max":
                        return Math.max(evaluate(expr.first, context), evaluate(expr.second, context))
                    case "min":
                        return Math.min(evaluate(expr.first, context), evaluate(expr.second, context))
                    case "sin":
                        return Math.sin(evaluate(expr.value, context))
                    case "random": {
                        const min = evaluate(expr.min, context)
                        const max = evaluate(expr.max, context)
                        return min + Math.random() * (max - min)
                    }

                    default:
                        ctx.ui.toast("Unknown expression kind", "error")
                        ctx.log.error(`Unknown expression kind: '${expr.kind}' (${JSON.stringify(expr)})`)
                }
            } catch (e) {
                ctx.ui.toast("Error while evaluating expression", "error")
                console.error("Error while evaluating expression ", expr.kind, expr, `\n${e}`)
            }
        }

        evaluate = function (value, context) {
            if (value === null || value === undefined)
                return null

            if (typeof value !== "object")
                return value

            if (Array.isArray(value))
                return value.map(v => evaluate(v, context))

            if ("kind" in value)
                return evaluateExpression(value, context)

            const result = {}
            for (const key in value)
                result[key] = evaluate(value[key], context)

            return result
        }
    })

    ctx.events.on("properties", () => {
        try {
            if (libProperties.JSONActionHooks?.length) {
                ctx.log.info("Loading JSONActionHooks from libProperties")
            }

            libProperties.JSONActionHooks?.forEach(hook => {
                const context = {}

                const classValue = evaluate(hook.className, context)
                const methodName = evaluate(hook.method, context)
                const isStatic = !!evaluate(hook.isStatic, context)

                const wrapOptions = {
                    methodName,
                    isStatic,
                    handler: ({ args, thisArg, callNext }) => {
                        const hookContext = {
                            target: thisArg,
                            [evaluate(hook.thisVariable, context) ?? "this"]: thisArg,
                            [evaluate(hook.originalCallVariable, context) ?? "callOriginal"]: callNext,
                            [evaluate(hook.argsVariable, context) ?? "args"]: args,
                        }

                        executeActions(hook.actions, hookContext)

                        return hookContext[
                        evaluate(hook.returnVariable, hookContext) ?? "return"
                            ]
                    }
                }

                if (Array.isArray(classValue)) {
                    let target = ctx.unsafe.engine.getSystemModule(`chunks:///_virtual/${classValue[0]}.ts`)

                    for (let i = 1; i < classValue.length; i++) {
                        target = target[classValue[i]]
                    }

                    wrapOptions.target = isStatic ? target : target.prototype
                } else {
                    wrapOptions.className = classValue
                }

                ctx.unsafe.hooks.wrapMethod(wrapOptions)
            })

            if (libProperties.JSONActionHooks?.length) {
                ctx.ui.toast("JSONActionHooks loaded!", "success")
                ctx.log.info("JSONActionHooks loaded!")
            }
        } catch (err) {
            ctx.ui.toast("error encountered in JSONActionHooks :c", "error")
            ctx.log.error(err.message)
        }
    })
}