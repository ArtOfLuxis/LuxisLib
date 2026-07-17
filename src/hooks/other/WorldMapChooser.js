import {libProperties} from "./JSONs";


export function init(ctx) {
    ctx.events.on("luxislib:properties", () => {
        const chooser = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/WorldMapChooser.ts")

        const proto = chooser.WorldMapChooser.prototype

        const worldOrder = libProperties?.WorldOrder
        if (!worldOrder) return
        const order = Object.fromEntries(
            worldOrder.map((name, i) => [name, i])
        )

        // ctx.worlds.mutateWorlds(worlds => {
        //     console.log(worlds)
        //     const index = worlds.findIndex(w => w.node._name === "Egypt")
        //     if (index !== -1) worlds.splice(index, 1)
        // })

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "onLoad",
            handler: ({ args, thisArg, callNext }) => {
                thisArg.icons.sort((a, b) =>
                    (order[a.node._name] ?? Infinity) -
                    (order[b.node._name] ?? Infinity)
                )

                const spacing = thisArg.distanceBetweenIcons

                thisArg.icons.forEach((icon, i) => {
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