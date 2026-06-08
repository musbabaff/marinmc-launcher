package com.marinmc.client.mixin;

import com.marinmc.client.gui.hud.HudManager;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.gui.hud.InGameHud;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

@Mixin(InGameHud.class)
public class InGameHudMixin {
    private boolean customCrosshairEnabled = true;

    @Inject(method = "render", at = @At("TAIL"))
    private void onRender(DrawContext context, float tickDelta, CallbackInfo ci) {
        MinecraftClient mc = MinecraftClient.getInstance();
        if (mc.options.hudHidden || mc.currentScreen != null) return;
        
        // Render all HUD elements
        HudManager.getInstance().renderAll(context);
    }

    @Inject(method = "renderCrosshair", at = @At("HEAD"), cancellable = true)
    private void onRenderCrosshair(DrawContext context, float tickDelta, CallbackInfo ci) {
        if (customCrosshairEnabled) {
            MinecraftClient mc = MinecraftClient.getInstance();
            int screenWidth = mc.getWindow().getScaledWidth();
            int screenHeight = mc.getWindow().getScaledHeight();
            int x = screenWidth / 2;
            int y = screenHeight / 2;

            // Render a custom premium red/white dot crosshair
            context.fill(x - 2, y - 2, x + 2, y + 2, 0xAAFF0000); // Red core
            context.fill(x - 1, y - 1, x + 1, y + 1, 0xFFFFFFFF); // White center dot
            
            ci.cancel(); // Cancel standard crosshair drawing
        }
    }
}
