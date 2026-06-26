package com.marinmc.client;

import com.marinmc.client.gui.OverlayScreen;
import com.marinmc.client.gui.hud.HudManager;
import com.marinmc.client.gui.hud.HudElement;
import com.marinmc.client.features.FreelookHandler;
import com.marinmc.client.features.RecordingManager;
import com.marinmc.client.features.SettingsApplier;
import com.marinmc.client.features.ChatMacroManager;
import com.marinmc.client.features.DamageTracker;
import net.fabricmc.api.ClientModInitializer;
import net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientTickEvents;
import net.fabricmc.fabric.api.client.keybinding.v1.KeyBindingHelper;
import net.minecraft.client.option.KeyBinding;
import net.minecraft.client.util.InputUtil;
import org.lwjgl.glfw.GLFW;

import net.minecraft.text.Text;
import net.fabricmc.fabric.api.client.rendering.v1.WorldRenderEvents;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.render.Camera;
import net.minecraft.client.util.math.MatrixStack;
import org.joml.Matrix4f;

public class MarinClient implements ClientModInitializer {
    public static KeyBinding overlayKeyBinding;
    public static KeyBinding fullbrightKeyBinding;
    public static KeyBinding ramCleanKeyBinding;
    public static KeyBinding recordKeyBinding;
    public static KeyBinding zoomKeyBinding;
    public static KeyBinding[] macroKeyBindings = new KeyBinding[ChatMacroManager.SLOTS];
    public static boolean fullbrightEnabled = false;
    public static boolean toggledSprint = false;
    public static boolean toggledSneak = false;

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

        // Register custom F10 Keybinding for Recording toggle
        recordKeyBinding = KeyBindingHelper.registerKeyBinding(new KeyBinding(
            "key.marinmc.record",
            InputUtil.Type.KEYSYM,
            GLFW.GLFW_KEY_F10,
            "category.marinmc.client"
        ));

        // Register custom C Keybinding for Zoom (hold)
        zoomKeyBinding = KeyBindingHelper.registerKeyBinding(new KeyBinding(
            "key.marinmc.zoom",
            InputUtil.Type.KEYSYM,
            GLFW.GLFW_KEY_C,
            "category.marinmc.client"
        ));

        // Register chat macro keybindings (unbound by default; user assigns + edits
        // messages in config/marinmc-macros.json)
        for (int i = 0; i < ChatMacroManager.SLOTS; i++) {
            macroKeyBindings[i] = KeyBindingHelper.registerKeyBinding(new KeyBinding(
                "key.marinmc.macro" + (i + 1),
                InputUtil.Type.KEYSYM,
                GLFW.GLFW_KEY_UNKNOWN,
                "category.marinmc.client"
            ));
        }

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
                // Flip the shared config flag; SettingsApplier applies/restores the
                // gamma so the G key and the menu card stay in sync.
                boolean now = !OverlayScreen.configStates.getOrDefault("fullbright", false);
                OverlayScreen.configStates.put("fullbright", now);
                OverlayScreen.saveConfigStatic();
                if (client.player != null) {
                    client.player.sendMessage(Text.literal(now
                        ? "§bMarinMC Client §f» §aFullbright Aktif"
                        : "§bMarinMC Client §f» §cFullbright Pasif"), true);
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

            while (recordKeyBinding.wasPressed()) {
                RecordingManager.toggle();
                // Auto-enable the REC indicator HUD element so feedback is visible.
                if (RecordingManager.isRecording()) {
                    HudElement replay = HudManager.getInstance().getElementById("replay");
                    if (replay != null && !replay.isEnabled()) {
                        replay.setEnabled(true);
                        OverlayScreen.configStates.put("replay", true);
                        OverlayScreen.saveConfigStatic();
                        HudManager.getInstance().saveConfig();
                    }
                }
                if (client.player != null) {
                    if (RecordingManager.isRecording()) {
                        client.player.sendMessage(Text.literal("§bMarinMC Client §f» §c⏺ Kayıt Başladı"), true);
                    } else {
                        client.player.sendMessage(Text.literal("§bMarinMC Client §f» §7⏹ Kayıt Durduruldu"), true);
                    }
                }
            }

            // Chat macros: send the configured message when a bound macro key is pressed
            for (int i = 0; i < macroKeyBindings.length; i++) {
                while (macroKeyBindings[i].wasPressed()) {
                    if (client.currentScreen == null) {
                        ChatMacroManager.send(client, i);
                    }
                }
            }

            // Track real damage taken (for the Damage Indicator HUD)
            DamageTracker.tick(client);

            // Apply General/Performance toggles to real Minecraft options
            SettingsApplier.apply(client);
            // Hold-to-zoom (gated by the zoom toggle)
            SettingsApplier.tickZoom(client,
                OverlayScreen.configStates.getOrDefault("zoom", false),
                zoomKeyBinding.isPressed());

            // Tick freelook handler
            FreelookHandler.getInstance().tick();
        });

        // Register waypoint rendering in 3D world
        WorldRenderEvents.LAST.register(context -> {
            MinecraftClient mc = MinecraftClient.getInstance();
            if (mc.player == null || mc.world == null || OverlayScreen.waypoints.isEmpty()) return;

            Camera camera = context.camera();
            MatrixStack matrices = context.matrixStack();
            if (camera == null || matrices == null) return;

            double camX = camera.getPos().x;
            double camY = camera.getPos().y;
            double camZ = camera.getPos().z;

            net.minecraft.client.render.VertexConsumerProvider vertexConsumers = context.consumers();
            if (vertexConsumers == null) return;

            for (OverlayScreen.Waypoint wp : OverlayScreen.waypoints) {
                double dx = wp.x + 0.5 - camX;
                double dy = wp.y + 1.0 - camY;
                double dz = wp.z + 0.5 - camZ;

                double distSq = dx * dx + dy * dy + dz * dz;
                double dist = Math.sqrt(distSq);

                matrices.push();
                matrices.translate(dx, dy, dz);

                // Billboard rotation: face camera
                matrices.multiply(net.minecraft.util.math.RotationAxis.POSITIVE_Y.rotationDegrees(-camera.getYaw()));
                matrices.multiply(net.minecraft.util.math.RotationAxis.POSITIVE_X.rotationDegrees(camera.getPitch()));

                // Size calculation
                float scale = 0.02666667F;
                if (dist > 16.0) {
                    scale = (float)(scale * (dist / 16.0));
                }
                scale = Math.min(0.4f, scale);

                matrices.scale(-scale, -scale, scale);

                String label = wp.name + " (" + (int)dist + "m)";
                int color = 0xFFFFFFFF;
                if ("red".equalsIgnoreCase(wp.color)) color = 0xFFEF4444;
                else if ("green".equalsIgnoreCase(wp.color)) color = 0xFF22C55E;
                else if ("blue".equalsIgnoreCase(wp.color)) color = 0xFF2D7DD2;
                else if ("yellow".equalsIgnoreCase(wp.color)) color = 0xFFF59E0B;
                else if ("purple".equalsIgnoreCase(wp.color)) color = 0xFFA78BFA;
                else if ("orange".equalsIgnoreCase(wp.color)) color = 0xFFF97316;

                int textW = mc.textRenderer.getWidth(label);
                int halfW = textW / 2;

                Matrix4f positionMatrix = matrices.peek().getPositionMatrix();

                // Draw text plate through blocks
                mc.textRenderer.draw(
                    label,
                    -halfW,
                    0,
                    color,
                    false,
                    positionMatrix,
                    vertexConsumers,
                    net.minecraft.client.font.TextRenderer.TextLayerType.SEE_THROUGH,
                    0x40000000,
                    15728880
                );

                matrices.pop();
            }
            if (vertexConsumers instanceof net.minecraft.client.render.VertexConsumerProvider.Immediate) {
                ((net.minecraft.client.render.VertexConsumerProvider.Immediate) vertexConsumers).draw();
            }
        });
    }
}
