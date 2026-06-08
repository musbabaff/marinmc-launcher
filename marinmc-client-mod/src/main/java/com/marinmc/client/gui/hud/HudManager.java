package com.marinmc.client.gui.hud;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.reflect.TypeToken;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.item.ItemStack;
import net.minecraft.text.Text;

import java.io.File;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;
import java.lang.reflect.Type;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class HudManager {
    private static final HudManager INSTANCE = new HudManager();
    private static final File CONFIG_FILE = new File("marinmc-hud-config.json");
    private static final Gson GSON = new GsonBuilder().setPrettyPrinting().create();

    private final List<HudElement> elements = new ArrayList<>();
    
    // CPS click buffers
    private static final List<Long> leftClicks = new ArrayList<>();
    private static final List<Long> rightClicks = new ArrayList<>();

    public static HudManager getInstance() {
        return INSTANCE;
    }

    private HudManager() {
        // Register HUD elements with defaults
        elements.add(new FpsElement("fps", "FPS Counter", 10, 10));
        elements.add(new CpsElement("cps", "CPS Counter", 10, 30));
        elements.add(new KeystrokesElement("keystrokes", "Keystrokes", 10, 60));
        elements.add(new ArmorStatusElement("armor", "Armor Status", 10, 150));
        elements.add(new CompassElement("compass", "Direction HUD", 100, 10));
        
        loadConfig();
    }

    public List<HudElement> getElements() {
        return elements;
    }

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

    public void renderAll(DrawContext context) {
        for (HudElement element : elements) {
            if (element.isEnabled()) {
                element.render(context);
            }
        }
    }

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
            configMap.put(el.getId(), new ElementConfig(el.getX(), el.getY(), el.isEnabled(), el.getScale()));
        }
        try (FileWriter writer = new FileWriter(CONFIG_FILE)) {
            GSON.toJson(configMap, writer);
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    private static class ElementConfig {
        int x;
        int y;
        boolean enabled;
        float scale;

        ElementConfig(int x, int y, boolean enabled, float scale) {
            this.x = x;
            this.y = y;
            this.enabled = enabled;
            this.scale = scale;
        }
    }

    // Concrete element definitions
    private static class FpsElement extends HudElement {
        FpsElement(String id, String name, int defaultX, int defaultY) {
            super(id, name, defaultX, defaultY, 50, 16);
        }

        @Override
        public void render(DrawContext context) {
            MinecraftClient mc = MinecraftClient.getInstance();
            String fpsText = "FPS: " + mc.getCurrentFps();
            context.fill(x, y, x + getWidth(), y + getHeight(), 0xAA000000);
            context.drawBorder(context, x, y, getWidth(), getHeight(), 0x33FFFFFF);
            context.drawTextWithShadow(mc.textRenderer, fpsText, x + 5, y + 4, 0xFFFFFFFF);
        }
    }

    private static class CpsElement extends HudElement {
        CpsElement(String id, String name, int defaultX, int defaultY) {
            super(id, name, defaultX, defaultY, 70, 16);
        }

        @Override
        public void render(DrawContext context) {
            MinecraftClient mc = MinecraftClient.getInstance();
            String cpsText = "CPS: " + getCps(0) + " | " + getCps(1);
            context.fill(x, y, x + getWidth(), y + getHeight(), 0xAA000000);
            context.drawBorder(context, x, y, getWidth(), getHeight(), 0x33FFFFFF);
            context.drawTextWithShadow(mc.textRenderer, cpsText, x + 5, y + 4, 0xFFFFFFFF);
        }
    }

    private static class KeystrokesElement extends HudElement {
        KeystrokesElement(String id, String name, int defaultX, int defaultY) {
            super(id, name, defaultX, defaultY, 56, 56);
        }

        @Override
        public void render(DrawContext context) {
            MinecraftClient mc = MinecraftClient.getInstance();
            boolean w = mc.options.forwardKey.isPressed();
            boolean a = mc.options.leftKey.isPressed();
            boolean s = mc.options.backKey.isPressed();
            boolean d = mc.options.rightKey.isPressed();

            // Render key blocks
            drawKey(context, "W", x + 19, y, 18, 18, w);
            drawKey(context, "A", x, y + 19, 18, 18, a);
            drawKey(context, "S", x + 19, y + 19, 18, 18, s);
            drawKey(context, "D", x + 38, y + 19, 18, 18, d);
            
            // Mouse button states
            boolean l = mc.options.attackKey.isPressed();
            boolean r = mc.options.useKey.isPressed();
            drawKey(context, "L", x, y + 38, 27, 18, l);
            drawKey(context, "R", x + 28, y + 38, 28, 18, r);
        }

        private void drawKey(DrawContext context, String key, int kx, int ky, int kw, int kh, boolean pressed) {
            MinecraftClient mc = MinecraftClient.getInstance();
            int color = pressed ? 0xDDFFFFFF : 0xAA000000;
            int textColor = pressed ? 0xFF000000 : 0xFFFFFFFF;
            context.fill(kx, ky, kx + kw, ky + kh, color);
            context.drawBorder(context, kx, ky, kw, kh, 0x33FFFFFF);
            context.drawCenteredTextWithShadow(
                mc.textRenderer, 
                key, 
                kx + kw / 2, 
                ky + kh / 2 - 4, 
                textColor
            );
        }
    }

    private static class ArmorStatusElement extends HudElement {
        ArmorStatusElement(String id, String name, int defaultX, int defaultY) {
            super(id, name, defaultX, defaultY, 80, 64);
        }

        @Override
        public void render(DrawContext context) {
            MinecraftClient mc = MinecraftClient.getInstance();
            if (mc.player == null) return;

            context.fill(x, y, x + getWidth(), y + getHeight(), 0xAA000000);
            context.drawBorder(context, x, y, getWidth(), getHeight(), 0x33FFFFFF);

            int currentY = y + 4;
            for (int i = 0; i < 4; i++) {
                ItemStack stack = mc.player.getInventory().getArmorStack(3 - i); // Helmet to Boots
                if (!stack.isEmpty()) {
                    // Draw item icon
                    context.drawItem(stack, x + 4, currentY);
                    
                    // Durability text
                    int maxDamage = stack.getMaxDamage();
                    if (maxDamage > 0) {
                        int remaining = maxDamage - stack.getDamage();
                        int pct = (remaining * 100) / maxDamage;
                        int textColor = pct > 50 ? 0xFF259457 : pct > 20 ? 0xFFF59E0B : 0xFFEF4444;
                        context.drawTextWithShadow(mc.textRenderer, remaining + "", x + 24, currentY + 4, textColor);
                    } else {
                        context.drawTextWithShadow(mc.textRenderer, "1", x + 24, currentY + 4, 0xFFFFFFFF);
                    }
                    currentY += 14;
                }
            }
        }
    }

    private static class CompassElement extends HudElement {
        CompassElement(String id, String name, int defaultX, int defaultY) {
            super(id, name, defaultX, defaultY, 140, 20);
        }

        @Override
        public void render(DrawContext context) {
            MinecraftClient mc = MinecraftClient.getInstance();
            if (mc.player == null) return;

            float yaw = mc.player.getYaw() % 360;
            if (yaw < 0) yaw += 360;

            String dir = "N";
            if (yaw >= 337.5 || yaw < 22.5) dir = "S"; // In Minecraft, yaw = 0 is South
            else if (yaw >= 22.5 && yaw < 67.5) dir = "SW";
            else if (yaw >= 67.5 && yaw < 112.5) dir = "W";
            else if (yaw >= 112.5 && yaw < 157.5) dir = "NW";
            else if (yaw >= 157.5 && yaw < 202.5) dir = "N";
            else if (yaw >= 202.5 && yaw < 247.5) dir = "NE";
            else if (yaw >= 247.5 && yaw < 292.5) dir = "E";
            else if (yaw >= 292.5 && yaw < 337.5) dir = "SE";

            String heading = String.format("%d° %s", (int)yaw, dir);
            context.fill(x, y, x + getWidth(), y + getHeight(), 0xAA000000);
            context.drawBorder(context, x, y, getWidth(), getHeight(), 0x33FFFFFF);
            context.drawCenteredTextWithShadow(mc.textRenderer, heading, x + getWidth() / 2, y + 6, 0xFFFFFFFF);
        }
    }
}
