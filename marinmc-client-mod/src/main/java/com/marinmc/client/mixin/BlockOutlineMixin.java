package com.marinmc.client.mixin;

import com.marinmc.client.gui.OverlayScreen;
import net.minecraft.client.render.WorldRenderer;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.ModifyVariable;

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
            // 0xFFBF5BFF is neon purple/violet (ARGB packed)
            return 0xFFBF5BFF;
        }
        return originalColor;
    }
}
