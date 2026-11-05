import {zombieAnimations} from "./CardFeatureZombie.js";

export let plantAnimations

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const cardFeature = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/CardFeature.ts")
        const square = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/Square.ts")
        const Materials = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/Materials.ts")
        const proto = cardFeature.CardFeature.prototype

        const cc = ctx.unsafe.engine.getCc()

        const originalSuncostGetter = Object.getOwnPropertyDescriptor(proto, "SUNCOST").get

        ctx.unsafe.hooks.wrapProperty({
            target: proto,
            key: "SUNCOST",
            priority: 99999999,
            get: ({thisArg}) => {
                let sun = originalSuncostGetter.call(thisArg)

                const costOverride = thisArg.Prop.CostOverride
                if (square.Square.component?.inLawnLnCs && costOverride) {
                    let count = 0

                    if (costOverride.CounterMode === "OnField") {
                        square.Square.getAllLnC().forEach((LnC) => {
                            LnC.getAllPlants().forEach((plant) => {
                                if (plant.ID === thisArg.PF.ID) count++
                            })
                        })
                    } else if (costOverride.CounterMode === "TotalPlanted") {
                        count = thisArg.TotalPlanted ?? 0
                    } else {
                        ctx.ui.toast("Unknown CounterMode", "error");
                        ctx.log.error("Unknown CounterMode: " + costOverride.CounterMode)
                    }

                    const listSunCost = costOverride.ListSunCost
                    if (listSunCost?.length > 0) {
                        const index = Math.max(0, Math.min(Math.floor(count), listSunCost.length - 1))
                        const listCost = listSunCost[index]

                        if (typeof listCost === "number") sun = listCost
                    }

                    if (typeof sun === "number")
                        sun += (costOverride.IncrementSunCost ?? 0) * count
                }

                return sun ?? 0
            }
        })

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "cardGrouperPlant",
            priority: -10000,
            handler: async ({thisArg, callNext, args}) => {
                callNext(...args)

                if (await ctx.settings.get("hideMintIcons")) {
                    let s = cc.internal.ArmatureDisplay
                    thisArg.node.getChildByName("Family").getComponent(s).playAnimation("Nope")
                }

                const db = thisArg.ca._plantDB

                const original = db.___seedPacketOriginals ??= {
                    scale: db.node.scale.clone(),
                    position: db.node.position.clone(),
                    color: db.color.clone(),
                    material: db.customMaterial
                }

                db.node.scale = original.scale.clone()
                db.node.setPosition(original.position)
                db.color = original.color.clone()
                db.customMaterial = original.material

                const SeedPacketModifications = thisArg.Prop.SeedPacketModifications
                if (!SeedPacketModifications) return

                const scale = SeedPacketModifications.Scale
                db.node.scale = new cc.Vec3(
                    original.scale.x * (scale?.x ?? 1),
                    original.scale.y * (scale?.y ?? 1),
                    original.scale.z
                )

                const offset = SeedPacketModifications.Offset
                db.node.setPosition(
                    original.position.x + (offset?.x ?? 0),
                    original.position.y + (offset?.y ?? 0),
                    original.position.z
                )

                const color = SeedPacketModifications.Color
                if (color) {
                    let material = db.___seedPacketMaterial

                    if (!material) {
                        material = new cc.Material()
                        material.initialize({
                            effectAsset: Materials.materialRes.addColorEffect,
                            defines: {
                                USE_TEXTURE: true
                            }
                        })

                        db.___seedPacketMaterial = material
                    }

                    const pass = material.passes[0]

                    pass.setUniform(pass.getHandle("addColor"), new cc.Vec4(
                        (color.r ?? 0) / 255,
                        (color.g ?? 0) / 255,
                        (color.b ?? 0) / 255,
                        1
                    ))

                    pass.setUniform(pass.getHandle("saturation"), color.s ?? 0)
                    pass.setUniform(pass.getHandle("holo"), color.holo ?? 0)

                    db.customMaterial = material

                    db.color = new cc.Color(
                        original.color.r,
                        original.color.g,
                        original.color.b,
                        original.color.a + (color.a ?? 0)
                    )
                }
            }
        })

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "cardGrouperPlant",
            priority: -10000,
            handler: async ({thisArg, callNext, args}) => {
                callNext(...args)

                const assets = cc.assetManager.assets._map

                const plantAsset = assets["91731241-49e8-4db3-bb69-f04d4f4762d6"]
                const plantAtlas = assets["2c339223-8acf-4c14-99cb-018fa35f1174"]

                const zombieAsset = assets["52499037-3d67-4db4-a1c1-d5055559bc09"]
                const zombieAtlas = assets["1460d3f3-5bba-411c-bad2-47aa2d6b278f"]

                const db = thisArg.ca.__plantDB

                const animations = db._armature?.animation?._animations;

                if (!plantAnimations) {
                    if (!animations) {
                        return;
                    }

                    plantAnimations = Object.keys(animations);
                }

                const animation = thisArg.PF._CARDSPRITENAME
                let changed = false
                if (!plantAnimations?.includes(animation) && zombieAnimations?.includes(animation)) {
                    db._dragonAsset = zombieAsset
                    db._dragonAtlasAsset = zombieAtlas
                    changed = db._armatureName !== "Zombie"
                    db._armatureName = "Zombie"
                } else {
                    db._dragonAsset = plantAsset
                    db._dragonAtlasAsset = plantAtlas
                    changed = db._armatureName !== "plants"
                    db._armatureName = "plants"
                }

                if (changed) {
                    db._buildArmature()
                    db.playAnimation(animation)
                }
            }
        })
    })
}