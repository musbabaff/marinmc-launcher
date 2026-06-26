package com.marinmc.client.gui.hud;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.reflect.TypeToken;
import com.marinmc.client.gui.OverlayScreen;
import com.marinmc.client.features.RecordingManager;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.network.PlayerListEntry;
import net.minecraft.client.resource.language.I18n;
import net.minecraft.entity.EquipmentSlot;
import net.minecraft.item.ItemStack;
import net.minecraft.registry.entry.RegistryEntry;
import net.minecraft.text.Text;
import net.minecraft.util.math.BlockPos;
import net.minecraft.util.math.Vec3d;
import net.minecraft.world.LightType;
import net.minecraft.world.biome.Biome;

import java.io.File;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;
import java.lang.reflect.Type;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

public class HudManager {
    private static final File CONFIG_FILE = new File("marinmc-hud-config.json");
    private static final Gson GSON = new GsonBuilder().setPrettyPrinting().create();
    private static final HudManager INSTANCE = new HudManager();

    private final List<HudElement> elements = new ArrayList<>();

    // CPS click buffers
    private static final List<Long> leftClicks = new ArrayList<>();
    private static final List<Long> rightClicks = new ArrayList<>();

    // FPS circular buffer for averaging
    private static final int[] fpsBuffer = new int[60];
    private static int fpsBufferIndex = 0;
    private static int fpsBufferCount = 0;
    private static long lastFpsUpdate = 0;

    // Hit indicator events: [angle, ticksRemaining]
    private static final List<float[]> hitEvents = new ArrayList<>();

    public static HudManager getInstance() {
        return INSTANCE;
    }

    private HudManager() {
        // Existing elements (upgraded)
        elements.add(new FpsElement("fps", "FPS Counter", 10, 10));
        elements.add(new CpsElement("cps", "CPS Counter", 10, 30));
        elements.add(new KeystrokesElement("keystrokes", "Keystrokes", 10, 60));
        elements.add(new ArmorStatusElement("armor", "Armor Status", 10, 150));
        elements.add(new CompassElement("compass", "Direction HUD", 100, 10));
        elements.add(new CoordsElement("coords", "Coordinates", 100, 34));
        elements.add(new PingElement("ping", "Ping Counter", 100, 66));
        elements.add(new SpeedElement("speed", "Speedometer", 100, 86));
        elements.add(new ReplayElement("replay", "Replay Status", 100, 106));
        elements.add(new PotionStatusElement("potion_status", "Potion Status", 200, 10));
        elements.add(new CrosshairElement("crosshair", "Crosshair Customizer", 0, 0));
        // New elements (default disabled)
        elements.add(new TimeDisplayElement("time_display", "Time Display", 200, 60));
        elements.add(new ServerInfoElement("server_info", "Server Info", 200, 92));
        elements.add(new ItemCounterElement("item_counter", "Item Counter", 200, 112));
        elements.add(new HitIndicatorElement("hit_indicator", "Hit Indicator", 0, 0));
        elements.add(new DamageIndicatorElement("damage_indicator", "Damage Indicator", 200, 136));
        elements.add(new SaturationDisplayElement("saturation_display", "Saturation Display", 200, 156));
        elements.add(new LightLevelElement("light_level", "Light Level", 200, 176));
        elements.add(new ChatMacrosElement("chat_macros", "Chat Macros", 200, 196));
        elements.add(new MemoryUsageElement("memory_usage", "Memory Usage", 200, 216));

        loadConfig();
    }

    public List<HudElement> getElements() {
        return elements;
    }

    // ========== CPS Tracking ==========
    public static void registerClick(int button) {
        long now = System.currentTimeMillis();
        if (button == 0) {
            leftClicks.add(now);
        } else if (button == 1) {
            rightClicks.add(now);
        }
    }

    public static int getCps(int button) {
        long limit = System.currentTimeMillis() - 1000;
        List<Long> clicks = (button == 0) ? leftClicks : rightClicks;
        clicks.removeIf(time -> time < limit);
        return clicks.size();
    }

    // ========== FPS Buffer ==========
    public static void updateFpsBuffer(int fps) {
        fpsBuffer[fpsBufferIndex] = fps;
        fpsBufferIndex = (fpsBufferIndex + 1) % 60;
        if (fpsBufferCount < 60) fpsBufferCount++;
    }

    public static int getAverageFps() {
        if (fpsBufferCount == 0) return 0;
        int sum = 0;
        for (int i = 0; i < fpsBufferCount; i++) sum += fpsBuffer[i];
        return sum / fpsBufferCount;
    }

    // ========== Hit Indicator ==========
    public static void addHitEvent(float angle) {
        hitEvents.add(new float[]{angle, 20f});
        if (hitEvents.size() > 8) hitEvents.remove(0);
    }

    public static void tickHitEvents() {
        hitEvents.removeIf(e -> {
            e[1] -= 1;
            return e[1] <= 0;
        });
    }

    public static List<float[]> getHitEvents() {
        return hitEvents;
    }

    // ========== Render ==========
    public void renderAll(DrawContext context) {
        MinecraftClient mc = MinecraftClient.getInstance();
        long now = System.currentTimeMillis();
        if (now - lastFpsUpdate >= 50) {
            updateFpsBuffer(mc.getCurrentFps());
            lastFpsUpdate = now;
        }
        tickHitEvents();
        for (HudElement element : elements) {
            if (element.isEnabled()) {
                element.render(context);
            }
        }
    }

    // ========== Config ==========
    public void loadConfig() {
        if (!CONFIG_FILE.exists()) {
            saveConfig();
            return;
        }
        try (FileReader reader = new FileReader(CONFIG_FILE)) {
            Type type = new TypeToken<Map<String, ElementConfig>>(){}.getType();
            Map<String, ElementConfig> configMap = GSON.fromJson(reader, type);
            if (configMap != null) {
                for (HudElement el : elements) {
                    ElementConfig cfg = configMap.get(el.getId());
                    if (cfg != null) {
                        el.setX(cfg.x);
                        el.setY(cfg.y);
                        el.setEnabled(cfg.enabled);
                        el.setScale(cfg.scale);
                        if (cfg.colorTheme != null) {
                            el.setColorTheme(cfg.colorTheme);
                        }
                        if (cfg.bgOpacity != 0) {
                            el.setBgOpacity(cfg.bgOpacity);
                        }
                        el.setBorderRadius(cfg.borderRadius);
                        if (cfg.textShadow != null) {
                            el.setTextShadow(cfg.textShadow);
                        }
                        if (cfg.bracketType != null) {
                            el.setBracketType(cfg.bracketType);
                        }
                        if (cfg.showBackground != null) {
                            el.setShowBackground(cfg.showBackground);
                        }
                    }
                }
            }
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    public void saveConfig() {
        Map<String, ElementConfig> configMap = new HashMap<>();
        for (HudElement el : elements) {
            configMap.put(el.getId(), new ElementConfig(
                el.getX(),
                el.getY(),
                el.isEnabled(),
                el.getScale(),
                el.getColorTheme(),
                el.getBgOpacity(),
                el.getBorderRadius(),
                el.isTextShadow(),
                el.getBracketType(),
                el.isShowBackground()
            ));
        }
        try (FileWriter writer = new FileWriter(CONFIG_FILE)) {
            GSON.toJson(configMap, writer);
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    public void applyPreset(String presetName) {
        MinecraftClient mc = MinecraftClient.getInstance();
        int screenWidth = mc.getWindow().getScaledWidth();

        for (HudElement el : elements) {
            el.setEnabled(true);
            el.setScale(1.0f);
            el.setTextShadow(true);
            el.setBracketType("none");
            el.setShowBackground(true);
            el.setBgOpacity(0xAA);
            el.setBorderRadius(0);
            el.setColorTheme("white");
        }
        // Crosshair disabled by default
        HudElement crosshair = getElementById("crosshair");
        if (crosshair != null) crosshair.setEnabled(false);

        // All new elements disabled by default in every preset
        String[] newElementIds = {"time_display", "server_info", "item_counter", "hit_indicator",
                "damage_indicator", "saturation_display", "light_level", "chat_macros", "memory_usage"};
        for (String id : newElementIds) {
            HudElement newEl = getElementById(id);
            if (newEl != null) newEl.setEnabled(false);
        }

        if ("classic".equalsIgnoreCase(presetName) || "reset".equalsIgnoreCase(presetName)) {
            getById("fps").setX(10); getById("fps").setY(10);
            getById("cps").setX(10); getById("cps").setY(30);
            getById("keystrokes").setX(10); getById("keystrokes").setY(60);
            getById("armor").setX(10); getById("armor").setY(150);
            getById("compass").setX(100); getById("compass").setY(10);
            getById("coords").setX(100); getById("coords").setY(34);
            getById("ping").setX(100); getById("ping").setY(66);
            getById("speed").setX(100); getById("speed").setY(86);
            getById("replay").setX(100); getById("replay").setY(106);
            getById("potion_status").setX(200); getById("potion_status").setY(10);

            if ("classic".equalsIgnoreCase(presetName)) {
                for (HudElement el : elements) {
                    el.setBracketType("square");
                }
            }
        } else if ("left_aligned".equalsIgnoreCase(presetName)) {
            getById("fps").setX(10); getById("fps").setY(10);
            getById("cps").setX(10); getById("cps").setY(30);
            getById("ping").setX(10); getById("ping").setY(56);
            getById("speed").setX(10); getById("speed").setY(76);
            getById("armor").setX(10); getById("armor").setY(96);
            getById("keystrokes").setX(10); getById("keystrokes").setY(170);
            getById("coords").setX(10); getById("coords").setY(250);
            getById("compass").setX(10); getById("compass").setY(282);
            getById("replay").setX(10); getById("replay").setY(306);
            getById("potion_status").setX(10); getById("potion_status").setY(326);
        } else if ("minimal".equalsIgnoreCase(presetName)) {
            for (HudElement el : elements) {
                el.setShowBackground(false);
                el.setBracketType("none");
                el.setScale(0.8f);
            }
            getById("fps").setX(10); getById("fps").setY(5);
            getById("cps").setX(60); getById("cps").setY(5);
            getById("ping").setX(140); getById("ping").setY(5);
            getById("speed").setX(210); getById("speed").setY(5);
            getById("coords").setX(310); getById("coords").setY(5);
            getById("compass").setX(370); getById("compass").setY(5);
            getById("replay").setX(490); getById("replay").setY(5);
            getById("keystrokes").setX(10); getById("keystrokes").setY(25);
            getById("armor").setX(70); getById("armor").setY(25);
            getById("potion_status").setX(150); getById("potion_status").setY(25);
        } else if ("clean".equalsIgnoreCase(presetName)) {
            for (HudElement el : elements) {
                el.setEnabled(false);
            }
            HudElement fps = getById("fps");
            HudElement cps = getById("cps");
            HudElement ping = getById("ping");
            fps.setEnabled(true);
            cps.setEnabled(true);
            ping.setEnabled(true);
            int cx = screenWidth > 0 ? screenWidth / 2 : 400;
            fps.setX(cx - 95); fps.setY(10);
            cps.setX(cx - 35); cps.setY(10);
            ping.setX(cx + 45); ping.setY(10);
        }
        saveConfig();
    }

    private HudElement getById(String id) {
        return getElementById(id);
    }

    public HudElement getElementById(String id) {
        for (HudElement el : elements) {
            if (el.getId().equals(id)) return el;
        }
        return null;
    }

    // ========== Config Data Class ==========
    private static class ElementConfig {
        int x;
        int y;
        boolean enabled;
        float scale;
        String colorTheme;
        int bgOpacity;
        int borderRadius;
        Boolean textShadow;
        String bracketType;
        Boolean showBackground;

        ElementConfig(int x, int y, boolean enabled, float scale, String colorTheme, int bgOpacity, int borderRadius, Boolean textShadow, String bracketType, Boolean showBackground) {
            this.x = x;
            this.y = y;
            this.enabled = enabled;
            this.scale = scale;
            this.colorTheme = colorTheme;
            this.bgOpacity = bgOpacity;
            this.borderRadius = borderRadius;
            this.textShadow = textShadow;
            this.bracketType = bracketType;
            this.showBackground = showBackground;
        }
    }

    // ========================================================================
    // UPGRADED ELEMENT DEFINITIONS
    // ========================================================================

    // --- FPS Counter: Color-coded (Green >= 60, Yellow 30-59, Red < 30) ---
    private static class FpsElement extends HudElement {
        FpsElement(String id, String name, int defaultX, int defaultY) {
            super(id, name, defaultX, defaultY, 50, 16);
        }

        @Override
        public void render(DrawContext context) {
            MinecraftClient mc = MinecraftClient.getInstance();
            int fps = mc.getCurrentFps();
            int fpsColor;
            if (fps >= 60) fpsColor = 0xFF22C55E;
            else if (fps >= 30) fpsColor = 0xFFF59E0B;
            else fpsColor = 0xFFEF4444;

            String fpsText = "FPS: " + fps;
            this.width = mc.textRenderer.getWidth(formatText(fpsText)) + 10;

            if (showBackground) {
                int bgColor = (bgOpacity << 24) | 0x000000;
                drawRoundedRect(context, x, y, getWidth(), getHeight(), bgColor, borderRadius);
                drawRoundedBorder(context, x, y, getWidth(), getHeight(), getThemeBorderColorHex(), borderRadius);
            }
            drawElementText(context, fpsText, x + 5, y + 4, fpsColor);
        }
    }

    // --- CPS Counter: L/R separate + CPS bar ---
    private static class CpsElement extends HudElement {
        CpsElement(String id, String name, int defaultX, int defaultY) {
            super(id, name, defaultX, defaultY, 80, 22);
        }

        @Override
        public void render(DrawContext context) {
            MinecraftClient mc = MinecraftClient.getInstance();
            int leftCps = getCps(0);
            int rightCps = getCps(1);

            String leftText = "L: " + leftCps;
            String sep = " | ";
            String rightText = "R: " + rightCps;

            int textWidth = mc.textRenderer.getWidth(formatText(leftText)) + mc.textRenderer.getWidth(sep) + mc.textRenderer.getWidth(rightText);
            this.width = textWidth + 10;

            if (showBackground) {
                int bgColor = (bgOpacity << 24) | 0x000000;
                drawRoundedRect(context, x, y, getWidth(), getHeight(), bgColor, borderRadius);
                drawRoundedBorder(context, x, y, getWidth(), getHeight(), getThemeBorderColorHex(), borderRadius);
            }

            int tx = x + 5;
            int ty = y + 3;

            if (textShadow) {
                context.drawTextWithShadow(mc.textRenderer, formatText(leftText), tx, ty, getThemeColorHex());
                int sepX = tx + mc.textRenderer.getWidth(formatText(leftText));
                context.drawTextWithShadow(mc.textRenderer, sep, sepX, ty, 0xFFA1A1AA);
                int rightX = sepX + mc.textRenderer.getWidth(sep);
                context.drawTextWithShadow(mc.textRenderer, rightText, rightX, ty, 0xFFF97316);
            } else {
                context.drawText(mc.textRenderer, formatText(leftText), tx, ty, getThemeColorHex(), false);
                int sepX = tx + mc.textRenderer.getWidth(formatText(leftText));
                context.drawText(mc.textRenderer, sep, sepX, ty, 0xFFA1A1AA, false);
                int rightX = sepX + mc.textRenderer.getWidth(sep);
                context.drawText(mc.textRenderer, rightText, rightX, ty, 0xFFF97316, false);
            }

            // CPS bar
            int barX = x + 5;
            int barY = y + 15;
            int barW = getWidth() - 10;
            int barH = 3;
            context.fill(barX, barY, barX + barW, barY + barH, 0x30FFFFFF);
            int maxCps = Math.max(leftCps, rightCps);
            float fill = Math.min(1.0f, maxCps / 20.0f);
            int fillW = (int)(fill * barW);
            if (fillW > 0) {
                context.fill(barX, barY, barX + fillW, barY + barH, getThemeColorHex());
            }
        }
    }

    // --- Keystrokes: Added spacebar ---
    private static class KeystrokesElement extends HudElement {
        KeystrokesElement(String id, String name, int defaultX, int defaultY) {
            super(id, name, defaultX, defaultY, 56, 74);
        }

        @Override
        public void render(DrawContext context) {
            MinecraftClient mc = MinecraftClient.getInstance();
            boolean w = mc.options.forwardKey.isPressed();
            boolean a = mc.options.leftKey.isPressed();
            boolean s = mc.options.backKey.isPressed();
            boolean d = mc.options.rightKey.isPressed();

            drawKey(context, "W", x + 19, y, 18, 18, w);
            drawKey(context, "A", x, y + 19, 18, 18, a);
            drawKey(context, "S", x + 19, y + 19, 18, 18, s);
            drawKey(context, "D", x + 38, y + 19, 18, 18, d);

            // Mouse buttons
            boolean l = mc.options.attackKey.isPressed();
            boolean r = mc.options.useKey.isPressed();
            drawKey(context, "L", x, y + 38, 27, 18, l);
            drawKey(context, "R", x + 28, y + 38, 28, 18, r);

            // Spacebar
            boolean space = mc.options.jumpKey.isPressed();
            drawKey(context, "\u2014", x, y + 57, 56, 15, space);
        }

        private void drawKey(DrawContext context, String key, int kx, int ky, int kw, int kh, boolean pressed) {
            MinecraftClient mc = MinecraftClient.getInstance();
            int color = pressed ? 0xDDFFFFFF : ((bgOpacity << 24) | 0x000000);
            int textColor = pressed ? 0xFF000000 : getThemeColorHex();
            context.fill(kx, ky, kx + kw, ky + kh, color);
            context.drawBorder(kx, ky, kw, kh, getThemeBorderColorHex());
            if (textShadow) {
                context.drawCenteredTextWithShadow(mc.textRenderer, key, kx + kw / 2, ky + kh / 2 - 4, textColor);
            } else {
                context.drawText(mc.textRenderer, key, kx + kw / 2 - mc.textRenderer.getWidth(key) / 2, ky + kh / 2 - 4, textColor, false);
            }
        }
    }

    // --- Armor Status: With durability bars ---
    private static class ArmorStatusElement extends HudElement {
        ArmorStatusElement(String id, String name, int defaultX, int defaultY) {
            super(id, name, defaultX, defaultY, 80, 68);
        }

        @Override
        public void render(DrawContext context) {
            MinecraftClient mc = MinecraftClient.getInstance();
            if (mc.player == null) return;

            if (showBackground) {
                int bgColor = (bgOpacity << 24) | 0x000000;
                drawRoundedRect(context, x, y, getWidth(), getHeight(), bgColor, borderRadius);
                drawRoundedBorder(context, x, y, getWidth(), getHeight(), getThemeBorderColorHex(), borderRadius);
            }

            int currentY = y + 4;
            EquipmentSlot[] slots = {
                EquipmentSlot.HEAD, EquipmentSlot.CHEST, EquipmentSlot.LEGS, EquipmentSlot.FEET
            };
            for (int i = 0; i < 4; i++) {
                ItemStack stack = mc.player.getEquippedStack(slots[i]);
                if (!stack.isEmpty()) {
                    context.drawItem(stack, x + 4, currentY);
                    int maxDamage = stack.getMaxDamage();
                    if (maxDamage > 0) {
                        int remaining = maxDamage - stack.getDamage();
                        int pct = (remaining * 100) / maxDamage;
                        int textColor = pct > 50 ? 0xFF22C55E : pct > 20 ? 0xFFF59E0B : 0xFFEF4444;

                        if (textShadow) {
                            context.drawTextWithShadow(mc.textRenderer, remaining + "", x + 24, currentY + 2, textColor);
                        } else {
                            context.drawText(mc.textRenderer, remaining + "", x + 24, currentY + 2, textColor, false);
                        }

                        // Durability bar
                        int barX = x + 24;
                        int barY = currentY + 12;
                        int barW = 30;
                        int barH = 2;
                        context.fill(barX, barY, barX + barW, barY + barH, 0x30FFFFFF);
                        float ratio = remaining / (float) maxDamage;
                        int fillW = (int)(ratio * barW);
                        int barColor = pct > 50 ? 0xFF22C55E : pct > 20 ? 0xFFF59E0B : 0xFFEF4444;
                        if (fillW > 0) {
                            context.fill(barX, barY, barX + fillW, barY + barH, barColor);
                        }
                    } else {
                        drawElementText(context, "1", x + 24, currentY + 4, getThemeColorHex());
                    }
                    currentY += 16;
                }
            }
        }
    }

    // --- Compass: Bedrock-style 360 degree scrolling bar ---
    private static class CompassElement extends HudElement {
        CompassElement(String id, String name, int defaultX, int defaultY) {
            super(id, name, defaultX, defaultY, 180, 20);
        }

        @Override
        public void render(DrawContext context) {
            MinecraftClient mc = MinecraftClient.getInstance();
            if (mc.player == null) return;

            float yaw = mc.player.getYaw() % 360;
            if (yaw < 0) yaw += 360;

            int barW = getWidth();
            int barH = getHeight();
            int centerX = x + barW / 2;

            if (showBackground) {
                int bgColor = (bgOpacity << 24) | 0x000000;
                drawRoundedRect(context, x, y, barW, barH, bgColor, borderRadius);
                drawRoundedBorder(context, x, y, barW, barH, getThemeBorderColorHex(), borderRadius);
            }

            // Clip contents to bar
            context.enableScissor(x + 2, y, x + barW - 2, y + barH);

            float pixelsPerDegree = barW / 90.0f;

            // Cardinal/ordinal directions
            // Minecraft: 0=South, 90=West, 180=North, 270=East
            String[] dirs = {"S", "SW", "W", "NW", "N", "NE", "E", "SE"};
            float[] dirAngles = {0, 45, 90, 135, 180, 225, 270, 315};

            for (int i = 0; i < 8; i++) {
                float diff = angleDiff(yaw, dirAngles[i]);
                if (Math.abs(diff) > 50) continue;

                int drawX = centerX + (int)(diff * pixelsPerDegree);
                int color;
                if ("N".equals(dirs[i])) color = 0xFFEF4444;
                else if ("S".equals(dirs[i])) color = 0xFF3B82F6;
                else color = getThemeColorHex();

                int textW = mc.textRenderer.getWidth(dirs[i]);
                if (textShadow) {
                    context.drawTextWithShadow(mc.textRenderer, dirs[i], drawX - textW / 2, y + 6, color);
                } else {
                    context.drawText(mc.textRenderer, dirs[i], drawX - textW / 2, y + 6, color, false);
                }
            }

            // Tick marks every 15 degrees
            for (int deg = 0; deg < 360; deg += 15) {
                float diff = angleDiff(yaw, deg);
                if (Math.abs(diff) > 50) continue;

                int drawX = centerX + (int)(diff * pixelsPerDegree);
                boolean isMajor = deg % 45 == 0;

                if (!isMajor) {
                    int tickH = 3;
                    context.fill(drawX, y + barH - tickH - 2, drawX + 1, y + barH - 2, 0x55FFFFFF);
                }
            }

            context.disableScissor();

            // Center indicator (gold triangle/line)
            context.fill(centerX - 1, y + 1, centerX + 2, y + 4, 0xFFFFD700);
            context.fill(centerX, y + 1, centerX + 1, y + 5, 0xFFFFD700);
        }

        private float angleDiff(float from, float to) {
            float diff = to - from;
            while (diff > 180) diff -= 360;
            while (diff < -180) diff += 360;
            return diff;
        }
    }

    // --- Coordinates: With biome display ---
    private static class CoordsElement extends HudElement {
        CoordsElement(String id, String name, int defaultX, int defaultY) {
            super(id, name, defaultX, defaultY, 130, 28);
        }

        @Override
        public void render(DrawContext context) {
            MinecraftClient mc = MinecraftClient.getInstance();
            if (mc.player == null) return;

            String coordsText = String.format("XYZ: %.1f / %.1f / %.1f", mc.player.getX(), mc.player.getY(), mc.player.getZ());
            String biomeName = "?";
            try {
                if (mc.world != null) {
                    BlockPos pos = mc.player.getBlockPos();
                    RegistryEntry<Biome> biome = mc.world.getBiome(pos);
                    biomeName = biome.getKey().map(key -> {
                        String path = key.getValue().getPath();
                        return path.substring(0, 1).toUpperCase() + path.substring(1).replace('_', ' ');
                    }).orElse("?");
                }
            } catch (Exception e) {
                biomeName = "?";
            }

            this.width = Math.max(mc.textRenderer.getWidth(formatText(coordsText)), mc.textRenderer.getWidth(biomeName)) + 10;

            if (showBackground) {
                int bgColor = (bgOpacity << 24) | 0x000000;
                drawRoundedRect(context, x, y, getWidth(), getHeight(), bgColor, borderRadius);
                drawRoundedBorder(context, x, y, getWidth(), getHeight(), getThemeBorderColorHex(), borderRadius);
            }

            drawElementText(context, coordsText, x + 5, y + 3, getThemeColorHex());

            if (textShadow) {
                context.drawTextWithShadow(mc.textRenderer, biomeName, x + 5, y + 16, 0xFFA1A1AA);
            } else {
                context.drawText(mc.textRenderer, biomeName, x + 5, y + 16, 0xFFA1A1AA, false);
            }
        }
    }

    // --- Ping Counter: Color-coded with signal bars ---
    private static class PingElement extends HudElement {
        PingElement(String id, String name, int defaultX, int defaultY) {
            super(id, name, defaultX, defaultY, 70, 16);
        }

        @Override
        public void render(DrawContext context) {
            MinecraftClient mc = MinecraftClient.getInstance();
            if (mc.player == null) return;

            int ping = 0;
            if (mc.getNetworkHandler() != null) {
                PlayerListEntry entry = mc.getNetworkHandler().getPlayerListEntry(mc.player.getUuid());
                if (entry != null) {
                    ping = entry.getLatency();
                }
            }

            int pingColor;
            int bars;
            if (ping < 50) { pingColor = 0xFF22C55E; bars = 4; }
            else if (ping < 100) { pingColor = 0xFF22C55E; bars = 3; }
            else if (ping < 150) { pingColor = 0xFFF59E0B; bars = 3; }
            else if (ping < 200) { pingColor = 0xFFF59E0B; bars = 2; }
            else { pingColor = 0xFFEF4444; bars = 1; }

            String pingText = ping + "ms";
            this.width = mc.textRenderer.getWidth(formatText(pingText)) + 10 + 20;

            if (showBackground) {
                int bgColor = (bgOpacity << 24) | 0x000000;
                drawRoundedRect(context, x, y, getWidth(), getHeight(), bgColor, borderRadius);
                drawRoundedBorder(context, x, y, getWidth(), getHeight(), getThemeBorderColorHex(), borderRadius);
            }

            drawElementText(context, pingText, x + 5, y + 4, pingColor);

            // Signal bars
            int barBaseX = x + getWidth() - 18;
            int barBaseY = y + getHeight() - 4;
            for (int i = 0; i < 4; i++) {
                int bh = 3 + i * 2;
                int bx = barBaseX + i * 4;
                int by = barBaseY - bh;
                int bColor = (i < bars) ? getThemeColorHex() : 0x30FFFFFF;
                context.fill(bx, by, bx + 3, barBaseY, bColor);
            }
        }
    }

    // --- Speedometer: With unit conversion ---
    private static class SpeedElement extends HudElement {
        SpeedElement(String id, String name, int defaultX, int defaultY) {
            super(id, name, defaultX, defaultY, 100, 16);
        }

        @Override
        public void render(DrawContext context) {
            MinecraftClient mc = MinecraftClient.getInstance();
            if (mc.player == null) return;

            Vec3d velocity = mc.player.getVelocity();
            double speedBps = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z) * 20.0;

            String unit = OverlayScreen.configStrings.getOrDefault("speed_unit", "B/s");
            double displaySpeed = speedBps;
            if ("km/h".equalsIgnoreCase(unit)) {
                displaySpeed = speedBps * 3.6;
            } else if ("m/s".equalsIgnoreCase(unit)) {
                displaySpeed = speedBps;
            }

            String speedText = String.format("Speed: %.2f %s", displaySpeed, unit);
            this.width = mc.textRenderer.getWidth(formatText(speedText)) + 10;

            if (showBackground) {
                int bgColor = (bgOpacity << 24) | 0x000000;
                drawRoundedRect(context, x, y, getWidth(), getHeight(), bgColor, borderRadius);
                drawRoundedBorder(context, x, y, getWidth(), getHeight(), getThemeBorderColorHex(), borderRadius);
            }
            drawElementText(context, speedText, x + 5, y + 4, getThemeColorHex());
        }
    }

    // --- Replay Status: Unchanged ---
    private static class ReplayElement extends HudElement {
        ReplayElement(String id, String name, int defaultX, int defaultY) {
            super(id, name, defaultX, defaultY, 50, 16);
        }

        @Override
        public void render(DrawContext context) {
            MinecraftClient mc = MinecraftClient.getInstance();
            boolean rec = RecordingManager.isRecording();

            // Recording: blinking red dot + elapsed timer. Idle: dim grey "ready" state.
            String label = rec ? ("REC " + RecordingManager.getElapsedFormatted()) : "REC";
            int dotColor;
            if (rec) {
                long blink = System.currentTimeMillis() / 500 % 2;
                dotColor = blink == 0 ? 0xFFEF4444 : 0xFF7F1D1D;
            } else {
                dotColor = 0xFF475569;
            }

            this.width = 16 + mc.textRenderer.getWidth(formatText(label)) + 6;

            if (showBackground) {
                int bgColor = (bgOpacity << 24) | 0x000000;
                drawRoundedRect(context, x, y, getWidth(), getHeight(), bgColor, borderRadius);
                drawRoundedBorder(context, x, y, getWidth(), getHeight(), getThemeBorderColorHex(), borderRadius);
            }
            context.fill(x + 6, y + 5, x + 12, y + 11, dotColor);
            drawElementText(context, label, x + 16, y + 4, rec ? getThemeColorHex() : 0xFF94A3B8);
        }
    }

    // --- Potion Status: Color-coded duration ---
    public static class PotionStatusElement extends HudElement {
        public PotionStatusElement(String id, String name, int defaultX, int defaultY) {
            super(id, name, defaultX, defaultY, 120, 40);
        }

        private String getRoman(int number) {
            if (number == 1) return "I";
            if (number == 2) return "II";
            if (number == 3) return "III";
            if (number == 4) return "IV";
            if (number == 5) return "V";
            return String.valueOf(number);
        }

        @Override
        public void render(DrawContext context) {
            MinecraftClient mc = MinecraftClient.getInstance();
            if (mc.player == null) return;

            java.util.Collection<net.minecraft.entity.effect.StatusEffectInstance> effects = mc.player.getActiveStatusEffects().values();
            if (effects.isEmpty()) return;

            this.height = Math.max(16, effects.size() * 12 + 8);

            int maxW = 100;
            for (net.minecraft.entity.effect.StatusEffectInstance effect : effects) {
                net.minecraft.registry.entry.RegistryEntry<net.minecraft.entity.effect.StatusEffect> type = effect.getEffectType();
                String eName = type.value().getName().getString();
                int level = effect.getAmplifier() + 1;
                String nameText = eName + (level > 1 ? " " + getRoman(level) : "");
                String timeText;
                if (effect.isInfinite() || effect.getDuration() > 32767) {
                    timeText = "**:**";
                } else {
                    int sec = effect.getDuration() / 20;
                    timeText = String.format("%02d:%02d", sec / 60, sec % 60);
                }
                int rowW = 16 + mc.textRenderer.getWidth(formatText(nameText)) + 12 + mc.textRenderer.getWidth(timeText) + 6;
                maxW = Math.max(maxW, rowW);
            }
            this.width = maxW;

            if (showBackground) {
                int bgColor = (bgOpacity << 24) | 0x000000;
                drawRoundedRect(context, x, y, getWidth(), getHeight(), bgColor, borderRadius);
                drawRoundedBorder(context, x, y, getWidth(), getHeight(), getThemeBorderColorHex(), borderRadius);
            }

            int currentY = y + 4;
            for (net.minecraft.entity.effect.StatusEffectInstance effect : effects) {
                net.minecraft.registry.entry.RegistryEntry<net.minecraft.entity.effect.StatusEffect> type = effect.getEffectType();
                int color = type.value().getColor();
                String eName = type.value().getName().getString();
                int level = effect.getAmplifier() + 1;
                String nameText = eName + (level > 1 ? " " + getRoman(level) : "");

                String timeText;
                int timeColor;
                if (effect.isInfinite() || effect.getDuration() > 32767) {
                    timeText = "**:**";
                    timeColor = 0xFFA1A1AA;
                } else {
                    int sec = effect.getDuration() / 20;
                    timeText = String.format("%02d:%02d", sec / 60, sec % 60);
                    if (sec > 60) timeColor = 0xFF22C55E;
                    else if (sec > 20) timeColor = 0xFFF59E0B;
                    else timeColor = 0xFFEF4444;
                }

                context.fill(x + 6, currentY + 2, x + 12, currentY + 8, color | 0xFF000000);
                drawElementText(context, nameText, x + 16, currentY, getThemeColorHex());

                if (textShadow) {
                    context.drawTextWithShadow(mc.textRenderer, timeText, x + getWidth() - mc.textRenderer.getWidth(timeText) - 6, currentY, timeColor);
                } else {
                    context.drawText(mc.textRenderer, timeText, x + getWidth() - mc.textRenderer.getWidth(timeText) - 6, currentY, timeColor, false);
                }

                currentY += 12;
            }
        }

        @Override
        public void renderDummy(DrawContext context) {
            MinecraftClient mc = MinecraftClient.getInstance();
            int maxW = 100;
            int row1W = 16 + mc.textRenderer.getWidth(formatText("Speed II")) + 12 + mc.textRenderer.getWidth("01:30") + 6;
            int row2W = 16 + mc.textRenderer.getWidth(formatText("Strength")) + 12 + mc.textRenderer.getWidth("00:15") + 6;
            maxW = Math.max(maxW, Math.max(row1W, row2W));
            this.width = maxW;

            if (showBackground) {
                int bgColor = (bgOpacity << 24) | 0x000000;
                drawRoundedRect(context, x, y, getWidth(), getHeight(), bgColor, borderRadius);
            }
            drawRoundedBorder(context, x, y, getWidth(), getHeight(), getThemeColorHex(), borderRadius);

            int textX = x + getWidth() / 2;
            int textY = y + 4;
            drawCenteredElementText(context, name, textX, textY, getThemeColorHex());

            int currentY = y + 16;

            context.fill(x + 6, currentY + 2, x + 12, currentY + 8, 0xFF3B82F6);
            drawElementText(context, "Speed II", x + 16, currentY, getThemeColorHex());
            if (textShadow) {
                context.drawTextWithShadow(mc.textRenderer, "01:30", x + getWidth() - mc.textRenderer.getWidth("01:30") - 6, currentY, 0xFF22C55E);
            } else {
                context.drawText(mc.textRenderer, "01:30", x + getWidth() - mc.textRenderer.getWidth("01:30") - 6, currentY, 0xFF22C55E, false);
            }

            currentY += 12;
            context.fill(x + 6, currentY + 2, x + 12, currentY + 8, 0xFFEF4444);
            drawElementText(context, "Strength", x + 16, currentY, getThemeColorHex());
            if (textShadow) {
                context.drawTextWithShadow(mc.textRenderer, "00:15", x + getWidth() - mc.textRenderer.getWidth("00:15") - 6, currentY, 0xFFEF4444);
            } else {
                context.drawText(mc.textRenderer, "00:15", x + getWidth() - mc.textRenderer.getWidth("00:15") - 6, currentY, 0xFFEF4444, false);
            }
        }
    }

    // --- Crosshair Customizer: Unchanged ---
    public static class CrosshairElement extends HudElement {
        public CrosshairElement(String id, String name, int defaultX, int defaultY) {
            super(id, name, defaultX, defaultY, 16, 16);
            this.enabled = false;
        }

        @Override
        public int getX() {
            MinecraftClient mc = MinecraftClient.getInstance();
            return mc.getWindow().getScaledWidth() / 2 - getWidth() / 2;
        }

        @Override
        public int getY() {
            MinecraftClient mc = MinecraftClient.getInstance();
            return mc.getWindow().getScaledHeight() / 2 - getHeight() / 2;
        }

        @Override
        public void setX(int x) {}

        @Override
        public void setY(int y) {}

        @Override
        public void render(DrawContext context) {
            // Drawn in InGameHudMixin.renderCrosshair
        }

        @Override
        public void renderDummy(DrawContext context) {
            int cx = getX() + getWidth() / 2;
            int cy = getY() + getHeight() / 2;
            drawCrosshair(context, cx, cy);
            context.drawBorder(getX(), getY(), getWidth(), getHeight(), getThemeColorHex());
        }

        public void drawCrosshair(DrawContext context, int centerX, int centerY) {
            int color = getThemeColorHex();
            int alpha = bgOpacity == 0 ? 255 : bgOpacity;
            int finalColor = (color & 0x00FFFFFF) | (alpha << 24);

            if ("red".equalsIgnoreCase(colorTheme)) {
                int r = Math.max(1, (int)(2 * scale));
                context.fill(centerX - r, centerY - r, centerX + r + 1, centerY + r + 1, finalColor);
            } else if ("green".equalsIgnoreCase(colorTheme)) {
                int r = Math.max(2, (int)(4 * scale));
                context.fill(centerX - r, centerY - r, centerX + r + 1, centerY - r + 1, finalColor);
                context.fill(centerX - r, centerY + r, centerX + r + 1, centerY + r + 1, finalColor);
                context.fill(centerX - r, centerY - r + 1, centerX - r + 1, centerY + r, finalColor);
                context.fill(centerX + r, centerY - r + 1, centerX + r + 1, centerY + r, finalColor);
            } else if ("blue".equalsIgnoreCase(colorTheme)) {
                int len = Math.max(2, (int)(5 * scale));
                context.fill(centerX - len, centerY, centerX - 1, centerY + 1, finalColor);
                context.fill(centerX + 2, centerY, centerX + len + 1, centerY + 1, finalColor);
                context.fill(centerX, centerY - len, centerX + 1, centerY - 1, finalColor);
                context.fill(centerX, centerY + 2, centerX + 1, centerY + len + 1, finalColor);
                context.fill(centerX - 1, centerY - 1, centerX + 2, centerY + 2, 0xFFFFFFFF);
            } else if ("purple".equalsIgnoreCase(colorTheme)) {
                int r = Math.max(2, (int)(4 * scale));
                context.fill(centerX - r, centerY - r, centerX + r + 1, centerY - r + 1, finalColor);
                context.fill(centerX - r, centerY + r, centerX + r + 1, centerY + r + 1, finalColor);
                context.fill(centerX - r, centerY - r + 1, centerX - r + 1, centerY + r, finalColor);
                context.fill(centerX + r, centerY - r + 1, centerX + r + 1, centerY + r, finalColor);
                context.fill(centerX - 1, centerY - 1, centerX + 2, centerY + 2, 0xFFFFFFFF);
            } else if ("orange".equalsIgnoreCase(colorTheme)) {
                int len = Math.max(2, (int)(5 * scale));
                context.fill(centerX - len, centerY, centerX + len + 1, centerY + 1, finalColor);
                context.fill(centerX, centerY - len, centerX + 1, centerY + len + 1, finalColor);
            } else {
                int len = Math.max(2, (int)(4 * scale));
                context.fill(centerX - len, centerY, centerX - 2, centerY + 1, finalColor);
                context.fill(centerX + 3, centerY, centerX + len + 1, centerY + 1, finalColor);
                context.fill(centerX, centerY - len, centerX + 1, centerY - 2, finalColor);
                context.fill(centerX, centerY + 3, centerX + 1, centerY + len + 1, finalColor);
            }
        }
    }

    // ========================================================================
    // NEW ELEMENT DEFINITIONS
    // ========================================================================

    // --- Time Display: Real-world time + MC day cycle ---
    private static class TimeDisplayElement extends HudElement {
        TimeDisplayElement(String id, String name, int defaultX, int defaultY) {
            super(id, name, defaultX, defaultY, 80, 28);
            this.enabled = false;
        }

        @Override
        public void render(DrawContext context) {
            MinecraftClient mc = MinecraftClient.getInstance();

            // Real world time
            String realTime = LocalTime.now().format(DateTimeFormatter.ofPattern("HH:mm"));
            // Minecraft day time
            String mcTime = "";
            int mcColor = 0xFFF59E0B;
            if (mc.world != null) {
                long worldTime = mc.world.getTimeOfDay() % 24000;
                int mcHour = (int)((worldTime / 1000 + 6) % 24);
                int mcMin = (int)((worldTime % 1000) * 60 / 1000);
                mcTime = String.format("MC %02d:%02d", mcHour, mcMin);
                boolean isNight = worldTime > 12500 && worldTime < 23500;
                mcColor = isNight ? 0xFF94A3B8 : 0xFFF59E0B;
            }

            this.width = Math.max(mc.textRenderer.getWidth(formatText(realTime)), mc.textRenderer.getWidth(formatText(mcTime))) + 10;

            if (showBackground) {
                int bgColor = (bgOpacity << 24) | 0x000000;
                drawRoundedRect(context, x, y, getWidth(), getHeight(), bgColor, borderRadius);
                drawRoundedBorder(context, x, y, getWidth(), getHeight(), getThemeBorderColorHex(), borderRadius);
            }

            drawElementText(context, realTime, x + 5, y + 3, getThemeColorHex());

            if (mc.world != null) {
                if (textShadow) {
                    context.drawTextWithShadow(mc.textRenderer, mcTime, x + 5, y + 16, mcColor);
                } else {
                    context.drawText(mc.textRenderer, mcTime, x + 5, y + 16, mcColor, false);
                }
            }
        }
    }

    // --- Server Info: Current server address ---
    private static class ServerInfoElement extends HudElement {
        ServerInfoElement(String id, String name, int defaultX, int defaultY) {
            super(id, name, defaultX, defaultY, 120, 16);
            this.enabled = false;
        }

        @Override
        public void render(DrawContext context) {
            MinecraftClient mc = MinecraftClient.getInstance();

            String serverText;
            if (mc.getCurrentServerEntry() != null) {
                serverText = mc.getCurrentServerEntry().address;
            } else {
                serverText = I18n.translate("marinmc.hud.singleplayer");
            }

            this.width = mc.textRenderer.getWidth(formatText(serverText)) + 10;

            if (showBackground) {
                int bgColor = (bgOpacity << 24) | 0x000000;
                drawRoundedRect(context, x, y, getWidth(), getHeight(), bgColor, borderRadius);
                drawRoundedBorder(context, x, y, getWidth(), getHeight(), getThemeBorderColorHex(), borderRadius);
            }

            drawElementText(context, serverText, x + 5, y + 4, getThemeColorHex());
        }
    }

    // --- Item Counter: Main hand item + inventory count ---
    private static class ItemCounterElement extends HudElement {
        ItemCounterElement(String id, String name, int defaultX, int defaultY) {
            super(id, name, defaultX, defaultY, 60, 20);
            this.enabled = false;
        }

        @Override
        public void render(DrawContext context) {
            MinecraftClient mc = MinecraftClient.getInstance();
            if (mc.player == null) return;

            ItemStack mainHand = mc.player.getMainHandStack();
            if (mainHand.isEmpty()) return;

            int count = 0;
            for (int i = 0; i < mc.player.getInventory().size(); i++) {
                ItemStack stack = mc.player.getInventory().getStack(i);
                if (!stack.isEmpty() && stack.getItem() == mainHand.getItem()) {
                    count += stack.getCount();
                }
            }

            String countText = "x" + count;
            this.width = 22 + mc.textRenderer.getWidth(formatText(countText)) + 6;

            if (showBackground) {
                int bgColor = (bgOpacity << 24) | 0x000000;
                drawRoundedRect(context, x, y, getWidth(), getHeight(), bgColor, borderRadius);
                drawRoundedBorder(context, x, y, getWidth(), getHeight(), getThemeBorderColorHex(), borderRadius);
            }

            // Draw item icon
            context.drawItem(mainHand, x + 2, y + 2);

            if (textShadow) {
                context.drawTextWithShadow(mc.textRenderer, formatText(countText), x + 22, y + 6, getThemeColorHex());
            } else {
                context.drawText(mc.textRenderer, formatText(countText), x + 22, y + 6, getThemeColorHex(), false);
            }
        }
    }

    // --- Hit Indicator: Directional damage arrows at screen center ---
    public static class HitIndicatorElement extends HudElement {
        public HitIndicatorElement(String id, String name, int defaultX, int defaultY) {
            super(id, name, defaultX, defaultY, 60, 60);
            this.enabled = false;
        }

        @Override
        public int getX() {
            MinecraftClient mc = MinecraftClient.getInstance();
            return mc.getWindow().getScaledWidth() / 2 - getWidth() / 2;
        }

        @Override
        public int getY() {
            MinecraftClient mc = MinecraftClient.getInstance();
            return mc.getWindow().getScaledHeight() / 2 - getHeight() / 2;
        }

        @Override
        public void setX(int x) {}

        @Override
        public void setY(int y) {}

        @Override
        public void render(DrawContext context) {
            List<float[]> events = HudManager.getHitEvents();
            if (events.isEmpty()) return;

            MinecraftClient mc = MinecraftClient.getInstance();
            int cx = mc.getWindow().getScaledWidth() / 2;
            int cy = mc.getWindow().getScaledHeight() / 2;
            int radius = 24;

            for (float[] event : events) {
                float angle = event[0];
                float ticks = event[1];
                float alpha = Math.min(1.0f, ticks / 10.0f);
                int a = (int)(alpha * 200);
                int color = (a << 24) | 0xEF4444;

                double rad = Math.toRadians(angle);
                int ax = cx + (int)(Math.cos(rad) * radius);
                int ay = cy + (int)(Math.sin(rad) * radius);

                context.fill(ax - 2, ay - 2, ax + 3, ay + 3, color);
                int mx = cx + (int)(Math.cos(rad) * (radius - 6));
                int my = cy + (int)(Math.sin(rad) * (radius - 6));
                context.fill(Math.min(ax, mx), Math.min(ay, my), Math.max(ax, mx) + 1, Math.max(ay, my) + 1, color);
            }
        }

        @Override
        public void renderDummy(DrawContext context) {
            int cx = getX() + getWidth() / 2;
            int cy = getY() + getHeight() / 2;
            context.drawBorder(getX(), getY(), getWidth(), getHeight(), getThemeColorHex());

            int radius = 20;
            float[] sampleAngles = {0, 90, 180, 270};
            for (float angle : sampleAngles) {
                double rad = Math.toRadians(angle);
                int ax = cx + (int)(Math.cos(rad) * radius);
                int ay = cy + (int)(Math.sin(rad) * radius);
                context.fill(ax - 2, ay - 2, ax + 3, ay + 3, 0xAAEF4444);
            }
            context.drawCenteredTextWithShadow(MinecraftClient.getInstance().textRenderer, "HIT", cx, cy - 4, 0x88FFFFFF);
        }
    }

    // --- Damage Indicator: Status card ---
    private static class DamageIndicatorElement extends HudElement {
        DamageIndicatorElement(String id, String name, int defaultX, int defaultY) {
            super(id, name, defaultX, defaultY, 80, 16);
            this.enabled = false;
        }

        @Override
        public void render(DrawContext context) {
            MinecraftClient mc = MinecraftClient.getInstance();

            String label = I18n.translate("marinmc.hud.damage_ind") + ": ";
            String status = I18n.translate("marinmc.hud.dmg_active");
            int statusColor = 0xFF22C55E;

            this.width = mc.textRenderer.getWidth(formatText(label)) + mc.textRenderer.getWidth(status) + 10;

            if (showBackground) {
                int bgColor = (bgOpacity << 24) | 0x000000;
                drawRoundedRect(context, x, y, getWidth(), getHeight(), bgColor, borderRadius);
                drawRoundedBorder(context, x, y, getWidth(), getHeight(), getThemeBorderColorHex(), borderRadius);
            }

            int labelW = mc.textRenderer.getWidth(label);

            if (textShadow) {
                context.drawTextWithShadow(mc.textRenderer, label, x + 5, y + 4, getThemeColorHex());
                context.drawTextWithShadow(mc.textRenderer, status, x + 5 + labelW, y + 4, statusColor);
            } else {
                context.drawText(mc.textRenderer, label, x + 5, y + 4, getThemeColorHex(), false);
                context.drawText(mc.textRenderer, status, x + 5 + labelW, y + 4, statusColor, false);
            }
        }
    }

    // --- Saturation Display: Saturation level + bar ---
    private static class SaturationDisplayElement extends HudElement {
        SaturationDisplayElement(String id, String name, int defaultX, int defaultY) {
            super(id, name, defaultX, defaultY, 100, 16);
            this.enabled = false;
        }

        @Override
        public void render(DrawContext context) {
            MinecraftClient mc = MinecraftClient.getInstance();
            if (mc.player == null) return;

            float saturation = mc.player.getHungerManager().getSaturationLevel();
            String satText = String.format("%s: %.1f", I18n.translate("marinmc.hud.sat"), saturation);

            this.width = mc.textRenderer.getWidth(formatText(satText)) + 10;

            if (showBackground) {
                int bgColor = (bgOpacity << 24) | 0x000000;
                drawRoundedRect(context, x, y, getWidth(), getHeight(), bgColor, borderRadius);
                drawRoundedBorder(context, x, y, getWidth(), getHeight(), getThemeBorderColorHex(), borderRadius);
            }

            drawElementText(context, satText, x + 5, y + 2, getThemeColorHex());

            // Saturation bar
            int barX = x + 5;
            int barY = y + 12;
            int barW = getWidth() - 10;
            int barH = 2;
            context.fill(barX, barY, barX + barW, barY + barH, 0x30FFFFFF);
            float ratio = Math.min(1.0f, saturation / 20.0f);
            int fillW = (int)(ratio * barW);
            if (fillW > 0) {
                int barColor = saturation > 10 ? 0xFF22C55E : saturation > 4 ? 0xFFF59E0B : 0xFFEF4444;
                context.fill(barX, barY, barX + fillW, barY + barH, barColor);
            }
        }
    }

    // --- Light Level: Block and Sky light ---
    private static class LightLevelElement extends HudElement {
        LightLevelElement(String id, String name, int defaultX, int defaultY) {
            super(id, name, defaultX, defaultY, 90, 16);
            this.enabled = false;
        }

        @Override
        public void render(DrawContext context) {
            MinecraftClient mc = MinecraftClient.getInstance();
            if (mc.player == null || mc.world == null) return;

            BlockPos pos = mc.player.getBlockPos();
            int blockLight = mc.world.getLightLevel(LightType.BLOCK, pos);
            int skyLight = mc.world.getLightLevel(LightType.SKY, pos);

            String blText = "BL: " + blockLight;
            String slText = "SL: " + skyLight;

            this.width = mc.textRenderer.getWidth(formatText(blText)) + mc.textRenderer.getWidth("  " + slText) + 10;

            if (showBackground) {
                int bgColor = (bgOpacity << 24) | 0x000000;
                drawRoundedRect(context, x, y, getWidth(), getHeight(), bgColor, borderRadius);
                drawRoundedBorder(context, x, y, getWidth(), getHeight(), getThemeBorderColorHex(), borderRadius);
            }

            int blColor = blockLight < 8 ? 0xFFEF4444 : 0xFF22C55E;

            if (textShadow) {
                context.drawTextWithShadow(mc.textRenderer, blText, x + 5, y + 4, blColor);
                int blW = mc.textRenderer.getWidth(blText);
                context.drawTextWithShadow(mc.textRenderer, "  " + slText, x + 5 + blW, y + 4, getThemeColorHex());
            } else {
                context.drawText(mc.textRenderer, blText, x + 5, y + 4, blColor, false);
                int blW = mc.textRenderer.getWidth(blText);
                context.drawText(mc.textRenderer, "  " + slText, x + 5 + blW, y + 4, getThemeColorHex(), false);
            }
        }
    }

    // --- Chat Macros: Placeholder ---
    private static class ChatMacrosElement extends HudElement {
        ChatMacrosElement(String id, String name, int defaultX, int defaultY) {
            super(id, name, defaultX, defaultY, 70, 16);
            this.enabled = false;
        }

        @Override
        public void render(DrawContext context) {
            MinecraftClient mc = MinecraftClient.getInstance();
            String text = I18n.translate("marinmc.hud.macros") + ": 0";

            this.width = mc.textRenderer.getWidth(formatText(text)) + 10;

            if (showBackground) {
                int bgColor = (bgOpacity << 24) | 0x000000;
                drawRoundedRect(context, x, y, getWidth(), getHeight(), bgColor, borderRadius);
                drawRoundedBorder(context, x, y, getWidth(), getHeight(), getThemeBorderColorHex(), borderRadius);
            }
            drawElementText(context, text, x + 5, y + 4, getThemeColorHex());
        }
    }

    // --- Memory Usage: Current used RAM / total RAM + bar ---
    private static class MemoryUsageElement extends HudElement {
        MemoryUsageElement(String id, String name, int defaultX, int defaultY) {
            super(id, name, defaultX, defaultY, 90, 16);
            this.enabled = false;
        }

        @Override
        public void render(DrawContext context) {
            MinecraftClient mc = MinecraftClient.getInstance();
            long maxMemory = Runtime.getRuntime().maxMemory();
            long totalMemory = Runtime.getRuntime().totalMemory();
            long freeMemory = Runtime.getRuntime().freeMemory();
            long usedMemory = totalMemory - freeMemory;

            long usedMB = usedMemory / (1024 * 1024);
            long maxMB = maxMemory / (1024 * 1024);

            String ramText = "RAM: " + usedMB + "MB / " + maxMB + "MB";
            this.width = mc.textRenderer.getWidth(formatText(ramText)) + 10;

            if (showBackground) {
                int bgColor = (bgOpacity << 24) | 0x000000;
                drawRoundedRect(context, x, y, getWidth(), getHeight(), bgColor, borderRadius);
                drawRoundedBorder(context, x, y, getWidth(), getHeight(), getThemeBorderColorHex(), borderRadius);
            }

            // Color-code: green < 70%, yellow 70-85%, red > 85%
            float pct = (float) usedMemory / maxMemory;
            int ramColor = pct < 0.70f ? 0xFF22C55E : pct < 0.85f ? 0xFFF59E0B : 0xFFEF4444;

            drawElementText(context, ramText, x + 5, y + 4, ramColor);
        }
    }
}
