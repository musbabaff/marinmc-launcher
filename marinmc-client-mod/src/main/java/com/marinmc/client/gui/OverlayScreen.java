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
    private static final File STRINGS_CONFIG_FILE = new File("marinmc-client-strings.json");
    private static final File WAYPOINTS_FILE = new File("marinmc-waypoints.json");
    private static final Gson GSON = new GsonBuilder().setPrettyPrinting().create();
    private static final Identifier BACKGROUND_TEXTURE = Identifier.of("marinmc-client", "textures/gui/background.png");
    private static final Identifier LOGO_TEXTURE = Identifier.of("marinmc-client", "textures/gui/logo.png");

    public static final Map<String, Boolean> configStates = new HashMap<>();
    public static final Map<String, String> configStrings = new HashMap<>();
    public static final List<Waypoint> waypoints = new ArrayList<>();
    
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
        configStates.put("potion_status", true);
        configStates.put("crosshair", false);
        
        configStates.put("toggle_sneak", false);
        configStates.put("zoom", true);
        configStates.put("visuals_1_7", false);
        configStates.put("block_outline", true);
        configStates.put("item_physics", true);
        configStates.put("freelook", false);
        configStates.put("freelook_invert_y", false);
        configStates.put("fullbright", false);
        configStates.put("tnt_radius", false);

        // General settings defaults
        configStates.put("show_hud", true);
        configStates.put("show_scoreboard", true);
        configStates.put("show_boss_bar", true);
        configStates.put("show_tab_list", true);
        configStates.put("chat_animation", true);
        configStates.put("smooth_scroll", true);
        configStates.put("custom_hit_color", false);
        configStates.put("fire_height_reduce", false);
        configStates.put("minimal_view_bobbing", false);
        configStates.put("raw_mouse_input", true);
        
        // Performance settings defaults
        configStates.put("lazy_chunk_loading", false);
        configStates.put("fast_text_render", false);
        configStates.put("culling", true);
        configStates.put("reduced_particles", false);
        configStates.put("fps_boost", false);
        configStates.put("disable_block_animations", false);

        configStrings.put("active_theme", "classic");
        configStrings.put("active_profile", "Default");
        configStrings.put("freelook_perspective", "third_back");
        configStrings.put("outline_color", "purple");
        configStrings.put("outline_thickness", "1");
        
        loadConfigStatic();
        loadStringsConfigStatic();
        loadWaypointsStatic();
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

    public static void loadStringsConfigStatic() {
        if (!STRINGS_CONFIG_FILE.exists()) {
            saveStringsConfigStatic();
            return;
        }
        try (FileReader reader = new FileReader(STRINGS_CONFIG_FILE)) {
            Type type = new TypeToken<Map<String, String>>(){}.getType();
            Map<String, String> loaded = GSON.fromJson(reader, type);
            if (loaded != null) {
                configStrings.putAll(loaded);
            }
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    public static void saveStringsConfigStatic() {
        try (FileWriter writer = new FileWriter(STRINGS_CONFIG_FILE)) {
            GSON.toJson(configStrings, writer);
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    public static void loadWaypointsStatic() {
        if (!WAYPOINTS_FILE.exists()) return;
        try (FileReader reader = new FileReader(WAYPOINTS_FILE)) {
            Type type = new TypeToken<List<Waypoint>>(){}.getType();
            List<Waypoint> loaded = GSON.fromJson(reader, type);
            if (loaded != null) {
                waypoints.clear();
                waypoints.addAll(loaded);
            }
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    public static void saveWaypointsStatic() {
        try (FileWriter writer = new FileWriter(WAYPOINTS_FILE)) {
            GSON.toJson(waypoints, writer);
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    public static Identifier getThemeTexture() {
        String theme = configStrings.getOrDefault("active_theme", "classic").toLowerCase();
        if (theme.equals("lunar")) {
            return Identifier.of("marinmc-client", "textures/gui/lunar_bg.png");
        } else if (theme.equals("spring")) {
            return Identifier.of("marinmc-client", "textures/gui/spring_bg.png");
        } else if (theme.equals("vanilla")) {
            return Identifier.of("marinmc-client", "textures/gui/vanilla_bg.png");
        }
        return Identifier.of("marinmc-client", "textures/gui/classic_bg.png");
    }


    private final List<ModCard> modCards = new ArrayList<>();
    
    // UI states
    private String activeTab = "MODS"; // MODS, SETTINGS, WAYPOINTS
    private String activeProfile = "Main"; // Main, Testing, Latest Version PvP
    private String activeCategory = "ALL"; // ALL, NEW, HUD, SERVER, MECHANIC
    private String settingsSubTab = "GENERAL"; // GENERAL, PERFORMANCE, CONTROLS
    
    private String searchQuery = "";
    private boolean searchFocused = false;
    private int scrollOffset = 0;
    
    // Mod Detail Popup state
    private boolean showModDetail = false;
    private ModCard detailMod = null;
    private int detailScroll = 0;
    
    // Waypoint Add Modal state
    private boolean showWaypointAdd = false;
    private String wpName = "";
    private String wpColor = "green";
    private boolean wpNameFocused = false;
    
    public OverlayScreen() {
        super(Text.literal("MarinMC Mod Config"));
        
        // Populate mod list with categories and icons
        modCards.add(new ModCard("FPS Counter", "fps", "Displays current FPS on screen with customizable format.", "HUD", "F", 0xFF2D7DD2));
        modCards.add(new ModCard("CPS Counter", "cps", "Displays left and right clicks per second.", "HUD", "C", 0xFF9C27B0));
        modCards.add(new ModCard("Keystrokes", "keystrokes", "Displays WASD keys and mouse buttons with press states.", "HUD", "K", 0xFFE91E63));
        modCards.add(new ModCard("Armor Status", "armor", "Displays equipped armor durability.", "HUD", "A", 0xFFFF5722));
        modCards.add(new ModCard("Direction HUD", "compass", "Displays compass heading and degree.", "HUD", "D", 0xFF4CAF50));
        modCards.add(new ModCard("Coordinates", "coords", "Displays current XYZ coordinates.", "HUD", "X", 0xFF00BCD4));
        modCards.add(new ModCard("Ping Counter", "ping", "Displays current player ping to server.", "SERVER", "P", 0xFF009688));
        modCards.add(new ModCard("Speedometer", "speed", "Displays velocity in blocks per second.", "HUD", "S", 0xFFFFC107));
        modCards.add(new ModCard("Replay Status", "replay", "Displays recording indicator dot.", "NEW", "R", 0xFFF44336));
        modCards.add(new ModCard("Potion Status", "potion_status", "Displays active potion effects and timers.", "HUD", "P", 0xFF9C27B0));
        modCards.add(new ModCard("Crosshair", "crosshair", "Customizable crosshair with multiple styles.", "HUD", "C", 0xFFE91E63));
        modCards.add(new ModCard("Toggle Sneak", "toggle_sneak", "Toggle sneak and sprint with one key press.", "MECHANIC", "T", 0xFF795548));
        modCards.add(new ModCard("Zoom", "zoom", "Cinematic optifine-style zoom with scroll.", "MECHANIC", "Z", 0xFF607D8B));
        modCards.add(new ModCard("1.7 Visuals", "visuals_1_7", "Enforces classic 1.7 hit animations.", "MECHANIC", "V", 0xFF3F51B5));
        modCards.add(new ModCard("Block Outline", "block_outline", "Custom neon color for block selection outline.", "MECHANIC", "B", 0xFF9E9E9E));
        modCards.add(new ModCard("Item Physics", "item_physics", "Flat lying 3D item drops on the ground.", "MECHANIC", "I", 0xFF4CAF50));
        modCards.add(new ModCard("Freelook", "freelook", "Hold F to look around 360° without turning character.", "MECHANIC", "F", 0xFF2196F3));
        modCards.add(new ModCard("Fullbright", "fullbright", "Overrides gamma for maximum brightness in dark.", "MECHANIC", "G", 0xFFFFEB3B));
        modCards.add(new ModCard("TNT Radius", "tnt_radius", "Visualizes TNT explosion range with wireframe.", "MECHANIC", "T", 0xFFFF5722));
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
        int w = Math.min(this.width - 20, 520);
        int h = Math.min(this.height - 20, 320);
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
        int tabStartX = x + w / 2 - 80;
        for (int i = 0; i < tabs.length; i++) {
            String tab = tabs[i];
            int tx = tabStartX + i * 55;
            int ty = y + 8;
            int tw = 50;
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

        // 4. Render Sidebar (Left) - always visible
        int sbX = x + 6;
        int sbY = y + 30;
        int sbW = 105;
        int sbH = h - 36;
        context.fill(sbX, sbY, sbX + sbW, sbY + sbH, 0x600F172A);
        context.drawBorder(sbX, sbY, sbW, sbH, 0x10FFFFFF);

        context.drawTextWithShadow(this.textRenderer, "PROFILLER", sbX + 8, sbY + 8, 0xFF64748B);

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

        // 5. Render Content Area (Right) based on active tab
        int contentX = x + 116;
        int contentY = y + 30;
        int contentW = w - 122;
        int contentH = h - 36;

        if ("MODS".equals(activeTab)) {
            renderModsTab(context, mouseX, mouseY, contentX, contentY, contentW, contentH, h);
        } else if ("SETTINGS".equals(activeTab)) {
            renderSettingsTab(context, mouseX, mouseY, contentX, contentY, contentW, contentH);
        } else if ("WAYPOINTS".equals(activeTab)) {
            renderWaypointsTab(context, mouseX, mouseY, contentX, contentY, contentW, contentH);
        }

        // Render mod detail popup on top of everything if active
        if (showModDetail && detailMod != null) {
            renderModDetailPopup(context, mouseX, mouseY);
        }

        // Render waypoint add modal
        if (showWaypointAdd) {
            renderWaypointAddModal(context, mouseX, mouseY);
        }

        super.render(context, mouseX, mouseY, delta);
    }

    // ============================================================================
    // MODS TAB
    // ============================================================================
    private void renderModsTab(DrawContext context, int mouseX, int mouseY,
                                int contentX, int contentY, int contentW, int contentH, int windowH) {
        // Render Filter Pills (ALL, NEW, HUD, SERVER, MECHANIC)
        String[] categories = {"ALL", "NEW", "HUD", "SERVER", "MECHANIC"};
        int catStartX = contentX + 4;
        for (int i = 0; i < categories.length; i++) {
            String cat = categories[i];
            int cx = catStartX + i * 40;
            int cy = contentY + 6;
            int cw = 36;
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

        // Draw Mod Cards 3-Column Grid
        int gridX = contentX + 6;
        int gridY = contentY + 24;
        int gridW = contentW - 12;
        int gridH = contentH - 30;

        context.enableScissor(gridX, gridY, gridX + gridW, gridY + gridH);

        // Filter mod list
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
            
            context.fill(cx, cy, cx + colWidth, cy + cardHeight, 0x651E293B);
            
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

        context.disableScissor();
    }

    // ============================================================================
    // SETTINGS TAB 
    // ============================================================================
    private void renderSettingsTab(DrawContext context, int mouseX, int mouseY,
                                    int contentX, int contentY, int contentW, int contentH) {
        // Sub-tabs: GENERAL, PERFORMANCE, CONTROLS
        String[] subTabs = {"GENERAL", "PERFORMANCE", "CONTROLS"};
        int subTabStartX = contentX + 6;
        for (int i = 0; i < subTabs.length; i++) {
            String st = subTabs[i];
            int sx = subTabStartX + i * 62;
            int sy = contentY + 6;
            int sw = 58;
            int sh = 12;
            boolean active = settingsSubTab.equals(st);
            
            if (active) {
                context.fill(sx, sy, sx + sw, sy + sh, 0x40BF5BFF);
                context.drawBorder(sx, sy, sw, sh, 0xFFBF5BFF);
            } else {
                context.fill(sx, sy, sx + sw, sy + sh, 0x15FFFFFF);
                context.drawBorder(sx, sy, sw, sh, 0x05FFFFFF);
            }
            int color = active ? 0xFFFFFFFF : 0xFF94A3B8;
            context.drawCenteredTextWithShadow(this.textRenderer, st, sx + sw / 2, sy + 2, color);
        }

        // Settings content area
        int listX = contentX + 6;
        int listY = contentY + 26;
        int listW = contentW - 12;
        int listH = contentH - 32;

        context.enableScissor(listX, listY, listX + listW, listY + listH);

        List<SettingEntry> settings = getSettingsForSubTab(settingsSubTab);
        int rowHeight = 22;
        for (int i = 0; i < settings.size(); i++) {
            SettingEntry entry = settings.get(i);
            int ry = listY + i * rowHeight - scrollOffset;

            // Row background - alternating
            if (i % 2 == 0) {
                context.fill(listX, ry, listX + listW, ry + rowHeight, 0x101E293B);
            }

            // Label
            context.drawTextWithShadow(this.textRenderer, entry.label, listX + 8, ry + 7, 0xFFE2E8F0);

            // Toggle switch on the right
            int toggleX = listX + listW - 34;
            int toggleY = ry + 5;
            int toggleW = 26;
            int toggleH = 12;
            boolean isOn = configStates.getOrDefault(entry.configKey, false);
            
            // Track
            context.fill(toggleX, toggleY, toggleX + toggleW, toggleY + toggleH, isOn ? 0xFF22C55E : 0xFF374151);
            context.drawBorder(toggleX, toggleY, toggleW, toggleH, isOn ? 0xFF4ADE80 : 0xFF4B5563);
            
            // Knob
            int knobX = isOn ? toggleX + toggleW - 12 : toggleX + 1;
            context.fill(knobX, toggleY + 1, knobX + 11, toggleY + toggleH - 1, 0xFFFFFFFF);

            // Hover highlight
            boolean rowHovered = mouseX >= listX && mouseX <= listX + listW && mouseY >= ry && mouseY <= ry + rowHeight;
            if (rowHovered) {
                context.fill(listX, ry, listX + listW, ry + rowHeight, 0x10FFFFFF);
                // Tooltip description
                if (entry.description != null && !entry.description.isEmpty()) {
                    context.drawTextWithShadow(this.textRenderer, entry.description, listX + 8, ry + rowHeight - 9, 0xFF64748B);
                }
            }
        }

        context.disableScissor();
    }

    private List<SettingEntry> getSettingsForSubTab(String subTab) {
        List<SettingEntry> list = new ArrayList<>();
        switch (subTab) {
            case "GENERAL":
                list.add(new SettingEntry("Show HUD", "show_hud", "Toggle the entire HUD visibility"));
                list.add(new SettingEntry("Show Scoreboard", "show_scoreboard", "Show/hide the sidebar scoreboard"));
                list.add(new SettingEntry("Show Boss Bar", "show_boss_bar", "Show/hide the boss health bar"));
                list.add(new SettingEntry("Show Tab List", "show_tab_list", "Show/hide player tab list"));
                list.add(new SettingEntry("Chat Animation", "chat_animation", "Smooth chat message animation"));
                list.add(new SettingEntry("Smooth Scrolling", "smooth_scroll", "Enable smooth scroll in menus"));
                list.add(new SettingEntry("Custom Hit Color", "custom_hit_color", "Custom red hit overlay color"));
                list.add(new SettingEntry("Fire Height Reduce", "fire_height_reduce", "Lower fire overlay on screen"));
                list.add(new SettingEntry("Minimal View Bobbing", "minimal_view_bobbing", "Reduce view bobbing amount"));
                list.add(new SettingEntry("Raw Mouse Input", "raw_mouse_input", "Use raw mouse input (no accel)"));
                break;
            case "PERFORMANCE":
                list.add(new SettingEntry("Lazy Chunk Loading", "lazy_chunk_loading", "Delay chunk mesh rebuilds"));
                list.add(new SettingEntry("Fast Text Rendering", "fast_text_render", "Use simplified text rendering"));
                list.add(new SettingEntry("Entity Culling", "culling", "Skip rendering unseen entities"));
                list.add(new SettingEntry("Reduced Particles", "reduced_particles", "Reduce particle count globally"));
                list.add(new SettingEntry("FPS Boost Mode", "fps_boost", "Apply aggressive optimizations"));
                list.add(new SettingEntry("Disable Block Anim.", "disable_block_animations", "Stop block break animation"));
                list.add(new SettingEntry("Fullbright", "fullbright", "Override gamma for max brightness"));
                break;
            case "CONTROLS":
                list.add(new SettingEntry("Toggle Sneak/Sprint", "toggle_sneak", "Toggle sneak and sprint mode"));
                list.add(new SettingEntry("Freelook (360° Camera)", "freelook", "Hold F key for freelook"));
                list.add(new SettingEntry("Freelook Invert Y", "freelook_invert_y", "Invert Y-axis in freelook"));
                list.add(new SettingEntry("Zoom Mod", "zoom", "Cinematic zoom with C key"));
                break;
        }
        return list;
    }

    // ============================================================================
    // WAYPOINTS TAB
    // ============================================================================
    private void renderWaypointsTab(DrawContext context, int mouseX, int mouseY,
                                     int contentX, int contentY, int contentW, int contentH) {
        // Title and Add button
        context.drawTextWithShadow(this.textRenderer, "WAYPOINTS", contentX + 8, contentY + 8, 0xFFE2E8F0);

        // Add Waypoint button
        int addBtnX = contentX + contentW - 80;
        int addBtnY = contentY + 5;
        int addBtnW = 74;
        int addBtnH = 14;
        boolean addHovered = mouseX >= addBtnX && mouseX <= addBtnX + addBtnW && mouseY >= addBtnY && mouseY <= addBtnY + addBtnH;
        context.fill(addBtnX, addBtnY, addBtnX + addBtnW, addBtnY + addBtnH, addHovered ? 0xFF16A34A : 0xFF22C55E);
        context.drawBorder(addBtnX, addBtnY, addBtnW, addBtnH, 0xFF4ADE80);
        context.drawCenteredTextWithShadow(this.textRenderer, "+ ADD", addBtnX + addBtnW / 2, addBtnY + 3, 0xFFFFFFFF);

        // Waypoint list
        int listX = contentX + 6;
        int listY = contentY + 26;
        int listW = contentW - 12;
        int listH = contentH - 32;

        context.enableScissor(listX, listY, listX + listW, listY + listH);

        if (waypoints.isEmpty()) {
            context.drawCenteredTextWithShadow(this.textRenderer, "No waypoints set.", listX + listW / 2, listY + listH / 2 - 4, 0xFF64748B);
            context.drawCenteredTextWithShadow(this.textRenderer, "Click + ADD to create one.", listX + listW / 2, listY + listH / 2 + 8, 0xFF475569);
        } else {
            int rowH = 28;
            for (int i = 0; i < waypoints.size(); i++) {
                Waypoint wp = waypoints.get(i);
                int ry = listY + i * rowH - scrollOffset;

                // Row background
                context.fill(listX, ry, listX + listW, ry + rowH - 2, 0x301E293B);
                
                boolean rowHovered = mouseX >= listX && mouseX <= listX + listW && mouseY >= ry && mouseY <= ry + rowH;
                if (rowHovered) {
                    context.fill(listX, ry, listX + listW, ry + rowH - 2, 0x10FFFFFF);
                }

                // Color dot
                int dotColor = getWaypointColor(wp.color);
                context.fill(listX + 6, ry + 8, listX + 14, ry + 16, dotColor);

                // Name
                context.drawTextWithShadow(this.textRenderer, wp.name, listX + 20, ry + 6, 0xFFFFFFFF);

                // Coordinates
                String coordsStr = String.format("X: %d  Y: %d  Z: %d", wp.x, wp.y, wp.z);
                context.drawTextWithShadow(this.textRenderer, coordsStr, listX + 20, ry + 16, 0xFF94A3B8);

                // Distance from player
                net.minecraft.client.MinecraftClient mc = net.minecraft.client.MinecraftClient.getInstance();
                if (mc.player != null) {
                    double dist = Math.sqrt(
                        Math.pow(mc.player.getX() - wp.x, 2) +
                        Math.pow(mc.player.getY() - wp.y, 2) +
                        Math.pow(mc.player.getZ() - wp.z, 2)
                    );
                    String distStr = String.format("%.0fm", dist);
                    int distW = this.textRenderer.getWidth(distStr);
                    context.drawTextWithShadow(this.textRenderer, distStr, listX + listW - distW - 30, ry + 10, 0xFF94A3B8);
                }

                // Delete button
                int delX = listX + listW - 18;
                int delY = ry + 8;
                boolean delHovered = mouseX >= delX && mouseX <= delX + 12 && mouseY >= delY && mouseY <= delY + 10;
                context.drawTextWithShadow(this.textRenderer, "✖", delX, delY, delHovered ? 0xFFEF4444 : 0xFF64748B);
            }
        }

        context.disableScissor();
    }

    private int getWaypointColor(String color) {
        switch (color.toLowerCase()) {
            case "red": return 0xFFEF4444;
            case "blue": return 0xFF3B82F6;
            case "yellow": return 0xFFFFC107;
            case "purple": return 0xFFA78BFA;
            case "orange": return 0xFFF97316;
            case "white": return 0xFFFFFFFF;
            default: return 0xFF22C55E; // green
        }
    }

    // ============================================================================
    // MOD DETAIL POPUP
    // ============================================================================
    private void renderModDetailPopup(DrawContext context, int mouseX, int mouseY) {
        // Dark overlay behind popup
        context.fill(0, 0, this.width, this.height, 0x90000000);

        int pw = 260;
        int ph = 220;
        int px = (this.width - pw) / 2;
        int py = (this.height - ph) / 2;

        // Popup background
        context.fill(px, py, px + pw, py + ph, 0xF80B0F19);
        context.drawBorder(px, py, pw, ph, 0x60BF5BFF);

        // Header
        context.fill(px + 1, py + 1, px + pw - 1, py + 26, 0x301E293B);
        
        // Icon
        context.fill(px + 10, py + 6, px + 22, py + 18, detailMod.iconBgColor | 0xFF000000);
        context.drawCenteredTextWithShadow(this.textRenderer, detailMod.icon, px + 16, py + 8, 0xFFFFFFFF);
        
        // Title
        context.drawTextWithShadow(this.textRenderer, detailMod.name + " Settings", px + 28, py + 9, 0xFFFFFFFF);

        // Close button
        int clX = px + pw - 18;
        int clY = py + 8;
        boolean clHov = mouseX >= clX && mouseX <= clX + 10 && mouseY >= clY && mouseY <= clY + 10;
        context.drawTextWithShadow(this.textRenderer, "✖", clX, clY, clHov ? 0xFFEF4444 : 0xFFA1A1AA);

        // Description
        context.drawTextWithShadow(this.textRenderer, detailMod.description, px + 10, py + 32, 0xFF94A3B8);

        // Status toggle (large)
        boolean isEnabled = configStates.getOrDefault(detailMod.id, false);
        int tbX = px + 10;
        int tbY = py + 48;
        int tbW = pw - 20;
        int tbH = 18;
        boolean tbHov = mouseX >= tbX && mouseX <= tbX + tbW && mouseY >= tbY && mouseY <= tbY + tbH;
        int tbColor = isEnabled ? (tbHov ? 0xFF16A34A : 0xFF22C55E) : (tbHov ? 0xFFDC2626 : 0xFFEF4444);
        context.fill(tbX, tbY, tbX + tbW, tbY + tbH, tbColor);
        context.drawBorder(tbX, tbY, tbW, tbH, isEnabled ? 0xFF4ADE80 : 0xFFFCA5A5);
        context.drawCenteredTextWithShadow(this.textRenderer, isEnabled ? "ENABLED" : "DISABLED", tbX + tbW / 2, tbY + 5, 0xFFFFFFFF);

        // Settings: Customization options specific to HUD elements
        HudElement hudEl = null;
        for (HudElement el : HudManager.getInstance().getElements()) {
            if (el.getId().equals(detailMod.id)) {
                hudEl = el;
                break;
            }
        }

        int settingsY = py + 74;

        if (hudEl != null) {
            // Scale slider
            context.drawTextWithShadow(this.textRenderer, "Scale", px + 10, settingsY, 0xFFE2E8F0);
            float scale = hudEl.getScale();
            int sliderX = px + 60;
            int sliderW = pw - 80;
            int sliderY = settingsY + 2;
            context.fill(sliderX, sliderY, sliderX + sliderW, sliderY + 8, 0xFF374151);
            int filled = (int) ((scale - 0.5f) / 2.0f * sliderW);
            context.fill(sliderX, sliderY, sliderX + Math.min(filled, sliderW), sliderY + 8, 0xFFBF5BFF);
            context.drawBorder(sliderX, sliderY, sliderW, 8, 0xFF4B5563);
            String scaleText = String.format("%.1fx", scale);
            context.drawTextWithShadow(this.textRenderer, scaleText, sliderX + sliderW + 4, settingsY, 0xFFA1A1AA);
            settingsY += 20;

            // Color theme selector
            context.drawTextWithShadow(this.textRenderer, "Color Theme", px + 10, settingsY, 0xFFE2E8F0);
            String[] themes = {"white", "red", "green", "blue", "purple", "orange"};
            int[] themeColors = {0xFFFFFFFF, 0xFFEF4444, 0xFF22C55E, 0xFF3B82F6, 0xFFA78BFA, 0xFFF97316};
            for (int i = 0; i < themes.length; i++) {
                int tx = px + 90 + i * 22;
                int ty = settingsY - 1;
                boolean isActive = hudEl.getColorTheme().equalsIgnoreCase(themes[i]);
                context.fill(tx, ty, tx + 16, ty + 12, themeColors[i]);
                if (isActive) {
                    context.drawBorder(tx - 1, ty - 1, 18, 14, 0xFFFFFFFF);
                }
            }
            settingsY += 20;

            // Background opacity slider
            context.drawTextWithShadow(this.textRenderer, "BG Opacity", px + 10, settingsY, 0xFFE2E8F0);
            int opacity = hudEl.getBgOpacity();
            int opSliderX = px + 90;
            int opSliderW = pw - 110;
            context.fill(opSliderX, settingsY + 2, opSliderX + opSliderW, settingsY + 10, 0xFF374151);
            int opFilled = (int) ((float) opacity / 255f * opSliderW);
            context.fill(opSliderX, settingsY + 2, opSliderX + Math.min(opFilled, opSliderW), settingsY + 10, 0xFF22C55E);
            context.drawBorder(opSliderX, settingsY + 2, opSliderW, 8, 0xFF4B5563);
            String opText = String.format("%d%%", (int)((float) opacity / 255f * 100));
            context.drawTextWithShadow(this.textRenderer, opText, opSliderX + opSliderW + 4, settingsY, 0xFFA1A1AA);
            settingsY += 20;

            // Text shadow toggle
            context.drawTextWithShadow(this.textRenderer, "Text Shadow", px + 10, settingsY, 0xFFE2E8F0);
            boolean shadow = configStates.getOrDefault(detailMod.id + "_shadow", true);
            int swX = px + pw - 44;
            int swY = settingsY - 1;
            context.fill(swX, swY, swX + 26, swY + 12, shadow ? 0xFF22C55E : 0xFF374151);
            context.drawBorder(swX, swY, 26, 12, shadow ? 0xFF4ADE80 : 0xFF4B5563);
            int knobX = shadow ? swX + 15 : swX + 1;
            context.fill(knobX, swY + 1, knobX + 10, swY + 11, 0xFFFFFFFF);
            settingsY += 20;

            // Bracket type selector
            context.drawTextWithShadow(this.textRenderer, "Bracket Type", px + 10, settingsY, 0xFFE2E8F0);
            String[] brackets = {"[%s]", "(%s)", "<%s>", "{%s}", "| %s |", "- %s -"};
            String[] bracketLabels = {"[ ]", "( )", "< >", "{ }", "| |", "- -"};
            String currentBracket = configStrings.getOrDefault(detailMod.id + "_bracket", "[%s]");
            for (int i = 0; i < brackets.length; i++) {
                int bx = px + 90 + i * 26;
                int by = settingsY - 1;
                boolean bActive = currentBracket.equals(brackets[i]);
                context.fill(bx, by, bx + 22, by + 12, bActive ? 0x40BF5BFF : 0x15FFFFFF);
                context.drawBorder(bx, by, 22, 12, bActive ? 0xFFBF5BFF : 0x15FFFFFF);
                context.drawCenteredTextWithShadow(this.textRenderer, bracketLabels[i], bx + 11, by + 2, bActive ? 0xFFFFFFFF : 0xFF94A3B8);
            }
        } else {
            // Non-HUD mod: show simple description
            context.drawTextWithShadow(this.textRenderer, "Category: " + detailMod.category, px + 10, settingsY, 0xFF94A3B8);
            settingsY += 14;

            // Show relevant config toggles for this mod
            if (detailMod.id.equals("freelook")) {
                context.drawTextWithShadow(this.textRenderer, "Perspective:", px + 10, settingsY, 0xFFE2E8F0);
                String[] perspectives = {"third_back", "third_front", "first"};
                String[] perspLabels = {"3rd Back", "3rd Front", "1st"};
                String current = configStrings.getOrDefault("freelook_perspective", "third_back");
                for (int i = 0; i < perspectives.length; i++) {
                    int bx = px + 90 + i * 56;
                    int by = settingsY - 1;
                    boolean bActive = current.equals(perspectives[i]);
                    context.fill(bx, by, bx + 52, by + 12, bActive ? 0x40BF5BFF : 0x15FFFFFF);
                    context.drawBorder(bx, by, 52, 12, bActive ? 0xFFBF5BFF : 0x15FFFFFF);
                    context.drawCenteredTextWithShadow(this.textRenderer, perspLabels[i], bx + 26, by + 2, bActive ? 0xFFFFFFFF : 0xFF94A3B8);
                }
                settingsY += 20;

                // Invert Y toggle
                context.drawTextWithShadow(this.textRenderer, "Invert Y Axis", px + 10, settingsY, 0xFFE2E8F0);
                boolean invertY = configStates.getOrDefault("freelook_invert_y", false);
                int swX = px + pw - 44;
                int swY = settingsY - 1;
                context.fill(swX, swY, swX + 26, swY + 12, invertY ? 0xFF22C55E : 0xFF374151);
                context.drawBorder(swX, swY, 26, 12, invertY ? 0xFF4ADE80 : 0xFF4B5563);
                int knobX2 = invertY ? swX + 15 : swX + 1;
                context.fill(knobX2, swY + 1, knobX2 + 10, swY + 11, 0xFFFFFFFF);
            } else if (detailMod.id.equals("block_outline")) {
                context.drawTextWithShadow(this.textRenderer, "Outline Color:", px + 10, settingsY, 0xFFE2E8F0);
                String[] colors = {"purple", "red", "green", "blue", "orange", "white"};
                int[] colorVals = {0xFFBF5BFF, 0xFFEF4444, 0xFF22C55E, 0xFF3B82F6, 0xFFF97316, 0xFFFFFFFF};
                String current = configStrings.getOrDefault("outline_color", "purple");
                for (int i = 0; i < colors.length; i++) {
                    int tx = px + 90 + i * 22;
                    int ty = settingsY - 1;
                    boolean cActive = current.equalsIgnoreCase(colors[i]);
                    context.fill(tx, ty, tx + 16, ty + 12, colorVals[i]);
                    if (cActive) {
                        context.drawBorder(tx - 1, ty - 1, 18, 14, 0xFFFFFFFF);
                    }
                }
            }
        }
    }

    // ============================================================================
    // WAYPOINT ADD MODAL
    // ============================================================================
    private void renderWaypointAddModal(DrawContext context, int mouseX, int mouseY) {
        context.fill(0, 0, this.width, this.height, 0x90000000);

        int pw = 220;
        int ph = 140;
        int px = (this.width - pw) / 2;
        int py = (this.height - ph) / 2;

        context.fill(px, py, px + pw, py + ph, 0xF80B0F19);
        context.drawBorder(px, py, pw, ph, 0x60BF5BFF);

        // Header
        context.drawTextWithShadow(this.textRenderer, "Add Waypoint", px + 10, py + 8, 0xFFFFFFFF);
        
        // Close button
        int clX = px + pw - 18;
        int clY = py + 8;
        boolean clHov = mouseX >= clX && mouseX <= clX + 10 && mouseY >= clY && mouseY <= clY + 10;
        context.drawTextWithShadow(this.textRenderer, "✖", clX, clY, clHov ? 0xFFEF4444 : 0xFFA1A1AA);

        // Name field
        context.drawTextWithShadow(this.textRenderer, "Name:", px + 10, py + 30, 0xFFE2E8F0);
        int nameFieldX = px + 50;
        int nameFieldY = py + 27;
        int nameFieldW = pw - 60;
        int nameFieldH = 14;
        context.fill(nameFieldX, nameFieldY, nameFieldX + nameFieldW, nameFieldY + nameFieldH, wpNameFocused ? 0x900F172A : 0x500F172A);
        context.drawBorder(nameFieldX, nameFieldY, nameFieldW, nameFieldH, wpNameFocused ? 0xFFBF5BFF : 0x20FFFFFF);
        String nameDisplay = wpName.isEmpty() ? (wpNameFocused ? "" : "Enter name...") : wpName;
        int nameColor = wpName.isEmpty() && !wpNameFocused ? 0xFF64748B : 0xFFFFFFFF;
        context.drawTextWithShadow(this.textRenderer, nameDisplay, nameFieldX + 4, nameFieldY + 3, nameColor);

        // Color selector
        context.drawTextWithShadow(this.textRenderer, "Color:", px + 10, py + 52, 0xFFE2E8F0);
        String[] colors = {"green", "red", "blue", "yellow", "purple", "orange"};
        int[] colorVals = {0xFF22C55E, 0xFFEF4444, 0xFF3B82F6, 0xFFFFC107, 0xFFA78BFA, 0xFFF97316};
        for (int i = 0; i < colors.length; i++) {
            int cx = px + 50 + i * 22;
            int cy = py + 49;
            boolean cActive = wpColor.equalsIgnoreCase(colors[i]);
            context.fill(cx, cy, cx + 16, cy + 12, colorVals[i]);
            if (cActive) {
                context.drawBorder(cx - 1, cy - 1, 18, 14, 0xFFFFFFFF);
            }
        }

        // Current position display
        net.minecraft.client.MinecraftClient mc = net.minecraft.client.MinecraftClient.getInstance();
        String posStr = "Current Position";
        if (mc.player != null) {
            posStr = String.format("X: %d  Y: %d  Z: %d", (int) mc.player.getX(), (int) mc.player.getY(), (int) mc.player.getZ());
        }
        context.drawTextWithShadow(this.textRenderer, posStr, px + 10, py + 72, 0xFF94A3B8);

        // Confirm button
        int confirmX = px + 10;
        int confirmY = py + ph - 28;
        int confirmW = pw - 20;
        int confirmH = 18;
        boolean confirmHov = mouseX >= confirmX && mouseX <= confirmX + confirmW && mouseY >= confirmY && mouseY <= confirmY + confirmH;
        context.fill(confirmX, confirmY, confirmX + confirmW, confirmY + confirmH, confirmHov ? 0xFF16A34A : 0xFF22C55E);
        context.drawBorder(confirmX, confirmY, confirmW, confirmH, 0xFF4ADE80);
        context.drawCenteredTextWithShadow(this.textRenderer, "ADD WAYPOINT", confirmX + confirmW / 2, confirmY + 5, 0xFFFFFFFF);
    }

    // ============================================================================
    // INPUT HANDLING
    // ============================================================================

    @Override
    public boolean mouseScrolled(double mouseX, double mouseY, double horizontalAmount, double verticalAmount) {
        if (showModDetail) {
            detailScroll = Math.max(0, detailScroll - (int)(verticalAmount * 16));
            return true;
        }
        scrollOffset = Math.max(0, scrollOffset - (int)(verticalAmount * 16));
        return true;
    }

    @Override
    public boolean mouseClicked(double mouseX, double mouseY, int button) {
        // Handle mod detail popup clicks first
        if (showModDetail && detailMod != null) {
            return handleModDetailClick(mouseX, mouseY);
        }

        // Handle waypoint add modal clicks
        if (showWaypointAdd) {
            return handleWaypointAddClick(mouseX, mouseY);
        }

        int w = Math.min(this.width - 20, 520);
        int h = Math.min(this.height - 20, 320);
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
        int tabStartX = x + w / 2 - 80;
        for (int i = 0; i < tabs.length; i++) {
            int tx = tabStartX + i * 55;
            int ty = y + 8;
            if (mouseX >= tx && mouseX <= tx + 50 && mouseY >= ty && mouseY <= ty + 14) {
                activeTab = tabs[i];
                scrollOffset = 0;
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

        // Route to tab-specific click handlers
        int contentX = x + 116;
        int contentY = y + 30;
        int contentW = w - 122;
        int contentH = h - 36;

        if ("MODS".equals(activeTab)) {
            return handleModsTabClick(mouseX, mouseY, contentX, contentY, contentW, contentH, w, h);
        } else if ("SETTINGS".equals(activeTab)) {
            return handleSettingsTabClick(mouseX, mouseY, contentX, contentY, contentW, contentH);
        } else if ("WAYPOINTS".equals(activeTab)) {
            return handleWaypointsTabClick(mouseX, mouseY, contentX, contentY, contentW, contentH);
        }

        return super.mouseClicked(mouseX, mouseY, button);
    }

    private boolean handleModsTabClick(double mouseX, double mouseY,
                                        int contentX, int contentY, int contentW, int contentH,
                                        int panelW, int panelH) {
        // Category Pills click
        String[] categories = {"ALL", "NEW", "HUD", "SERVER", "MECHANIC"};
        int catStartX = contentX + 4;
        for (int i = 0; i < categories.length; i++) {
            int cx = catStartX + i * 40;
            int cy = contentY + 6;
            if (mouseX >= cx && mouseX <= cx + 36 && mouseY >= cy && mouseY <= cy + 12) {
                activeCategory = categories[i];
                scrollOffset = 0;
                return true;
            }
        }

        // Search Bar click
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

            if (cy >= gridY && cy + cardHeight <= gridY + contentH - 30) {
                // Gear icon click -> open detail popup
                int gearX = cx + colWidth - 14;
                int gearY = cy + 7;
                if (mouseX >= gearX && mouseX <= gearX + 8 && mouseY >= gearY && mouseY <= gearY + 8) {
                    showModDetail = true;
                    detailMod = mod;
                    detailScroll = 0;
                    return true;
                }

                // Toggle status pill click
                int btnX = cx + 6;
                int btnY = cy + 24;
                if (mouseX >= btnX && mouseX <= btnX + colWidth - 12 && mouseY >= btnY && mouseY <= btnY + 14) {
                    boolean current = configStates.getOrDefault(mod.id, false);
                    configStates.put(mod.id, !current);
                    saveConfigStatic();
                    
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

        return false;
    }

    private boolean handleSettingsTabClick(double mouseX, double mouseY,
                                            int contentX, int contentY, int contentW, int contentH) {
        // Sub-tab clicks
        String[] subTabs = {"GENERAL", "PERFORMANCE", "CONTROLS"};
        int subTabStartX = contentX + 6;
        for (int i = 0; i < subTabs.length; i++) {
            int sx = subTabStartX + i * 62;
            int sy = contentY + 6;
            if (mouseX >= sx && mouseX <= sx + 58 && mouseY >= sy && mouseY <= sy + 12) {
                settingsSubTab = subTabs[i];
                scrollOffset = 0;
                return true;
            }
        }

        // Toggle switches
        int listX = contentX + 6;
        int listY = contentY + 26;
        int listW = contentW - 12;

        List<SettingEntry> settings = getSettingsForSubTab(settingsSubTab);
        int rowHeight = 22;
        for (int i = 0; i < settings.size(); i++) {
            SettingEntry entry = settings.get(i);
            int ry = listY + i * rowHeight - scrollOffset;

            int toggleX = listX + listW - 34;
            int toggleY = ry + 5;
            if (mouseX >= toggleX && mouseX <= toggleX + 26 && mouseY >= toggleY && mouseY <= toggleY + 12) {
                boolean current = configStates.getOrDefault(entry.configKey, false);
                configStates.put(entry.configKey, !current);
                saveConfigStatic();
                return true;
            }
        }

        return false;
    }

    private boolean handleWaypointsTabClick(double mouseX, double mouseY,
                                             int contentX, int contentY, int contentW, int contentH) {
        // Add button
        int addBtnX = contentX + contentW - 80;
        int addBtnY = contentY + 5;
        if (mouseX >= addBtnX && mouseX <= addBtnX + 74 && mouseY >= addBtnY && mouseY <= addBtnY + 14) {
            showWaypointAdd = true;
            wpName = "";
            wpColor = "green";
            wpNameFocused = false;
            return true;
        }

        // Delete buttons on waypoint list
        int listX = contentX + 6;
        int listY = contentY + 26;
        int listW = contentW - 12;
        int rowH = 28;
        for (int i = 0; i < waypoints.size(); i++) {
            int ry = listY + i * rowH - scrollOffset;
            int delX = listX + listW - 18;
            int delY = ry + 8;
            if (mouseX >= delX && mouseX <= delX + 12 && mouseY >= delY && mouseY <= delY + 10) {
                waypoints.remove(i);
                saveWaypointsStatic();
                return true;
            }
        }

        return false;
    }

    private boolean handleModDetailClick(double mouseX, double mouseY) {
        int pw = 260;
        int ph = 220;
        int px = (this.width - pw) / 2;
        int py = (this.height - ph) / 2;

        // Close button
        int clX = px + pw - 18;
        int clY = py + 8;
        if (mouseX >= clX && mouseX <= clX + 10 && mouseY >= clY && mouseY <= clY + 10) {
            showModDetail = false;
            detailMod = null;
            return true;
        }

        // Click outside popup to close
        if (mouseX < px || mouseX > px + pw || mouseY < py || mouseY > py + ph) {
            showModDetail = false;
            detailMod = null;
            return true;
        }

        // Toggle button
        int tbX = px + 10;
        int tbY = py + 48;
        int tbW = pw - 20;
        int tbH = 18;
        if (mouseX >= tbX && mouseX <= tbX + tbW && mouseY >= tbY && mouseY <= tbY + tbH) {
            boolean current = configStates.getOrDefault(detailMod.id, false);
            configStates.put(detailMod.id, !current);
            saveConfigStatic();
            
            for (HudElement el : HudManager.getInstance().getElements()) {
                if (el.getId().equals(detailMod.id)) {
                    el.setEnabled(!current);
                    HudManager.getInstance().saveConfig();
                    break;
                }
            }
            return true;
        }

        // HUD element-specific settings
        HudElement hudEl = null;
        for (HudElement el : HudManager.getInstance().getElements()) {
            if (el.getId().equals(detailMod.id)) {
                hudEl = el;
                break;
            }
        }

        int settingsY = py + 74;

        if (hudEl != null) {
            // Scale slider click
            int sliderX = px + 60;
            int sliderW = pw - 80;
            int sliderY = settingsY + 2;
            if (mouseX >= sliderX && mouseX <= sliderX + sliderW && mouseY >= sliderY && mouseY <= sliderY + 8) {
                float newScale = 0.5f + (float)(mouseX - sliderX) / sliderW * 2.0f;
                newScale = Math.max(0.5f, Math.min(2.5f, newScale));
                hudEl.setScale(newScale);
                HudManager.getInstance().saveConfig();
                return true;
            }
            settingsY += 20;

            // Color theme click
            String[] themes = {"white", "red", "green", "blue", "purple", "orange"};
            for (int i = 0; i < themes.length; i++) {
                int tx = px + 90 + i * 22;
                int ty = settingsY - 1;
                if (mouseX >= tx && mouseX <= tx + 16 && mouseY >= ty && mouseY <= ty + 12) {
                    hudEl.setColorTheme(themes[i]);
                    HudManager.getInstance().saveConfig();
                    return true;
                }
            }
            settingsY += 20;

            // Opacity slider click
            int opSliderX = px + 90;
            int opSliderW = pw - 110;
            if (mouseX >= opSliderX && mouseX <= opSliderX + opSliderW && mouseY >= settingsY + 2 && mouseY <= settingsY + 10) {
                int newOp = (int)((mouseX - opSliderX) / opSliderW * 255);
                newOp = Math.max(0, Math.min(255, newOp));
                hudEl.setBgOpacity(newOp);
                HudManager.getInstance().saveConfig();
                return true;
            }
            settingsY += 20;

            // Text shadow toggle
            int swX = px + pw - 44;
            int swY = settingsY - 1;
            if (mouseX >= swX && mouseX <= swX + 26 && mouseY >= swY && mouseY <= swY + 12) {
                boolean current = configStates.getOrDefault(detailMod.id + "_shadow", true);
                configStates.put(detailMod.id + "_shadow", !current);
                saveConfigStatic();
                return true;
            }
            settingsY += 20;

            // Bracket type click
            String[] brackets = {"[%s]", "(%s)", "<%s>", "{%s}", "| %s |", "- %s -"};
            for (int i = 0; i < brackets.length; i++) {
                int bx = px + 90 + i * 26;
                int by = settingsY - 1;
                if (mouseX >= bx && mouseX <= bx + 22 && mouseY >= by && mouseY <= by + 12) {
                    configStrings.put(detailMod.id + "_bracket", brackets[i]);
                    saveStringsConfigStatic();
                    return true;
                }
            }
        } else {
            // Freelook perspective buttons
            if (detailMod.id.equals("freelook")) {
                String[] perspectives = {"third_back", "third_front", "first"};
                for (int i = 0; i < perspectives.length; i++) {
                    int bx = px + 90 + i * 56;
                    int by = settingsY - 1;
                    if (mouseX >= bx && mouseX <= bx + 52 && mouseY >= by && mouseY <= by + 12) {
                        configStrings.put("freelook_perspective", perspectives[i]);
                        saveStringsConfigStatic();
                        return true;
                    }
                }
                settingsY += 20;

                // Invert Y toggle
                int swX = px + pw - 44;
                int swY = settingsY - 1;
                if (mouseX >= swX && mouseX <= swX + 26 && mouseY >= swY && mouseY <= swY + 12) {
                    boolean current = configStates.getOrDefault("freelook_invert_y", false);
                    configStates.put("freelook_invert_y", !current);
                    saveConfigStatic();
                    return true;
                }
            } else if (detailMod.id.equals("block_outline")) {
                String[] colors = {"purple", "red", "green", "blue", "orange", "white"};
                for (int i = 0; i < colors.length; i++) {
                    int tx = px + 90 + i * 22;
                    int ty = settingsY - 1;
                    if (mouseX >= tx && mouseX <= tx + 16 && mouseY >= ty && mouseY <= ty + 12) {
                        configStrings.put("outline_color", colors[i]);
                        saveStringsConfigStatic();
                        return true;
                    }
                }
            }
        }

        return true; // Consume click within popup
    }

    private boolean handleWaypointAddClick(double mouseX, double mouseY) {
        int pw = 220;
        int ph = 140;
        int px = (this.width - pw) / 2;
        int py = (this.height - ph) / 2;

        // Close button
        int clX = px + pw - 18;
        int clY = py + 8;
        if (mouseX >= clX && mouseX <= clX + 10 && mouseY >= clY && mouseY <= clY + 10) {
            showWaypointAdd = false;
            return true;
        }

        // Click outside to close
        if (mouseX < px || mouseX > px + pw || mouseY < py || mouseY > py + ph) {
            showWaypointAdd = false;
            return true;
        }

        // Name field click
        int nameFieldX = px + 50;
        int nameFieldY = py + 27;
        int nameFieldW = pw - 60;
        int nameFieldH = 14;
        if (mouseX >= nameFieldX && mouseX <= nameFieldX + nameFieldW && mouseY >= nameFieldY && mouseY <= nameFieldY + nameFieldH) {
            wpNameFocused = true;
        } else {
            wpNameFocused = false;
        }

        // Color selector
        String[] colors = {"green", "red", "blue", "yellow", "purple", "orange"};
        for (int i = 0; i < colors.length; i++) {
            int cx = px + 50 + i * 22;
            int cy = py + 49;
            if (mouseX >= cx && mouseX <= cx + 16 && mouseY >= cy && mouseY <= cy + 12) {
                wpColor = colors[i];
                return true;
            }
        }

        // Confirm button
        int confirmX = px + 10;
        int confirmY = py + ph - 28;
        int confirmW = pw - 20;
        int confirmH = 18;
        if (mouseX >= confirmX && mouseX <= confirmX + confirmW && mouseY >= confirmY && mouseY <= confirmY + confirmH) {
            // Add waypoint at current position
            net.minecraft.client.MinecraftClient mc = net.minecraft.client.MinecraftClient.getInstance();
            if (mc.player != null && !wpName.isEmpty()) {
                Waypoint wp = new Waypoint();
                wp.name = wpName;
                wp.color = wpColor;
                wp.x = (int) mc.player.getX();
                wp.y = (int) mc.player.getY();
                wp.z = (int) mc.player.getZ();
                waypoints.add(wp);
                saveWaypointsStatic();
                showWaypointAdd = false;
            }
            return true;
        }

        return true;
    }

    @Override
    public boolean charTyped(char chr, int modifiers) {
        if (showWaypointAdd && wpNameFocused) {
            wpName += chr;
            return true;
        }
        if (searchFocused) {
            searchQuery += chr;
            scrollOffset = 0;
            return true;
        }
        return super.charTyped(chr, modifiers);
    }

    @Override
    public boolean keyPressed(int keyCode, int scanCode, int modifiers) {
        if (showWaypointAdd && wpNameFocused) {
            if (keyCode == GLFW.GLFW_KEY_BACKSPACE) {
                if (!wpName.isEmpty()) {
                    wpName = wpName.substring(0, wpName.length() - 1);
                }
                return true;
            } else if (keyCode == GLFW.GLFW_KEY_ENTER) {
                wpNameFocused = false;
                return true;
            } else if (keyCode == GLFW.GLFW_KEY_ESCAPE) {
                showWaypointAdd = false;
                return true;
            }
        }

        if (showModDetail) {
            if (keyCode == GLFW.GLFW_KEY_ESCAPE) {
                showModDetail = false;
                detailMod = null;
                return true;
            }
        }

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

    // ============================================================================
    // DATA CLASSES
    // ============================================================================
    
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

    private static class SettingEntry {
        final String label;
        final String configKey;
        final String description;

        SettingEntry(String label, String configKey, String description) {
            this.label = label;
            this.configKey = configKey;
            this.description = description;
        }
    }

    public static class Waypoint {
        public String name = "";
        public String color = "green";
        public int x = 0;
        public int y = 0;
        public int z = 0;
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
