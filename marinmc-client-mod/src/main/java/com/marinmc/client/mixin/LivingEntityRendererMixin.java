package com.marinmc.client.mixin;

import net.minecraft.client.render.entity.LivingEntityRenderer;
import net.minecraft.entity.LivingEntity;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

@Mixin(LivingEntityRenderer.class)
public class LivingEntityRendererMixin {
    @Inject(method = "getOverlay", at = @At("HEAD"), cancellable = true)
    private static void onGetOverlay(LivingEntity entity, float whiteIntensity, CallbackInfoReturnable<Integer> cir) {
        // Overrides or modifies hit flash colors and timing (can return custom OverlayTexture packed values)
        // Default return packed value is standard, but can be bypassed if PvP hit colors are configured
    }
}
