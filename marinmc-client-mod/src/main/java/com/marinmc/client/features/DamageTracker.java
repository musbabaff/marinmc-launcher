package com.marinmc.client.features;

import net.minecraft.client.MinecraftClient;

/**
 * Tracks real damage taken by the local player by watching health changes each
 * tick, so the Damage Indicator HUD can show the actual last hit instead of a
 * static "Active" placeholder.
 */
public final class DamageTracker {
    private static final long WINDOW_MS = 2500;
    private static float lastHealth = -1f;
    private static float recentDamage = 0f;
    private static long lastDamageAt = 0L;

    private DamageTracker() {}

    public static void tick(MinecraftClient mc) {
        if (mc == null || mc.player == null) {
            lastHealth = -1f;
            return;
        }
        float hp = mc.player.getHealth();
        if (lastHealth < 0f) {
            lastHealth = hp;
            return;
        }
        if (hp < lastHealth - 0.01f) {
            recentDamage = lastHealth - hp;
            lastDamageAt = System.currentTimeMillis();
        }
        lastHealth = hp;
    }

    public static boolean hasRecent() {
        return lastDamageAt > 0 && (System.currentTimeMillis() - lastDamageAt) < WINDOW_MS;
    }

    public static float getRecentDamage() {
        return recentDamage;
    }

    /** 1.0 right after a hit, fading to 0.0 across the window. */
    public static float getFade() {
        if (lastDamageAt == 0) return 0f;
        long age = System.currentTimeMillis() - lastDamageAt;
        if (age >= WINDOW_MS) return 0f;
        return 1f - (age / (float) WINDOW_MS);
    }
}
