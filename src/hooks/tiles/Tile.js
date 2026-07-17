
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

    const tile = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/Tile.ts")

    ctx.unsafe.hooks.wrapMethod({
        target: tile.Tile.prototype,
        methodName: "modObjdataOwn",
        handler: ({ thisArg, args, callNext }) => {
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

            return callNext(...args)
        }
    })
}

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const tile = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/Tile.ts")
        const proto = tile.Tile.prototype

        const cc = ctx.unsafe.engine.getCc()

        wrapObjDataOwnTile(ctx, proto, {
            "ColorOffset": null,
            "Scale": null,
        })

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "specialOnEnable",
            handler: ({ thisArg, args, callNext }) => {
                callNext(...args)

                const scale = thisArg.objdataOwn.Scale
                if (scale) {
                    thisArg.node.worldScale = new cc.Vec3(
                        thisArg.node.worldScale.x * scale.x,
                        thisArg.node.worldScale.y * scale.y,
                        thisArg.node.worldScale.z
                    )
                }
            }
        })

    })
}