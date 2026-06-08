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
            matrices.translate(0.05F, 0.05F, -0.05F);
            matrices.multiply(net.minecraft.util.math.RotationAxis.POSITIVE_X.rotationDegrees(-15F));
            matrices.multiply(net.minecraft.util.math.RotationAxis.POSITIVE_Y.rotationDegrees(-15F));
        }
    }
}
