import {libProperties} from "../JSONs.js"
import {GPNContext} from "../../../tsclasses/api.ts";

export function init(ctx: GPNContext) {
    ctx.events.on("lib-properties", () => {
        const chooser = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/WorldMapChooser.ts")
        const proto = chooser.WorldMapChooser.prototype

        const worldOrder = libProperties?.WorldOrder ?? []
        const removedWorldIcons = libProperties?.RemovedWorldIcons ?? []

        const order = Object.fromEntries(
            worldOrder.map((name: string, i: number) => [name, i])
        )

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "onLoad",
            handler: ({args, thisArg, callNext}) => {
                const spacing = thisArg.distanceBetweenIcons

                thisArg.icons = thisArg.icons.filter((icon: any) => {
                    if (removedWorldIcons.includes(icon.node._name)) {
                        icon.node.removeFromParent()
                        return false
                    }

                    return true
                })

                thisArg.icons.sort((a: any, b: any) =>
                    (order[a.node._name] ?? Infinity) -
                    (order[b.node._name] ?? Infinity)
                )

                thisArg.icons.forEach((icon: any, i: number) => {
                    icon.node.setSiblingIndex(i)
                    icon.node.setPosition(
                        i * spacing,
                        icon.node.position.y,
                        icon.node.position.z
                    )
                })

                return callNext(...args)
            }
        })
    })
}