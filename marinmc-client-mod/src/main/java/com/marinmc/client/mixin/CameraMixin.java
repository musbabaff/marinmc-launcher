package com.marinmc.client.mixin;

import com.marinmc.client.features.FreelookHandler;
import net.minecraft.client.render.Camera;
import net.minecraft.entity.Entity;
import net.minecraft.world.BlockView;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Shadow;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * Mixin into Camera to override yaw/pitch when Freelook mode is active.
 * This allows the camera to rotate freely while the player character
 * maintains its original facing direction.
 */
@Mixin(Camera.class)
public abstract class CameraMixin {

    @Shadow
    protected abstract void setRotation(float yaw, float pitch);

    @Inject(method = "update", at = @At("TAIL"))
    private void onCameraUpdate(BlockView area, Entity focusedEntity, boolean thirdPerson,
                                 boolean inverseView, float tickDelta, CallbackInfo ci) {
        FreelookHandler handler = FreelookHandler.getInstance();
        if (handler.isActive()) {
            // Override the camera rotation with our freelook values
            setRotation(handler.getCameraYaw(), handler.getCameraPitch());
        }
    }
}
