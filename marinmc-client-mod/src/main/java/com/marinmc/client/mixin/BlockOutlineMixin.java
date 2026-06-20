package com.marinmc.client.mixin;

import com.marinmc.client.gui.OverlayScreen;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.render.Camera;
import net.minecraft.client.render.GameRenderer;
import net.minecraft.client.render.LightmapTextureManager;
import net.minecraft.client.render.WorldRenderer;
import net.minecraft.client.util.math.MatrixStack;
import org.joml.Matrix4f;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.ModifyVariable;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

@Mixin(WorldRenderer.class)
public class BlockOutlineMixin {
    
    @ModifyVariable(
        method = "drawBlockOutline(Lnet/minecraft/client/util/math/MatrixStack;Lnet/minecraft/client/render/VertexConsumer;Lnet/minecraft/entity/Entity;DDDLnet/minecraft/util/math/BlockPos;Lnet/minecraft/block/BlockState;I)V",
        at = @At("HEAD"),
        ordinal = 0,
        argsOnly = true
    )
    private int modifyOutlineColor(int originalColor) {
        Boolean enabled = OverlayScreen.configStates.get("block_outline");
        if (enabled != null && enabled) {
            String outlineColor = OverlayScreen.configStrings.getOrDefault("outline_color", "purple");
            switch (outlineColor.toLowerCase()) {
                case "red":    return 0xFFEF4444;
                case "green":  return 0xFF22C55E;
                case "blue":   return 0xFF3B82F6;
                case "orange": return 0xFFF97316;
                case "white":  return 0xFFFFFFFF;
                case "purple":
                default:       return 0xFFBF5BFF;
            }
        }
        return originalColor;
    }

    @Inject(
        method = "drawBlockOutline(Lnet/minecraft/client/util/math/MatrixStack;Lnet/minecraft/client/render/VertexConsumer;Lnet/minecraft/entity/Entity;DDDLnet/minecraft/util/math/BlockPos;Lnet/minecraft/block/BlockState;I)V",
        at = @At("HEAD")
    )
    private void beforeDrawBlockOutline(CallbackInfo ci) {
        Boolean enabled = OverlayScreen.configStates.get("block_outline");
        if (enabled != null && enabled) {
            String thicknessStr = OverlayScreen.configStrings.getOrDefault("outline_thickness", "1");
            try {
                float thickness = Float.parseFloat(thicknessStr);
                com.mojang.blaze3d.systems.RenderSystem.lineWidth(thickness);
            } catch (NumberFormatException e) {
                // Ignore
            }
        }
    }

    @Inject(
        method = "drawBlockOutline(Lnet/minecraft/client/util/math/MatrixStack;Lnet/minecraft/client/render/VertexConsumer;Lnet/minecraft/entity/Entity;DDDLnet/minecraft/util/math/BlockPos;Lnet/minecraft/block/BlockState;I)V",
        at = @At("RETURN")
    )
    private void afterDrawBlockOutline(CallbackInfo ci) {
        Boolean enabled = OverlayScreen.configStates.get("block_outline");
        if (enabled != null && enabled) {
            com.mojang.blaze3d.systems.RenderSystem.lineWidth(1.0F);
        }
    }

}

