package com.marinmc.client.mixin;

import net.minecraft.client.network.AbstractClientPlayerEntity;
import net.minecraft.client.render.VertexConsumerProvider;
import net.minecraft.client.render.item.HeldItemRenderer;
import net.minecraft.client.util.math.MatrixStack;
import net.minecraft.item.ItemStack;
import net.minecraft.registry.tag.ItemTags;
import net.minecraft.util.Hand;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

@Mixin(HeldItemRenderer.class)
public class HeldItemRendererMixin {
    @Inject(method = "renderFirstPersonItem", at = @At("HEAD"))
    private void onRenderFirstPersonItem(
        AbstractClientPlayerEntity player, 
        float tickDelta, 
        float pitch, 
        Hand hand, 
        float swingProgress, 
        ItemStack item, 
        float equipProgress, 
        MatrixStack matrices, 
        VertexConsumerProvider vertexConsumers, 
        int light, 
        CallbackInfo ci
    ) {
        // If main hand is a sword and player is using/blocking, force 1.7 block-hit matrix adjustments
        if (hand == Hand.MAIN_HAND && player.isUsingItem() && item.isIn(ItemTags.SWORDS)) {
            // Translate sword to center-blocking position
            matrices.translate(0.1F, -0.05F, -0.15F);
            
            // Apply blocking rotation (tilted across the view)
            matrices.multiply(net.minecraft.util.math.RotationAxis.POSITIVE_X.rotationDegrees(-35F));
            matrices.multiply(net.minecraft.util.math.RotationAxis.POSITIVE_Y.rotationDegrees(-45F));
            matrices.multiply(net.minecraft.util.math.RotationAxis.POSITIVE_Z.rotationDegrees(-45F));
            
            // Apply swing progress scaling and custom rotation
            float swing = net.minecraft.util.math.MathHelper.sin(net.minecraft.util.math.MathHelper.sqrt(swingProgress) * (float)Math.PI);
            matrices.multiply(net.minecraft.util.math.RotationAxis.POSITIVE_Y.rotationDegrees(swing * 30.0F));
            matrices.multiply(net.minecraft.util.math.RotationAxis.POSITIVE_X.rotationDegrees(-swing * 20.0F));
            matrices.translate(-0.1F, 0.1F, 0.0F);
        }
    }
}
