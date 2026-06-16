package com.marinmc.client.mixin;

import com.marinmc.client.features.FreelookHandler;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.Mouse;
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
}
