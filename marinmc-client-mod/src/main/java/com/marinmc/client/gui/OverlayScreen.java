package com.marinmc.client.gui;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.reflect.TypeToken;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.gui.screen.Screen;
import net.minecraft.client.gui.widget.ButtonWidget;
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

public class OverlayScreen extends Screen {
    private static final File CONFIG_FILE = new File("marinmc-client-config.json");
    private static final Gson GSON = new GsonBuilder().setPrettyPrinting().create();
    
    private final List<ModCard> modCards = new ArrayList<>();
    private final Map<String, Boolean> configStates = new HashMap<>();

    public OverlayScreen() {
        super(Text.literal("MarinMC Client Overlay"));
        loadConfig();
        
        // Define mod cards
        modCards.add(new ModCard("FPS Counter", "fps_counter", "Displays current FPS"));
        modCards.add(new ModCard("CPS Counter", "cps_counter", "Displays clicks per second"));
        modCards.add(new ModCard("Toggle Sneak", "toggle_sneak", "Enables toggle sneak/sprint"));
        modCards.add(new ModCard("Zoom", "zoom", "Cinematic optifine-style zoom"));
        modCards.add(new ModCard("1.7 Visuals", "visuals_1_7", "Enforces 1.7 hit animations"));
    }

    private void loadConfig() {
        if (!CONFIG_FILE.exists()) {
            configStates.put("fps_counter", true);
            configStates.put("cps_counter", true);
            configStates.put("toggle_sneak", false);
            configStates.put("zoom", true);
            configStates.put("visuals_1_7", false);
            saveConfig();
            return;
        }

        try (FileReader reader = new FileReader(CONFIG_FILE)) {
            Type type = new TypeToken<Map<String, Boolean>>(){}.getType();
            Map<String, Boolean> loaded = GSON.fromJson(reader, type);
            if (loaded != null) {
                configStates.putAll(loaded);
            }
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    private void saveConfig() {
        try (FileWriter writer = new FileWriter(CONFIG_FILE)) {
            GSON.toJson(configStates, writer);
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    @Override
    protected void init() {
        this.clearChildren();
        
        int gridX = this.width / 2 - 190;
        int gridY = this.height / 2 - 100;
        int cardW = 120;
        int cardH = 75;
        int spacingX = 15;
        int spacingY = 15;

        for (int i = 0; i < modCards.size(); i++) {
            ModCard mod = modCards.get(i);
            int col = i % 3;
            int row = i / 3;
            int x = gridX + col * (cardW + spacingX);
            int y = gridY + row * (cardH + spacingY);

            // Toggle Button
            final String modId = mod.id;
            boolean isEnabled = configStates.getOrDefault(modId, false);
            
            ButtonWidget toggleButton = ButtonWidget.builder(
                Text.literal(isEnabled ? "ENABLED" : "DISABLED"),
                button -> {
                    boolean current = configStates.getOrDefault(modId, false);
                    configStates.put(modId, !current);
                    saveConfig();
                    button.setMessage(Text.literal(!current ? "ENABLED" : "DISABLED"));
                }
            ).dimensions(x + 10, y + cardH - 28, cardW - 20, 20).build();
            
            this.addDrawableChild(toggleButton);
        }

        // Add a back/close button
        this.addDrawableChild(ButtonWidget.builder(Text.literal("Close Overlay"), button -> this.close())
            .dimensions(this.width / 2 - 60, this.height - 40, 120, 20).build());
    }

    @Override
    public void render(DrawContext context, int mouseX, int mouseY, float delta) {
        // Render semi-transparent background
        this.renderBackground(context, mouseX, mouseY, delta);
        
        // Title
        context.drawCenteredTextWithShadow(this.textRenderer, "MARINMC CLIENT OVERLAY", this.width / 2, 20, 0x2D7DD2);

        int gridX = this.width / 2 - 190;
        int gridY = this.height / 2 - 100;
        int cardW = 120;
        int cardH = 75;
        int spacingX = 15;
        int spacingY = 15;

        // Render card backgrounds and info
        for (int i = 0; i < modCards.size(); i++) {
            ModCard mod = modCards.get(i);
            int col = i % 3;
            int row = i / 3;
            int x = gridX + col * (cardW + spacingX);
            int y = gridY + row * (cardH + spacingY);

            boolean isEnabled = configStates.getOrDefault(mod.id, false);

            // Card outline/background
            context.fill(x, y, x + cardW, y + cardH, 0xAA0F0F0F);
            context.drawBorder(context, x, y, cardW, cardH, isEnabled ? 0xFF259457 : 0xFFEF4444);

            // Draw Mod Title
            context.drawTextWithShadow(this.textRenderer, mod.name, x + 10, y + 8, 0xFFFFFFFF);
            
            // Draw Description
            context.drawTextWithShadow(this.textRenderer, mod.description, x + 10, y + 22, 0xFFA1A1AA);
            
            // Render Options Gear label placeholder (e.g. [O] as gear icon)
            context.drawTextWithShadow(this.textRenderer, "[OPTIONS]", x + cardW - 55, y + 8, 0xFF2D7DD2);
        }

        super.render(context, mouseX, mouseY, delta);
    }

    @Override
    public boolean shouldPause() {
        return false;
    }

    private static class ModCard {
        final String name;
        final String id;
        final String description;

        ModCard(String name, String id, String description) {
            this.name = name;
            this.id = id;
            this.description = description;
        }
    }
}
