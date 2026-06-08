package com.marinmc.client.mixin;

import net.minecraft.client.render.VertexConsumerProvider;
import net.minecraft.client.render.entity.ItemEntityRenderer;
import net.minecraft.client.util.math.MatrixStack;
import net.minecraft.entity.ItemEntity;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

@Mixin(ItemEntityRenderer.class)
public class ItemEntityRendererMixin {
    @Inject(method = "render", at = @At("HEAD"))
    private void onRender(
        ItemEntity itemEntity, 
        float f, 
        float g, 
        MatrixStack matrixStack, 
        VertexConsumerProvider vertexConsumerProvider, 
        int i, 
        CallbackInfo ci
    ) {
        // Lies items flat on the ground
        if (itemEntity.isOnGround()) {
            matrixStack.translate(0.0d, -0.15d, 0.0d);
            // Rotate flat
            matrixStack.multiply(net.minecraft.util.math.RotationAxis.POSITIVE_X.rotationDegrees(90F));
            
            // Stack items vertically
            int count = itemEntity.getStack().getCount();
            if (count > 1) {
                float offset = 0.02f * (count / 16f);
                matrixStack.translate(0.0d, 0.0d, -offset);
            }
        }
    }
}
