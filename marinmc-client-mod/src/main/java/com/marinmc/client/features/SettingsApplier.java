package com.marinmc.client.features;

import com.marinmc.client.gui.OverlayScreen;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.option.GameOptions;
import net.minecraft.client.option.GraphicsMode;
import net.minecraft.particle.ParticlesMode;

/**
 * Applies the launcher menu's General/Performance toggles to real Minecraft
 * options every client tick. Previously these toggles were placeholders with no
 * effect; this wires the ones vanilla can actually back.
 */
public final class SettingsApplier {
    private SettingsApplier() {}

    // fps_boost saves the user's graphics settings so they can be restored on disable.
    private static GraphicsMode savedGraphics = null;
    private static Boolean savedShadows = null;
    private static boolean fpsBoostActive = false;

    // Zoom remembers the original FOV to restore when the key is released.
    private static Integer savedFov = null;

    // Fullbright remembers the original gamma so it can be restored.
    private static Double savedGamma = null;
    private static boolean fullbrightActive = false;

    private static boolean on(String key) {
        return OverlayScreen.configStates.getOrDefault(key, false);
    }

    public static void apply(MinecraftClient mc) {
        if (mc == null || mc.options == null) return;
        GameOptions o = mc.options;

        // Show/Hide the whole HUD (default: shown).
        o.hudHidden = !OverlayScreen.configStates.getOrDefault("show_hud", true);

        // Minimal view bobbing -> turn bobbing off when enabled.
        boolean wantBob = !on("minimal_view_bobbing");
        if (o.getBobView().getValue() != wantBob) o.getBobView().setValue(wantBob);

        // Raw mouse input.
        boolean wantRaw = on("raw_mouse_input");
        if (o.getRawMouseInput().getValue() != wantRaw) o.getRawMouseInput().setValue(wantRaw);

        // Reduced particles.
        ParticlesMode wantParticles = on("reduced_particles") ? ParticlesMode.MINIMAL : ParticlesMode.ALL;
        if (o.getParticles().getValue() != wantParticles) o.getParticles().setValue(wantParticles);

        // FPS Boost: fast graphics + no entity shadows (restores prior values when disabled).
        if (on("fps_boost")) {
            if (!fpsBoostActive) {
                savedGraphics = o.getGraphicsMode().getValue();
                savedShadows = o.getEntityShadows().getValue();
                fpsBoostActive = true;
            }
            if (o.getGraphicsMode().getValue() != GraphicsMode.FAST) o.getGraphicsMode().setValue(GraphicsMode.FAST);
            if (o.getEntityShadows().getValue()) o.getEntityShadows().setValue(false);
        } else if (fpsBoostActive) {
            if (savedGraphics != null) o.getGraphicsMode().setValue(savedGraphics);
            if (savedShadows != null) o.getEntityShadows().setValue(savedShadows);
            fpsBoostActive = false;
        }

        // Fullbright: the menu card and the G keybind both flip configStates["fullbright"];
        // here we apply/restore the gamma and keep the HUD indicator flag in sync.
        boolean fb = on("fullbright");
        com.marinmc.client.MarinClient.fullbrightEnabled = fb;
        if (fb) {
            if (!fullbrightActive) {
                savedGamma = o.getGamma().getValue();
                fullbrightActive = true;
            }
            if (o.getGamma().getValue() < 14.0) o.getGamma().setValue(15.0);
        } else if (fullbrightActive) {
            if (savedGamma != null) o.getGamma().setValue(savedGamma);
            fullbrightActive = false;
        }
    }

    /** Hold-to-zoom: shrink FOV while the zoom key is held (when the zoom toggle is on). */
    public static void tickZoom(MinecraftClient mc, boolean enabled, boolean keyHeld) {
        if (mc == null || mc.options == null) return;
        GameOptions o = mc.options;
        if (enabled && keyHeld) {
            if (savedFov == null) savedFov = o.getFov().getValue();
            if (o.getFov().getValue() != 30) o.getFov().setValue(30);
        } else if (savedFov != null) {
            o.getFov().setValue(savedFov);
            savedFov = null;
        }
    }
}
