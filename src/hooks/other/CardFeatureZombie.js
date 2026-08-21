
let zombieAnimations

export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const cardFeatureZombie = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/CardFeatureZombie.ts")
        const proto = cardFeatureZombie.CardFeatureZombie.prototype

        const cc = ctx.unsafe.engine.getCc()

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "cardGrouperZombie",
            handler: ({ thisArg, callNext, args }) => {
                callNext(...args)

                const assets = cc.assetManager.assets._map

                const plantAsset = assets["91731241-49e8-4db3-bb69-f04d4f4762d6"]
                const plantAtlas = assets["2c339223-8acf-4c14-99cb-018fa35f1174"]

                const zombieAsset = assets["52499037-3d67-4db4-a1c1-d5055559bc09"]
                const zombieAtlas = assets["1460d3f3-5bba-411c-bad2-47aa2d6b278f"]

                const db = thisArg.ca._plantDB

                const animations = db._armature?.animation?._animations;

                if (!zombieAnimations) {
                    if (!animations) {
                        return;
                    }

                    zombieAnimations = Object.keys(animations);
                }

                const animation = thisArg.thisZombie._CARDSPRITENAME
                if (!zombieAnimations.includes(animation)) {
                    db._dragonAsset = plantAsset
                    db._dragonAtlasAsset = plantAtlas
                    db._armatureName = "plants"
                } else {
                    db._dragonAsset = zombieAsset
                    db._dragonAtlasAsset = zombieAtlas
                    db._armatureName = "Zombie"
                }

                db._buildArmature()
                db.playAnimation(animation)
            }
        })

    })
}