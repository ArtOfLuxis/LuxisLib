
export function init(ctx) {
    ctx.events.on("engine:ready", () => {
        const cards = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/Cards.ts")
        const levelController = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/levelController.ts")
        const playerProperties = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/PlayerProperties.ts")
        const frontyard = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/FrontYard.ts")
        const levelPlay = levelController.LevelPlay
        const allPlayerProperties = playerProperties.AllPlayerProperties
        const proto = cards.Cards.prototype

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "GameStartable",
            handler: ({thisArg, callNext}) => {
                return thisArg.HaveMatchedChallengeDecks() || thisArg.CFs.length > 0;
            }
        })

        ctx.unsafe.hooks.wrapMethod({
            target: proto,
            methodName: "judgeCardCanbeChosen",
            handler: ({args, thisArg, callNext}) => {
                const [CF, forceProgressUnlocked] = args

                let lawnCheck = true
                if (CF.Prop.UsableInStages) {
                    lawnCheck = (CF.Prop.UsableInStages.stages.indexOf(
                        frontyard.FrontYard.CurrentLawn.node._name.replace("LAWN", "")
                    ) !== -1)
                    if (CF.Prop.UsableInStages.blacklist) lawnCheck = !lawnCheck
                }

                return (
                    levelPlay.component.ExcludePlantList.indexOf(CF.Type) === -1 &&
                    (
                        !forceProgressUnlocked ||
                        levelPlay.UnlockAll ||
                        allPlayerProperties.getPlantProgressByID(CF.oID).progress
                    ) &&
                    (
                        !levelPlay.component.ExcludeListSunProducers ||
                        CF.PF.TYPE.indexOf("sunProducer") === -1
                    ) &&
                    lawnCheck
                )
            }
        })

    })
}