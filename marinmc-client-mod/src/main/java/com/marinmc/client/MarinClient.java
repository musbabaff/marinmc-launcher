package com.marinmc.client;

import com.marinmc.client.gui.OverlayScreen;
import com.marinmc.client.features.FreelookHandler;
import net.fabricmc.api.ClientModInitializer;
import net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientTickEvents;
import net.fabricmc.fabric.api.client.keybinding.v1.KeyBindingHelper;
import net.minecraft.client.option.KeyBinding;
import net.minecraft.client.util.InputUtil;
import org.lwjgl.glfw.GLFW;

import net.minecraft.text.Text;

public class MarinClient implements ClientModInitializer {
    public static KeyBinding overlayKeyBinding;
    public static KeyBinding fullbrightKeyBinding;
    public static KeyBinding ramCleanKeyBinding;
    public static boolean fullbrightEnabled = false;
    public static boolean toggledSprint = false;
    public static boolean toggledSneak = false;
    private static double originalGamma = 1.0;

    @Override
    public void onInitializeClient() {
        // Register custom RSHIFT Keybinding
        overlayKeyBinding = KeyBindingHelper.registerKeyBinding(new KeyBinding(
            "key.marinmc.overlay",
            InputUtil.Type.KEYSYM,
            GLFW.GLFW_KEY_RIGHT_SHIFT,
            "category.marinmc.client"
        ));

        // Register custom G Keybinding for Fullbright
        fullbrightKeyBinding = KeyBindingHelper.registerKeyBinding(new KeyBinding(
            "key.marinmc.fullbright",
            InputUtil.Type.KEYSYM,
            GLFW.GLFW_KEY_G,
            "category.marinmc.client"
        ));

        // Register custom U Keybinding for RAM Cleaning
        ramCleanKeyBinding = KeyBindingHelper.registerKeyBinding(new KeyBinding(
            "key.marinmc.ramclean",
            InputUtil.Type.KEYSYM,
            GLFW.GLFW_KEY_U,
            "category.marinmc.client"
        ));

        // Register Freelook keybinding (default F key)
        FreelookHandler.registerKeybinding();

        // Register tick event to check for key presses
        ClientTickEvents.END_CLIENT_TICK.register(client -> {
            while (overlayKeyBinding.wasPressed()) {
                if (client.currentScreen == null) {
                    client.setScreen(new OverlayScreen());
                }
            }

            while (fullbrightKeyBinding.wasPressed()) {
                fullbrightEnabled = !fullbrightEnabled;
                if (fullbrightEnabled) {
                    originalGamma = client.options.getGamma().getValue();
                    client.options.getGamma().setValue(12.0);
                    if (client.player != null) {
                        client.player.sendMessage(Text.literal("§bMarinMC Client §f» §aFullbright Aktif"), true);
                    }
                } else {
                    client.options.getGamma().setValue(originalGamma);
                    if (client.player != null) {
                        client.player.sendMessage(Text.literal("§bMarinMC Client §f» §cFullbright Pasif"), true);
                    }
                }
            }

            while (ramCleanKeyBinding.wasPressed()) {
                long before = Runtime.getRuntime().totalMemory() - Runtime.getRuntime().freeMemory();
                System.gc();
                long after = Runtime.getRuntime().totalMemory() - Runtime.getRuntime().freeMemory();
                long saved = (before - after) / (1024 * 1024);
                if (client.player != null) {
                    client.player.sendMessage(Text.literal("§bMarinMC Client §f» §aBellek Temizlendi! (Özgürleşen: " + Math.max(0, saved) + " MB)"), true);
                }
            }

            // Tick freelook handler
            FreelookHandler.getInstance().tick();
        });
    }
}
