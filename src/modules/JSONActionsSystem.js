import {createProjectileSpread} from "../hooks/projectiles/commonShot";
import {libProperties} from "../hooks/other/JSONs";

export let executeActions
export let evaluateExpression
export let evaluate

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
                switch (action.kind) {
                    case "If":
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

                    case "For":
                        const iterable = evaluate(action.iterable, context)
                        const variable = evaluate(action.variable, context)
                        const actions = action.actions ?? []
                        for (const o of iterable) {
                            context[variable] = o
                            executeActions(actions, context)
                        }
                        break

                    case "SetObjectProperty": {
                        const object = action.object
                            ? evaluate(action.object, context)
                            : context.target

                        const path = action.property.split(".")
                        const last = path.pop()

                        let target = object
                        for (const key of path) {
                            target = target[key]
                        }

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
                                target = target[key]
                            }

                            target[last] = value
                        }
                        break
                    }

                    case "IncrementObjectProperty": {
                        const object = action.object
                            ? evaluate(action.object, context)
                            : context.target

                        const path = action.property.split(".")
                        const last = path.pop()

                        let target = object
                        for (const key of path) {
                            target = target[key]
                        }

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
                        const object = action.object
                            ? evaluate(action.object, context)
                            : context.target

                        const path = action.property.split(".")
                        const last = path.pop()

                        let target = object
                        for (const key of path) {
                            target = target[key]
                        }

                        target[last] = Math.max(
                            Math.min(
                                target[last] - evaluate(action.value, context),
                                evaluate(action.max, context) ?? Infinity
                            ),
                            evaluate(action.min, context) ?? -Infinity
                        )
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

                    case "SpawnLaneFire": {
                        jalapeno.jalapeno.burnFromLnC(
                            evaluate(action.lnc, context),
                            evaluate(action.damage, context),
                            evaluate(action.armorProtection, context),
                            evaluate(action.duration, context),
                            evaluate(action.length, context) ?? 10,
                            groundFire.GroundFireColorEnum[
                                evaluate(action.color, context) ?? "yellow"
                            ],
                            groundFire.GroundFireSpreadStyleEnum[
                                evaluate(action.spreadStyle, context) ?? "cross"
                            ],
                            evaluate(action.fireLength, context) ?? 9,
                            evaluate(action.fireWidth, context) ?? 9,
                            evaluate(action.whitelist, context) ?? [],
                            evaluate(action.hypnoIncluded, context) ?? false,
                            evaluate(action.plantsIncluded, context) ?? false,
                            evaluate(action.isDPS, context) ?? false,
                            evaluate(action.burnsFlying, context) ?? true,
                            evaluate(action.parent, context) ?? null
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
                            evaluate(action.value, context),
                            evaluate(action.position, context),
                            evaluate(action.height, context),
                            evaluate(action.addsToLevelTask, context),
                            evaluate(action.singleBurst, context),
                            evaluate(action.shineVineBoosted, context),
                        )
                    }


                    default:
                        ctx.ui.toast("Unknown action kind", "error")
                        ctx.log.error(`Unknown action kind: '${action.kind}' (${JSON.stringify(action)})`)
                }
            }
        }

        evaluateExpression = function (expr, context) {
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
                    return new object.constructor(...evaluate(expr.args ?? [], context))
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
                case "GetProjectileShootingFunctions":
                    return projectiles.ProjectileShootingFunctions

                case "CreateRectangle": {
                    return characterManager.Rectangle.createRectangleNodeCenter(
                        evaluate(expr.node, context),
                        square.Square.SquareWidth * evaluate(expr.width, context),
                        square.Square.SquareHeight * evaluate(expr.height, context),
                    )
                }
                case "CreateVec2": {
                    return new cc.Vec2(evaluate(expr.x, context), evaluate(expr.y, context))
                }
                case "CreateVec3": {
                    return new cc.Vec3(evaluate(expr.x, context), evaluate(expr.y, context), evaluate(expr.z, context))
                }
                case "CreateVec4": {
                    return new cc.Vec4(evaluate(expr.x, context), evaluate(expr.y, context), evaluate(expr.z, context), evaluate(expr.w, context))
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
                case "GetLane": {
                    return square.Square.getLane(evaluate(expr.lane, context) + 1)
                }
                case "GetZombiePool": {
                    return characterManager.ZombiePool
                }
                case "GetZombiePoolArray": {
                    return characterManager.ZombiePool.pool()
                }
                case "GetPlantPool": {
                    return characterManager.PlantPool
                }
                case "GetPlantPoolArray": {
                    return characterManager.PlantPool.pool()
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

                    return array.filter(item => {
                        const oldValue = context[variable]
                        context[variable] = item

                        const result = evaluate(expr.condition, context)

                        if (oldValue === undefined) {
                            delete context[variable]
                        } else {
                            context[variable] = oldValue
                        }

                        return result
                    })
                }
                case "FindArrayObject": {
                    const array = evaluate(expr.array, context)
                    const variable = evaluate(expr.variable, context)

                    return array.find(item => {
                        const oldValue = context[variable]
                        context[variable] = item

                        const result = evaluate(expr.condition, context)

                        if (oldValue === undefined) {
                            delete context[variable]
                        } else {
                            context[variable] = oldValue
                        }

                        return result
                    })
                }
                case "ArrayAllObjects": {
                    const array = evaluate(expr.array, context)
                    const variable = evaluate(expr.variable ?? "item", context)

                    return array.every(item => {
                        const oldValue = context[variable]
                        context[variable] = item

                        const result = evaluate(expr.condition, context)

                        if (oldValue === undefined) {
                            delete context[variable]
                        } else {
                            context[variable] = oldValue
                        }

                        return result
                    })
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
                    return evaluate(expr.left, context) + evaluate(expr.right, context);
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
        }

        evaluate = function (value, context) {
            if (value === null)
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

    ctx.events.on("luxislib:properties", () => {
        ctx.log.info("Loading JSONActionHooks from libProperties")

        try {
            libProperties.JSONActionHooks?.forEach(hook => {
                const context = {}
                const className = evaluate(hook.className, context)
                const method = evaluate(hook.method, context)

                ctx.unsafe.hooks.wrapMethod({
                    className: className,
                    methodName: method,
                    handler: ({ args, thisArg, callNext }) => {
                        const hookContext = {
                            target: thisArg,
                            [evaluate(hook.thisVariable, context) ?? "this"]: thisArg,
                            [evaluate(hook.originalCallVariable, context) ?? "callOriginal"]: callNext,
                            [evaluate(hook.argsVariable, context) ?? "args"]: args,
                        }

                        executeActions(hook.actions, hookContext)

                        return hookContext[evaluate(hook.returnVariable, hookContext) ?? "return"]
                    }
                })
            })

            ctx.ui.toast("JSONActionHooks loaded!", "success")
        } catch (err) {
            ctx.ui.toast("error encountered in JSONActionHooks :c", "error")
            ctx.log.error(err.message)
        }
    })
}