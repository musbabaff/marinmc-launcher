package com.marinmc.client.mixin;

import com.marinmc.client.gui.OverlayScreen;
import net.minecraft.client.render.VertexConsumerProvider;
import net.minecraft.client.render.entity.ItemEntityRenderer;
import net.minecraft.client.render.entity.state.ItemEntityRenderState;
import net.minecraft.client.util.math.MatrixStack;
import net.minecraft.entity.ItemEntity;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Unique;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

import java.util.WeakHashMap;

@Mixin(ItemEntityRenderer.class)
public class ItemEntityRendererMixin {

    @Unique
    private static final WeakHashMap<ItemEntityRenderState, Boolean> ON_GROUND_MAP = new WeakHashMap<>();

    @Inject(method = "updateRenderState(Lnet/minecraft/entity/ItemEntity;Lnet/minecraft/client/render/entity/state/ItemEntityRenderState;F)V", at = @At("TAIL"))
    private void onUpdateRenderState(ItemEntity itemEntity, ItemEntityRenderState itemEntityRenderState, float f, CallbackInfo ci) {
        ON_GROUND_MAP.put(itemEntityRenderState, itemEntity.isOnGround());
    }

    @Inject(method = "render(Lnet/minecraft/client/render/entity/state/ItemEntityRenderState;Lnet/minecraft/client/util/math/MatrixStack;Lnet/minecraft/client/render/VertexConsumerProvider;I)V", at = @At("HEAD"))
    private void onRender(
        ItemEntityRenderState state,
        MatrixStack matrixStack,
        VertexConsumerProvider vertexConsumerProvider,
        int i,
        CallbackInfo ci
    ) {
        boolean physicsEnabled = OverlayScreen.configStates.getOrDefault("item_physics", true);
        boolean isOnGround = ON_GROUND_MAP.getOrDefault(state, false);
        if (physicsEnabled && isOnGround) {
            matrixStack.translate(0.0d, -0.15d, 0.0d);
            // Rotate flat (rotate around X axis by 90 degrees)
            matrixStack.multiply(net.minecraft.util.math.RotationAxis.POSITIVE_X.rotationDegrees(90F));
            
            // Stack items vertically based on renderedAmount
            int count = state.renderedAmount;
            if (count > 1) {
                float offset = 0.02f * (count / 16f);
                matrixStack.translate(0.0d, 0.0d, -offset);
            }
        }
    }
}
