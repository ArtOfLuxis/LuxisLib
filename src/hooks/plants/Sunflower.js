import {wrapObjDataOwnPlant} from "./Plant";
import {libProperties} from "../other/JSONs";

export function init(ctx) {
    ctx.events.on("luxislib:properties", () => {
        const sunflower = ctx.engine.getSystemModule("chunks:///_virtual/Sunflower.ts")
        const droppings = ctx.engine.getSystemModule("chunks:///_virtual/Droppings.ts")
        const dropping = ctx.engine.getSystemModule("chunks:///_virtual/dropping.ts")
        const nodePools = ctx.engine.getSystemModule("chunks:///_virtual/NodePools.ts")
        const sun = ctx.engine.getSystemModule("chunks:///_virtual/sun.ts")
        const ui = ctx.engine.getSystemModule("chunks:///_virtual/UI.ts")
        const levelTask = ctx.engine.getSystemModule("chunks:///_virtual/LevelTaskCount.ts")
        const proto = sunflower.SunflowerPlant.prototype

        const cc = ctx.engine.getCc()

        wrapObjDataOwnPlant(ctx, proto, {
            "IsACoinProducer": null,
        })

        ctx.hooks.wrapMethod({
            target: proto,
            methodName: "specialPlantOnEnable",
            handler: ({args, thisArg, callOriginal}) => {
                callOriginal(...args)

                const isACoinProducer = thisArg.objdataOwn.IsACoinProducer
                if (typeof isACoinProducer === "boolean")
                    thisArg.coinProducer = isACoinProducer
            }
        })

        ctx.hooks.wrapMethod({
            target: sunflower.sunflower,
            methodName: "produceSun",
            handler: ({ args, callOriginal }) => {
                const sunDropsOverride = libProperties?.SunDropsOverride
                if (!sunDropsOverride) return callOriginal(...args)

                let [
                    value, position, height,
                    countTask = true,
                    burst = false,
                    shineBuff = false
                ] = args

                if (shineBuff)
                    value += sunflower.sunflower.shineVineBuffAdditionalSunValue

                const overrideValues = Object.keys(sunDropsOverride)
                    .map(Number)
                    .sort((a, b) => b - a)
                // sorts from lowest to highest i think

                let remaining = Math.floor(value)
                const drops = []

                while (remaining > 0) {
                    const match = overrideValues.find(v => v <= remaining)

                    if (match == null) break

                    drops.push(...sunDropsOverride[String(match)])
                    remaining -= match
                }

                if (countTask) {
                    ui.UIInGame.component.calculateLevelTask(
                        levelTask.LevelTaskCountModeEnum.SunProduceRequest,
                        { SunProduceAdd: value }
                    )
                }

                const nodes = []

                for (const drop of drops) {
                    const isObject = typeof drop === "object"
                    const dropName = isObject ? drop.Name : drop

                    const prefab = droppings.droppings[dropName]

                    if (!prefab) {
                        ctx.ui.toast(`Unknown sun drop`, "error")
                        ctx.log.error(`Unknown sun drop: ${dropName}`)
                        continue
                    }

                    const node = nodePools.NodePools.instantiatePooly(prefab)
                    node.parent = droppings.droppings.layer

                    if (isObject) {
                        node.___LuxisLibDropObject = drop
                    }

                    nodes.push(node)
                }

                for (let i = 0; i < nodes.length; i++) {
                    const node = nodes[i]
                    const drop = node.getComponent(dropping.dropping)

                    drop.height = height
                    drop.worldPosition = new cc.Vec2(
                        nodes.length === 1
                            ? position.x
                            : position.x - 15 + (30 / (nodes.length - 1)) * i,
                        position.y
                    )

                    drop.gravity = 1
                    drop.linearVelocity = new cc.Vec2(Math.random() * 6 - 3, 0)
                    drop.bodyLinearVelocity = 10

                    const dropObject = node.___LuxisLibDropObject
                    if (dropObject) {
                        const plantTypes = dropObject.PlantTypes
                        if (plantTypes)
                            drop.setPlantType(plantTypes[Math.floor(Math.random() * plantTypes.length)])
                    }
                }

                return nodes.map(node => node.getComponent(sun.sun))
            }
        })

    })
}