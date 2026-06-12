package com.marinmc.client.mixin;

import com.marinmc.client.gui.hud.HudManager;
import com.marinmc.client.gui.hud.HudElement;
import com.marinmc.client.gui.OverlayScreen;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.gui.hud.InGameHud;
import net.minecraft.client.render.RenderTickCounter;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

@Mixin(InGameHud.class)
public class InGameHudMixin {

    @Inject(method = "render", at = @At("TAIL"))
    private void onRender(DrawContext context, RenderTickCounter tickCounter, CallbackInfo ci) {
        MinecraftClient mc = MinecraftClient.getInstance();
        if (mc.options.hudHidden || mc.currentScreen != null) return;
        
        // Render all HUD elements
        HudManager.getInstance().renderAll(context);

        // Draw Toggle Sneak/Sprint status
        boolean modEnabled = OverlayScreen.configStates.getOrDefault("toggle_sneak", false);
        if (modEnabled) {
            int currentY = mc.getWindow().getScaledHeight() - 40; // Above chat
            int x = 10;
            if (com.marinmc.client.MarinClient.toggledSneak) {
                context.drawTextWithShadow(mc.textRenderer, "[Sneak: Toggled]", x, currentY, 0xFF22C55E);
                currentY -= 12;
            }
            if (com.marinmc.client.MarinClient.toggledSprint) {
                context.drawTextWithShadow(mc.textRenderer, "[Sprint: Toggled]", x, currentY, 0xFF22C55E);
            }
        }
    }

    @Inject(method = "renderCrosshair", at = @At("HEAD"), cancellable = true)
    private void onRenderCrosshair(DrawContext context, RenderTickCounter tickCounter, CallbackInfo ci) {
        HudElement crosshair = HudManager.getInstance().getElements().stream()
            .filter(e -> "crosshair".equals(e.getId()))
            .findFirst().orElse(null);

        if (crosshair instanceof HudManager.CrosshairElement && crosshair.isEnabled()) {
            MinecraftClient mc = MinecraftClient.getInstance();
            int screenWidth = mc.getWindow().getScaledWidth();
            int screenHeight = mc.getWindow().getScaledHeight();
            int x = screenWidth / 2;
            int y = screenHeight / 2;

            ((HudManager.CrosshairElement) crosshair).drawCrosshair(context, x, y);
            ci.cancel(); // Cancel standard crosshair drawing
        }
    }
}
