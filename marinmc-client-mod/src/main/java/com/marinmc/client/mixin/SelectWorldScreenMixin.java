package com.marinmc.client.mixin;

import net.minecraft.client.gui.screen.world.SelectWorldScreen;
import net.minecraft.client.gui.screen.Screen;
import net.minecraft.text.Text;
import org.spongepowered.asm.mixin.Mixin;

@Mixin(SelectWorldScreen.class)
public class SelectWorldScreenMixin extends Screen {

    protected SelectWorldScreenMixin(Text title) {
        super(title);
    }

    @Override
    public void renderBackground(net.minecraft.client.gui.DrawContext context, int mouseX, int mouseY, float delta) {
        com.marinmc.client.gui.AnimatedBackgroundRenderer.render(context, this.width, this.height);
        context.fill(0, 0, this.width, this.height, 0x88000000);
    }
}
