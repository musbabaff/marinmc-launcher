package com.marinmc.client.gui;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.reflect.TypeToken;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.gui.screen.Screen;
import net.minecraft.client.gui.widget.ButtonWidget;
import net.minecraft.text.Text;
import net.minecraft.util.Identifier;
import net.minecraft.client.render.RenderLayer;
import net.minecraft.client.gl.RenderPipelines;
import com.marinmc.client.gui.hud.HudEditorScreen;
import com.marinmc.client.gui.hud.HudManager;
import com.marinmc.client.gui.hud.HudElement;
import org.lwjgl.glfw.GLFW;

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
    private static final Identifier BACKGROUND_TEXTURE = Identifier.of("marinmc-client", "textures/gui/background.png");
    private static final Identifier LOGO_TEXTURE = Identifier.of("marinmc-client", "textures/gui/logo.png");

    public static final Map<String, Boolean> configStates = new HashMap<>();
    
    static {
        // Load default values
        configStates.put("fps", true);
        configStates.put("cps", true);
        configStates.put("keystrokes", true);
        configStates.put("armor", true);
        configStates.put("compass", true);
        configStates.put("coords", true);
        configStates.put("ping", true);
        configStates.put("speed", true);
        configStates.put("replay", true);
        
        configStates.put("toggle_sneak", false);
        configStates.put("zoom", true);
        configStates.put("visuals_1_7", false);
        configStates.put("block_outline", true);
        
        loadConfigStatic();
    }

    public static void loadConfigStatic() {
        if (!CONFIG_FILE.exists()) {
            saveConfigStatic();
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

    public static void saveConfigStatic() {
        try (FileWriter writer = new FileWriter(CONFIG_FILE)) {
            GSON.toJson(configStates, writer);
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    private final List<ModCard> modCards = new ArrayList<>();
    
    // UI states
    private String activeTab = "MODS"; // MODS, SETTINGS, WAYPOINTS
    private String activeProfile = "Main"; // Main, Testing, Latest Version PvP
    private String activeCategory = "ALL"; // ALL, NEW, HUD, SERVER, MECHANIC
    
    private String searchQuery = "";
    private boolean searchFocused = false;
    private int scrollOffset = 0;
    
    public OverlayScreen() {
        super(Text.literal("MarinMC Mod Config"));
        
        // Populate mod list with categories and icons
        modCards.add(new ModCard("FPS Counter", "fps", "Displays current FPS", "HUD", "F", 0xFF2D7DD2));
        modCards.add(new ModCard("CPS Counter", "cps", "Displays clicks per second", "HUD", "C", 0xFF9C27B0));
        modCards.add(new ModCard("Keystrokes", "keystrokes", "Displays WASD and mouse buttons", "HUD", "K", 0xFFE91E63));
        modCards.add(new ModCard("Armor Status", "armor", "Displays equipped armor durability", "HUD", "A", 0xFFFF5722));
        modCards.add(new ModCard("Direction HUD", "compass", "Displays compass heading", "HUD", "D", 0xFF4CAF50));
        modCards.add(new ModCard("Coordinates", "coords", "Displays current coordinates", "HUD", "X", 0xFF00BCD4));
        modCards.add(new ModCard("Ping Counter", "ping", "Displays current player ping", "SERVER", "P", 0xFF009688));
        modCards.add(new ModCard("Speedometer", "speed", "Displays velocity in blocks/sec", "HUD", "S", 0xFFFFC107));
        modCards.add(new ModCard("Replay Status", "replay", "Displays recording indicator", "NEW", "R", 0xFFF44336));
        modCards.add(new ModCard("Toggle Sneak", "toggle_sneak", "Enables toggle sneak/sprint", "MECHANIC", "T", 0xFF795548));
        modCards.add(new ModCard("Zoom", "zoom", "Cinematic optifine-style zoom", "MECHANIC", "Z", 0xFF607D8B));
        modCards.add(new ModCard("1.7 Visuals", "visuals_1_7", "Enforces 1.7 hit animations", "MECHANIC", "V", 0xFF3F51B5));
        modCards.add(new ModCard("Block Outline", "block_outline", "Custom color block selection highlight", "MECHANIC", "B", 0xFF9E9E9E));
    }

    @Override
    protected void init() {
        this.clearChildren();
        // Sync configs with HudManager upon opening the screen
        for (HudElement el : HudManager.getInstance().getElements()) {
            Boolean state = configStates.get(el.getId());
            if (state != null) {
                el.setEnabled(state);
            }
        }
        HudManager.getInstance().saveConfig();
    }

    @Override
    public void renderBackground(DrawContext context, int mouseX, int mouseY, float delta) {
        // Handled manually in render
    }

    @Override
    public void render(DrawContext context, int mouseX, int mouseY, float delta) {
        // 1. Draw custom background
        context.drawTexture(
            RenderPipelines.GUI_TEXTURED,
            BACKGROUND_TEXTURE,
            0, 0,
            0f, 0f,
            this.width, this.height,
            this.width, this.height
        );
        context.fill(0, 0, this.width, this.height, 0x40000000); // Overlay tint

        // 2. Define Card Dimensions (Centered Window)
        int w = Math.min(this.width - 20, 480);
        int h = Math.min(this.height - 20, 290);
        int x = (this.width - w) / 2;
        int y = (this.height - h) / 2;

        // Draw outer glassmorphic window panel
        context.fill(x, y, x + w, y + h, 0xF00B0F19);
        context.drawBorder(x, y, w, h, 0x40BF5BFF); // violet glowing border

        // Draw Moon Logo on Header
        int logoSize = 14;
        context.drawTexture(
            RenderPipelines.GUI_TEXTURED,
            LOGO_TEXTURE,
            x + 10, y + 8,
            0f, 0f,
            logoSize, logoSize,
            logoSize, logoSize
        );
        context.drawTextWithShadow(this.textRenderer, "MARINMC", x + 28, y + 11, 0xFFFFFFFF);

        // 3. Render Top Header Tabs (MODS, SETTINGS, WAYPOINTS)
        String[] tabs = {"MODS", "SETTINGS", "WAYPOINTS"};
        int tabStartX = x + w / 2 - 70;
        for (int i = 0; i < tabs.length; i++) {
            String tab = tabs[i];
            int tx = tabStartX + i * 50;
            int ty = y + 8;
            int tw = 45;
            int th = 14;
            boolean active = activeTab.equals(tab);
            
            // Draw tab pill
            if (active) {
                context.fill(tx, ty, tx + tw, ty + th, 0x30BF5BFF);
                context.drawBorder(tx, ty, tw, th, 0xFFBF5BFF);
            } else {
                context.fill(tx, ty, tx + tw, ty + th, 0x30000000);
                context.drawBorder(tx, ty, tw, th, 0x15FFFFFF);
            }
            
            int color = active ? 0xFFFFFFFF : 0xFFA1A1AA;
            context.drawCenteredTextWithShadow(this.textRenderer, tab, tx + tw / 2, ty + 3, color);
        }

        // Close X Button on Top Right
        int closeX = x + w - 18;
        int closeY = y + 8;
        boolean closeHovered = mouseX >= closeX && mouseX <= closeX + 10 && mouseY >= closeY && mouseY <= closeY + 10;
        context.drawTextWithShadow(this.textRenderer, "✖", closeX, closeY, closeHovered ? 0xFFEF4444 : 0xFFA1A1AA);

        // 4. Render Sidebar (Left)
        int sbX = x + 6;
        int sbY = y + 30;
        int sbW = 105;
        int sbH = h - 36;
        context.fill(sbX, sbY, sbX + sbW, sbY + sbH, 0x600F172A); // slate-900 transparent fill
        context.drawBorder(sbX, sbY, sbW, sbH, 0x10FFFFFF);

        context.drawTextWithShadow(this.textRenderer, "PROFILLER", sbX + 8, sbY + 8, 0xFF64748B); // dark gray title

        // Profiles list
        String[] profiles = {"Main", "Testing", "PvP Settings"};
        for (int i = 0; i < profiles.length; i++) {
            String prof = profiles[i];
            int px = sbX + 6;
            int py = sbY + 22 + i * 18;
            int pw = sbW - 12;
            int ph = 14;
            boolean active = activeProfile.equals(prof);
            
            if (active) {
                context.fill(px, py, px + pw, py + ph, 0x303B82F6);
                context.drawBorder(px, py, pw, ph, 0xFF3B82F6);
            } else {
                context.fill(px, py, px + pw, py + ph, 0x15FFFFFF);
                context.drawBorder(px, py, pw, ph, 0x05FFFFFF);
            }
            int color = active ? 0xFFFFFFFF : 0xFF94A3B8;
            context.drawCenteredTextWithShadow(this.textRenderer, prof, px + pw / 2, py + 3, color);
        }

        // Sidebar Bottom Pill Button: EDIT HUD LAYOUT
        int hudX = sbX + 6;
        int hudY = sbY + sbH - 22;
        int hudW = sbW - 12;
        int hudH = 16;
        boolean hudHovered = mouseX >= hudX && mouseX <= hudX + hudW && mouseY >= hudY && mouseY <= hudY + hudH;
        context.fill(hudX, hudY, hudX + hudW, hudY + hudH, hudHovered ? 0xFF2563EB : 0xFF1D4ED8);
        context.drawBorder(hudX, hudY, hudW, hudH, 0xFF3B82F6);
        context.drawCenteredTextWithShadow(this.textRenderer, "EDIT HUD", hudX + hudW / 2, hudY + 4, 0xFFFFFFFF);

        // 5. Render Content Area (Right)
        int contentX = x + 116;
        int contentY = y + 30;
        int contentW = w - 122;
        int contentH = h - 36;

        // Render Filter Pills (ALL, NEW, HUD, SERVER, MECHANIC)
        String[] categories = {"ALL", "NEW", "HUD", "SERVER"};
        int catStartX = contentX + 6;
        for (int i = 0; i < categories.length; i++) {
            String cat = categories[i];
            int cx = catStartX + i * 42;
            int cy = contentY + 6;
            int cw = 38;
            int ch = 12;
            boolean active = activeCategory.equals(cat);
            
            if (active) {
                context.fill(cx, cy, cx + cw, cy + ch, 0x40BF5BFF);
                context.drawBorder(cx, cy, cw, ch, 0xFFBF5BFF);
            } else {
                context.fill(cx, cy, cx + cw, cy + ch, 0x15FFFFFF);
                context.drawBorder(cx, cy, cw, ch, 0x05FFFFFF);
            }
            int color = active ? 0xFFFFFFFF : 0xFF94A3B8;
            context.drawCenteredTextWithShadow(this.textRenderer, cat, cx + cw / 2, cy + 2, color);
        }

        // Search Bar (Right of categories)
        int searchX = contentX + contentW - 75;
        int searchY = contentY + 5;
        int searchW = 70;
        int searchH = 14;
        context.fill(searchX, searchY, searchX + searchW, searchY + searchH, searchFocused ? 0x900F172A : 0x500F172A);
        context.drawBorder(searchX, searchY, searchW, searchH, searchFocused ? 0xFFBF5BFF : 0x20FFFFFF);
        String displayText = searchQuery.isEmpty() ? (searchFocused ? "" : "Search...") : searchQuery;
        int displayColor = searchQuery.isEmpty() && !searchFocused ? 0xFF64748B : 0xFFFFFFFF;
        context.drawTextWithShadow(this.textRenderer, displayText, searchX + 5, searchY + 3, displayColor);

        // 6. Draw Mod Cards 3-Column Grid
        int gridX = contentX + 6;
        int gridY = contentY + 24;
        int gridW = contentW - 12;
        int gridH = contentH - 30;

        // Scissor boundary to prevent drawing outside mod list area
        // Enable scissoring
        context.enableScissor(gridX, gridY, gridX + gridW, gridY + gridH);

        // Filter mod list based on active category & search query
        List<ModCard> filtered = new ArrayList<>();
        for (ModCard mod : modCards) {
            boolean matchesCat = activeCategory.equals("ALL") || mod.category.equalsIgnoreCase(activeCategory);
            boolean matchesSearch = searchQuery.isEmpty() || mod.name.toLowerCase().contains(searchQuery.toLowerCase());
            if (matchesCat && matchesSearch) {
                filtered.add(mod);
            }
        }

        int colWidth = (gridW - 12) / 3;
        int cardHeight = 44;
        int spacing = 6;

        for (int i = 0; i < filtered.size(); i++) {
            ModCard mod = filtered.get(i);
            int col = i % 3;
            int row = i / 3;
            int cx = gridX + col * (colWidth + spacing);
            int cy = gridY + row * (cardHeight + spacing) - scrollOffset;

            // Render Card
            boolean isEnabled = configStates.getOrDefault(mod.id, false);
            
            // Draw card background
            context.fill(cx, cy, cx + colWidth, cy + cardHeight, 0x651E293B); // Slate-800 glass fill
            
            // Border glows if hovered or enabled
            boolean cardHovered = mouseX >= cx && mouseX <= cx + colWidth && mouseY >= cy && mouseY <= cy + cardHeight;
            int borderColor = isEnabled ? 0x4022C55E : (cardHovered ? 0x40FFFFFF : 0x08FFFFFF);
            context.drawBorder(cx, cy, colWidth, cardHeight, borderColor);

            // Icon circle
            int iconSize = 12;
            int iconX = cx + 6;
            int iconY = cy + 6;
            context.fill(iconX, iconY, iconX + iconSize, iconY + iconSize, mod.iconBgColor | 0xFF000000);
            context.drawCenteredTextWithShadow(this.textRenderer, mod.icon, iconX + iconSize / 2, iconY + 2, 0xFFFFFFFF);

            // Mod Title
            context.drawTextWithShadow(this.textRenderer, mod.name, cx + 22, cy + 8, 0xFFFFFFFF);
            
            // Options Gear button
            int gearX = cx + colWidth - 14;
            int gearY = cy + 7;
            boolean gearHovered = mouseX >= gearX && mouseX <= gearX + 8 && mouseY >= gearY && mouseY <= gearY + 8;
            context.drawTextWithShadow(this.textRenderer, "⚙", gearX, gearY, gearHovered ? 0xFFBF5BFF : 0xFF64748B);

            // Status Pill Button at the bottom
            int btnX = cx + 6;
            int btnY = cy + 24;
            int btnW = colWidth - 12;
            int btnH = 14;
            boolean btnHovered = mouseX >= btnX && mouseX <= btnX + btnW && mouseY >= btnY && mouseY <= btnY + btnH;
            
            int statusColor = isEnabled ? (btnHovered ? 0xFF16A34A : 0xFF22C55E) : (btnHovered ? 0xFFDC2626 : 0xFFEF4444);
            int statusBorder = isEnabled ? 0xFF4ADE80 : 0xFFFCA5A5;
            context.fill(btnX, btnY, btnX + btnW, btnY + btnH, statusColor);
            context.drawBorder(btnX, btnY, btnW, btnH, statusBorder);
            context.drawCenteredTextWithShadow(this.textRenderer, isEnabled ? "ENABLED" : "DISABLED", btnX + btnW / 2, btnY + 3, 0xFFFFFFFF);
        }

        // Disable scissoring
        context.disableScissor();

        super.render(context, mouseX, mouseY, delta);
    }

    @Override
    public boolean mouseScrolled(double mouseX, double mouseY, double horizontalAmount, double verticalAmount) {
        // Adjust scroll offset
        scrollOffset = Math.max(0, scrollOffset - (int)(verticalAmount * 16));
        return true;
    }

    @Override
    public boolean mouseClicked(double mouseX, double mouseY, int button) {
        int w = Math.min(this.width - 20, 480);
        int h = Math.min(this.height - 20, 290);
        int x = (this.width - w) / 2;
        int y = (this.height - h) / 2;

        // Top Header Close Button Click
        int closeX = x + w - 18;
        int closeY = y + 8;
        if (mouseX >= closeX && mouseX <= closeX + 10 && mouseY >= closeY && mouseY <= closeY + 10) {
            this.close();
            return true;
        }

        // Top Tabs Click
        String[] tabs = {"MODS", "SETTINGS", "WAYPOINTS"};
        int tabStartX = x + w / 2 - 70;
        for (int i = 0; i < tabs.length; i++) {
            int tx = tabStartX + i * 50;
            int ty = y + 8;
            if (mouseX >= tx && mouseX <= tx + 45 && mouseY >= ty && mouseY <= ty + 14) {
                activeTab = tabs[i];
                return true;
            }
        }

        // Profile Sidebar click
        int sbX = x + 6;
        int sbY = y + 30;
        String[] profiles = {"Main", "Testing", "PvP Settings"};
        for (int i = 0; i < profiles.length; i++) {
            int px = sbX + 6;
            int py = sbY + 22 + i * 18;
            if (mouseX >= px && mouseX <= px + sbW(w) && mouseY >= py && mouseY <= py + 14) {
                activeProfile = profiles[i];
                return true;
            }
        }

        // EDIT HUD click
        int hudX = sbX + 6;
        int hudY = sbY + h - 36 - 22;
        if (mouseX >= hudX && mouseX <= hudX + sbW(w) && mouseY >= hudY && mouseY <= hudY + 16) {
            if (this.client != null) {
                this.client.setScreen(new HudEditorScreen());
            }
            return true;
        }

        // Category Pills click
        int contentX = x + 116;
        int contentY = y + 30;
        String[] categories = {"ALL", "NEW", "HUD", "SERVER"};
        int catStartX = contentX + 6;
        for (int i = 0; i < categories.length; i++) {
            int cx = catStartX + i * 42;
            int cy = contentY + 6;
            if (mouseX >= cx && mouseX <= cx + 38 && mouseY >= cy && mouseY <= cy + 12) {
                activeCategory = categories[i];
                scrollOffset = 0;
                return true;
            }
        }

        // Search Bar click
        int contentW = w - 122;
        int searchX = contentX + contentW - 75;
        int searchY = contentY + 5;
        if (mouseX >= searchX && mouseX <= searchX + 70 && mouseY >= searchY && mouseY <= searchY + 14) {
            searchFocused = true;
        } else {
            searchFocused = false;
        }

        // Mod Cards grid click
        int gridX = contentX + 6;
        int gridY = contentY + 24;
        int gridW = contentW - 12;

        List<ModCard> filtered = new ArrayList<>();
        for (ModCard mod : modCards) {
            boolean matchesCat = activeCategory.equals("ALL") || mod.category.equalsIgnoreCase(activeCategory);
            boolean matchesSearch = searchQuery.isEmpty() || mod.name.toLowerCase().contains(searchQuery.toLowerCase());
            if (matchesCat && matchesSearch) {
                filtered.add(mod);
            }
        }

        int colWidth = (gridW - 12) / 3;
        int cardHeight = 44;
        int spacing = 6;

        for (int i = 0; i < filtered.size(); i++) {
            ModCard mod = filtered.get(i);
            int col = i % 3;
            int row = i / 3;
            int cx = gridX + col * (colWidth + spacing);
            int cy = gridY + row * (cardHeight + spacing) - scrollOffset;

            // Check if card is within visible bounds of scroll list before clicking
            if (cy >= gridY && cy + cardHeight <= gridY + h - 66) {
                // Toggled Mod Status Pill click
                int btnX = cx + 6;
                int btnY = cy + 24;
                if (mouseX >= btnX && mouseX <= btnX + colWidth - 12 && mouseY >= btnY && mouseY <= btnY + 14) {
                    boolean current = configStates.getOrDefault(mod.id, false);
                    configStates.put(mod.id, !current);
                    saveConfigStatic();
                    
                    // Sync with HudManager
                    for (HudElement el : HudManager.getInstance().getElements()) {
                        if (el.getId().equals(mod.id)) {
                            el.setEnabled(!current);
                            HudManager.getInstance().saveConfig();
                            break;
                        }
                    }
                    return true;
                }
            }
        }

        return super.mouseClicked(mouseX, mouseY, button);
    }

    @Override
    public boolean charTyped(char chr, int modifiers) {
        if (searchFocused) {
            searchQuery += chr;
            scrollOffset = 0;
            return true;
        }
        return super.charTyped(chr, modifiers);
    }

    @Override
    public boolean keyPressed(int keyCode, int scanCode, int modifiers) {
        if (searchFocused) {
            if (keyCode == GLFW.GLFW_KEY_BACKSPACE) {
                if (!searchQuery.isEmpty()) {
                    searchQuery = searchQuery.substring(0, searchQuery.length() - 1);
                    scrollOffset = 0;
                }
                return true;
            } else if (keyCode == GLFW.GLFW_KEY_ENTER || keyCode == GLFW.GLFW_KEY_ESCAPE) {
                searchFocused = false;
                return true;
            }
        }
        return super.keyPressed(keyCode, scanCode, modifiers);
    }

    private int sbW(int totalW) {
        return 105 - 12;
    }

    @Override
    public boolean shouldPause() {
        return false;
    }

    private static class ModCard {
        final String name;
        final String id;
        final String description;
        final String category;
        final String icon;
        final int iconBgColor;

        ModCard(String name, String id, String description, String category, String icon, int iconBgColor) {
            this.name = name;
            this.id = id;
            this.description = description;
            this.category = category;
            this.icon = icon;
            this.iconBgColor = iconBgColor;
        }
    }

    // Custom Lunar-style premium glassmorphism buttons (retained for other classes' compatibility)
    public static class PremiumButtonWidget extends ButtonWidget {
        public PremiumButtonWidget(int x, int y, int width, int height, Text message, PressAction onPress) {
            super(x, y, width, height, message, onPress, DEFAULT_NARRATION_SUPPLIER);
        }

        @Override
        protected void renderWidget(DrawContext context, int mouseX, int mouseY, float delta) {
            if (!this.visible) return;

            boolean hovered = this.isSelected() || this.isHovered();
            String text = this.getMessage().getString();

            int bgColor;
            int borderColor;
            int accentColor = 0;

            if (text.contains("ENABLED")) {
                bgColor = hovered ? 0x6022C55E : 0x3022C55E;
                borderColor = hovered ? 0xC022C55E : 0x6022C55E;
                if (hovered) accentColor = 0xFF22C55E;
            } else if (text.contains("DISABLED")) {
                bgColor = hovered ? 0x60EF4444 : 0x30EF4444;
                borderColor = hovered ? 0xC0EF4444 : 0x60EF4444;
                if (hovered) accentColor = 0xFFEF4444;
            } else {
                bgColor = hovered ? 0x452D7DD2 : 0x65111111;
                borderColor = hovered ? 0x902D7DD2 : 0x25FFFFFF;
                if (hovered) accentColor = 0xFF2D7DD2;
            }

            context.fill(this.getX(), this.getY(), this.getX() + this.width, this.getY() + this.height, bgColor);
            context.drawBorder(this.getX(), this.getY(), this.width, this.height, borderColor);

            if (accentColor != 0) {
                context.fill(this.getX(), this.getY() + 1, this.getX() + 3, this.getY() + this.height - 1, accentColor);
            }

            int textColor = hovered ? 0xFFFFFFFF : 0xFFD1D5DB;
            context.drawCenteredTextWithShadow(
                net.minecraft.client.MinecraftClient.getInstance().textRenderer,
                this.getMessage(),
                this.getX() + this.width / 2,
                this.getY() + (this.height - 8) / 2,
                textColor
            );
        }
    }
}
