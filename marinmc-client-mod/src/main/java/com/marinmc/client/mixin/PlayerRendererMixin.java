package com.marinmc.client.mixin;

import org.spongepowered.asm.mixin.Mixin;
import net.minecraft.client.render.entity.PlayerEntityRenderer;

@Mixin(PlayerEntityRenderer.class)
public class PlayerRendererMixin {
    // Empty class to prevent target warnings, registered features are handled in LivingEntityRendererMixin
}
