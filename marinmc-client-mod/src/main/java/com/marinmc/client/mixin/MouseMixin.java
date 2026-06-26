package com.marinmc.client.mixin;

import com.marinmc.client.features.FreelookHandler;
import com.marinmc.client.gui.hud.HudManager;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.Mouse;
import org.lwjgl.glfw.GLFW;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Shadow;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * Mixin into Mouse to intercept mouse movement deltas.
 * When Freelook is active, mouse movement updates the freelook camera
 * instead of rotating the player.
 */
@Mixin(Mouse.class)
public class MouseMixin {

    @Shadow
    private double cursorDeltaX;

    @Shadow
    private double cursorDeltaY;

    @Inject(method = "updateMouse", at = @At("HEAD"), cancellable = true)
    private void onUpdateMouse(double timeDelta, CallbackInfo ci) {
        FreelookHandler handler = FreelookHandler.getInstance();
        if (handler.isActive()) {
            // Get the cursor deltas from GLFW
            MinecraftClient mc = MinecraftClient.getInstance();
            double sensitivity = mc.options.getMouseSensitivity().getValue() * 0.6 + 0.2;
            double scaledSensitivity = sensitivity * sensitivity * sensitivity * 8.0;

            double deltaX = this.cursorDeltaX * scaledSensitivity;
            double deltaY = this.cursorDeltaY * scaledSensitivity;

            // Feed deltas to freelook handler
            handler.onMouseMove(deltaX, deltaY);

            // Reset cursor deltas so vanilla doesn't also process them
            this.cursorDeltaX = 0;
            this.cursorDeltaY = 0;

            ci.cancel();
        }
    }

    /**
     * Feed real mouse-button presses into the CPS counter. Without this hook the
     * click buffers in HudManager stay empty and the CPS HUD always reads 0.
     * Only in-game clicks (no screen open) are counted, matching player expectation.
     */
    @Inject(method = "onMouseButton", at = @At("HEAD"))
    private void marinmc$onMouseButton(long window, int button, int action, int mods, CallbackInfo ci) {
        if (action == GLFW.GLFW_PRESS) {
            MinecraftClient mc = MinecraftClient.getInstance();
            if (mc.currentScreen == null) {
                HudManager.registerClick(button);
            }
        }
    }
}
