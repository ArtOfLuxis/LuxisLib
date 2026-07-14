
const prototypeDefaults = new WeakMap()
let wrapped = false

export function wrapObjDataOwnTile(ctx, proto, keys) {
    let defaults = prototypeDefaults.get(proto)
    if (!defaults) {
        defaults = {}
        prototypeDefaults.set(proto, defaults)
    }

    Object.assign(defaults, keys)

    if (wrapped) return
    wrapped = true

    const tile = ctx.engine.getSystemModule("chunks:///_virtual/Tile.ts")

    ctx.hooks.wrapMethod({
        target: tile.Tile.prototype,
        methodName: "modObjdataOwn",
        handler: ({ thisArg, args, callOriginal }) => {
            let current = Object.getPrototypeOf(thisArg)

            while (current) {
                const defaults = prototypeDefaults.get(current)
                if (defaults) {
                    for (const [key, value] of Object.entries(defaults)) {
                        if (!(key in thisArg._objdataOwn)) {
                            thisArg._objdataOwn[key] = value
                        }
                    }
                }

                current = Object.getPrototypeOf(current)
            }

            return callOriginal(...args)
        }
    })
}

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const tile = ctx.engine.getSystemModule("chunks:///_virtual/Tile.ts")
        const proto = tile.Tile.prototype

        const cc = ctx.engine.getCc()

        wrapObjDataOwnTile(ctx, proto, {
            "ColorOffset": null,
            "Scale": null,
        })

        ctx.hooks.wrapMethod({
            target: proto,
            methodName: "specialOnEnable",
            handler: ({ thisArg, args, callOriginal }) => {
                callOriginal(...args)

                const scale = thisArg.objdataOwn.Scale ?? { "x": 1, "y": 1 }
                thisArg.node.worldScale = new cc.Vec3(
                    thisArg.node.worldScale.x * scale.x,
                    thisArg.node.worldScale.y * scale.y,
                    thisArg.node.worldScale.z
                )
            }
        })

    })
}