package com.marinmc.client.mixin;

import com.marinmc.client.gui.OverlayScreen;
import net.minecraft.client.render.OverlayTexture;
import net.minecraft.client.render.entity.LivingEntityRenderer;
import net.minecraft.client.render.entity.state.LivingEntityRenderState;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

@Mixin(LivingEntityRenderer.class)
public class LivingEntityRendererMixin {
    @Inject(method = "getOverlay", at = @At("HEAD"), cancellable = true)
    private static void onGetOverlay(LivingEntityRenderState state, float whiteIntensity, CallbackInfoReturnable<Integer> cir) {
        boolean visuals17 = OverlayScreen.configStates.getOrDefault("visuals_1_7", false);
        if (visuals17) {
            if (state.hurt || state.deathTime > 0) {
                cir.setReturnValue(OverlayTexture.getUv(whiteIntensity, true));
            }
        }
    }
}
