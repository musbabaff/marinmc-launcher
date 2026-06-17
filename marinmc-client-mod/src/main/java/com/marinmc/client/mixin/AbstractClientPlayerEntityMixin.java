package com.marinmc.client.mixin;

import net.minecraft.client.network.AbstractClientPlayerEntity;
import net.minecraft.client.util.SkinTextures;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;
import com.marinmc.client.cosmetics.CosmeticProfile;

@Mixin(AbstractClientPlayerEntity.class)
public class AbstractClientPlayerEntityMixin {

    @Inject(method = "getSkinTextures", at = @At("RETURN"), cancellable = true)
    private void onGetSkinTextures(CallbackInfoReturnable<SkinTextures> cir) {
        AbstractClientPlayerEntity player = (AbstractClientPlayerEntity) (Object) this;
        if (net.minecraft.client.MinecraftClient.getInstance() != null &&
            net.minecraft.client.MinecraftClient.getInstance().getSession() != null &&
            player.getUuid().equals(net.minecraft.client.MinecraftClient.getInstance().getSession().getUuidOrNull())) {
            SkinTextures original = cir.getReturnValue();
            if (original != null) {
                SkinTextures customTextures = CosmeticProfile.getLocalSkinTextures(original);
                if (customTextures != null) {
                    cir.setReturnValue(customTextures);
                }
            }
        }
    }
}
