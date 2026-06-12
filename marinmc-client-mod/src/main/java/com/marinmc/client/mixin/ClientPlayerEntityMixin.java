package com.marinmc.client.mixin;

import com.marinmc.client.MarinClient;
import com.marinmc.client.gui.OverlayScreen;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.network.ClientPlayerEntity;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Unique;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

@Mixin(ClientPlayerEntity.class)
public class ClientPlayerEntityMixin {
    @Unique
    private boolean sneakWasPressed = false;
    @Unique
    private boolean sprintWasPressed = false;

    @Inject(method = "tickMovement", at = @At("HEAD"))
    private void onTickMovement(CallbackInfo ci) {
        ClientPlayerEntity player = (ClientPlayerEntity) (Object) this;
        MinecraftClient mc = MinecraftClient.getInstance();

        // Check if the toggle_sneak mod is enabled
        boolean modEnabled = OverlayScreen.configStates.getOrDefault("toggle_sneak", false);
        if (!modEnabled) {
            MarinClient.toggledSprint = false;
            MarinClient.toggledSneak = false;
            return;
        }

        // Toggle Sneak logic
        boolean sneakPressed = mc.options.sneakKey.isPressed();
        if (sneakPressed && !sneakWasPressed) {
            MarinClient.toggledSneak = !MarinClient.toggledSneak;
        }
        sneakWasPressed = sneakPressed;

        // Toggle Sprint logic
        boolean sprintPressed = mc.options.sprintKey.isPressed();
        if (sprintPressed && !sprintWasPressed) {
            MarinClient.toggledSprint = !MarinClient.toggledSprint;
        }
        sprintWasPressed = sprintPressed;

        // Override input states
        boolean forceSneak = MarinClient.toggledSneak;
        boolean forceSprint = MarinClient.toggledSprint && player.input.playerInput.forward() && !forceSneak && !player.isSubmergedInWater();

        if (forceSneak || forceSprint) {
            net.minecraft.util.PlayerInput current = player.input.playerInput;
            player.input.playerInput = new net.minecraft.util.PlayerInput(
                current.forward(),
                current.backward(),
                current.left(),
                current.right(),
                current.jump(),
                forceSneak || current.sneak(),
                forceSprint || current.sprint()
            );
        }
    }
}
