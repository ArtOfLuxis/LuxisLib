import {findCustomLevel, libProperties} from "./JSONs";

export function init(ctx) {
    ctx.events.on("lib-properties", () => {
        const KeyListener = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/KeyListener.ts")
        const mainScene = ctx.unsafe.engine.getSystemModule("chunks:///_virtual/mainScene.ts")

        const cc = ctx.unsafe.engine.getCc()

        ctx.unsafe.hooks.wrapMethod({
            target: mainScene.mainScene.prototype,
            methodName: "update",
            handler: ({ args, thisArg, callNext }) => {
                const result = callNext(...args)

                if (!thisArg.___LuxisLibFanmadeButtonAdded) {
                    const settings = libProperties?.MainMenuCustomLevelSettings
                    const customLevels = libProperties?.MainMenuCustomLevels

                    if (!settings || !customLevels) {
                        return result
                    }

                    const playButton = thisArg.node.getChildByName("PlayButton")

                    let index = 0
                    for (const level of customLevels) {
                        const button = cc.instantiate(playButton)
                        button.parent = playButton.parent
                        button.name = "FanmadeLevelsButton_" + level.id
                        button.setPosition(
                            settings.basePosition[0],
                            settings.basePosition[1] + index * settings.buttonSpacing,
                            0
                        )
                        button.setScale(settings.buttonScale[0], settings.buttonScale[1], 1)
                        button.setSiblingIndex(playButton._siblingIndex)

                        const buttonLayout = button.getComponent(cc.Layout)
                        buttonLayout.enabled = false

                        const label = button.getChildByName("Label")
                        label.components[1].string = level.name
                        label.horizontalAlign = cc.Label.HorizontalAlign.CENTER
                        label.verticalAlign = cc.Label.VerticalAlign.CENTER

                        button.getComponent(cc.UITransformComponent).width = level.buttonWidth
                        label.getComponent(cc.UITransformComponent).width = level.buttonWidth
                        label.getComponent(cc.Label).horizontalAlign = cc.Label.HorizontalAlign.CENTER

                        const buttonComponent = button.getComponent(cc.Button)
                        buttonComponent.clickEvents = []
                        button.off(cc.Node.EventType.TOUCH_END)

                        button.on(cc.Node.EventType.TOUCH_END, async () => {
                            await KeyListener.KeyListener.goToLevel([level.id])
                        })

                        index++
                    }

                    thisArg.___LuxisLibFanmadeButtonAdded = true
                }

                return result
            }
        })
    })
}