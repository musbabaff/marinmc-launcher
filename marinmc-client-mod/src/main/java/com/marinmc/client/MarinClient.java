package com.marinmc.client;

import com.marinmc.client.gui.OverlayScreen;
import net.fabricmc.api.ClientModInitializer;
import net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientTickEvents;
import net.fabricmc.fabric.api.client.keybinding.v1.KeyBindingHelper;
import net.minecraft.client.option.KeyBinding;
import net.minecraft.client.util.InputUtil;
import org.lwjgl.glfw.GLFW;

public class MarinClient implements ClientModInitializer {
    public static KeyBinding overlayKeyBinding;

    @Override
    public void onInitializeClient() {
        // Register custom RSHIFT Keybinding
        overlayKeyBinding = KeyBindingHelper.registerKeyBinding(new KeyBinding(
            "key.marinmc.overlay",
            InputUtil.Type.KEYSYM,
            GLFW.GLFW_KEY_RIGHT_SHIFT,
            "category.marinmc.client"
        ));

        // Register tick event to check for key presses
        ClientTickEvents.END_CLIENT_TICK.register(client -> {
            while (overlayKeyBinding.wasPressed()) {
                if (client.currentScreen == null) {
                    client.setScreen(new OverlayScreen());
                }
            }
        });
    }
}
