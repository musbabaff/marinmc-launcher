package com.marinmc.client.mixin;

import com.marinmc.client.gui.OverlayScreen;
import net.minecraft.client.render.entity.TntEntityRenderer;
import net.minecraft.client.render.entity.state.TntEntityRenderState;
import net.minecraft.client.util.math.MatrixStack;
import net.minecraft.client.render.VertexConsumerProvider;
import net.minecraft.client.render.debug.DebugRenderer;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

@Mixin(TntEntityRenderer.class)
public class TntEntityRendererMixin {

    @Inject(method = "render", at = @At("TAIL"))
    private void onRender(TntEntityRenderState state, MatrixStack matrixStack, VertexConsumerProvider vertexConsumerProvider, int i, CallbackInfo ci) {
        boolean enabled = OverlayScreen.configStates.getOrDefault("tnt_radius", false);
        if (enabled) {
            // Draw a neon red blast radius box (TNT has a 4.0 block explosion radius)
            // Center is roughly at the center of the block: x: 0, y: 0.5, z: 0 relative to the entity's position
            double minX = -4.0;
            double minY = -3.5;
            double minZ = -4.0;
            double maxX = 4.0;
            double maxY = 4.5;
            double maxZ = 4.0;
            
            // Draw wireframe/translucent box
            DebugRenderer.drawBox(matrixStack, vertexConsumerProvider, minX, minY, minZ, maxX, maxY, maxZ, 1.0f, 0.2f, 0.2f, 0.3f);

            // Draw floating fuse timer text above the TNT block (TNT is ~1.0 block tall)
            float secondsLeft = state.fuse / 20.0f;
            if (secondsLeft > 0) {
                String fuseText = String.format("%.2fs", secondsLeft);
                // Draw text at (0, 1.2, 0)
                int color = 0xFFFF5555; // Reddish text
                if (secondsLeft > 2.0f) {
                    color = 0xFF55FF55; // Green when safe
                } else if (secondsLeft > 1.0f) {
                    color = 0xFFFFFF55; // Yellow when close to exploding
                }
                DebugRenderer.drawString(matrixStack, vertexConsumerProvider, fuseText, 0.0, 1.2, 0.0, color, 0.02f);
            }
        }
    }
}
