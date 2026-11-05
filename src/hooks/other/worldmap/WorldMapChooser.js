import {libProperties} from "../JSONs.js"

export function init(ctx) {
    ctx.events.on("lib-properties", () => {
        const chooser = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/WorldMapChooser.ts")
        const proto = chooser.WorldMapChooser.prototype

        const worldOrder = libProperties?.WorldOrder ?? []
        const removedWorldIcons = libProperties?.RemovedWorldIcons ?? []

        const order = Object.fromEntries(
            worldOrder.map((name, i) => [name, i])
        )

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "onLoad",
            handler: ({args, thisArg, callNext}) => {
                const spacing = thisArg.distanceBetweenIcons

                thisArg.icons = thisArg.icons.filter(icon => {
                    if (removedWorldIcons.includes(icon.node._name)) {
                        icon.node.removeFromParent()
                        return false
                    }

                    return true
                })

                thisArg.icons.sort((a, b) =>
                    (order[a.node._name] ?? Infinity) -
                    (order[b.node._name] ?? Infinity)
                )

                thisArg.icons.forEach((icon, i) => {
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