package com.marinmc.client.gui;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonObject;
import com.google.gson.JsonElement;
import com.google.gson.JsonParser;
import com.google.gson.reflect.TypeToken;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.gui.screen.Screen;
import net.minecraft.client.gui.widget.ButtonWidget;
import net.minecraft.text.Text;
import net.minecraft.util.Identifier;
import net.minecraft.client.resource.language.I18n;

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
    private static final File PROFILES_LIST_FILE = new File(
        net.fabricmc.loader.api.FabricLoader.getInstance().getConfigDir().toFile(),
        "marinmc-profiles-list.json"
    );
    private static final Gson GSON = new GsonBuilder().setPrettyPrinting().create();
    private static final Identifier BACKGROUND_TEXTURE = Identifier.of("marinmc-client", "textures/gui/background.png");
    private static final Identifier LOGO_TEXTURE = Identifier.of("marinmc-client", "textures/gui/logo.png");

    public static final Map<String, Boolean> configStates = new HashMap<>();
    public static final Map<String, String> configStrings = new HashMap<>();
    public static final List<Waypoint> waypoints = new ArrayList<>();
    public static final List<String> profileList = new ArrayList<>();
    
    public static void resetStatesToDefaults() {
        configStates.clear();
        configStates.put("fps", false);
        configStates.put("cps", false);
        configStates.put("keystrokes", false);
        configStates.put("armor", false);
        configStates.put("compass", false);
        configStates.put("coords", false);
        configStates.put("ping", false);
        configStates.put("speed", false);
        configStates.put("replay", false);
        configStates.put("potion_status", false);
        configStates.put("crosshair", false);
        configStates.put("time_display", false);
        configStates.put("server_info", false);
        configStates.put("item_counter", false);
        configStates.put("hit_indicator", false);
        configStates.put("damage_indicator", false);
        configStates.put("saturation_display", false);
        configStates.put("light_level", false);
        configStates.put("chat_macros", false);
        configStates.put("memory_usage", false);
        
        configStates.put("toggle_sneak", false);
        configStates.put("zoom", false);
        configStates.put("visuals_1_7", false);
        configStates.put("block_outline", false);
        configStates.put("item_physics", false);
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

        configStrings.clear();
        configStrings.put("active_theme", "classic");
        configStrings.put("active_profile", "MarinMC");
        configStrings.put("freelook_perspective", "third_back");
        configStrings.put("outline_color", "gold");
        configStrings.put("outline_thickness", "1");
    }

    static {
        resetStatesToDefaults();
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

    public static void loadProfilesList() {
        profileList.clear();
        profileList.add("MarinMC");
        if (!PROFILES_LIST_FILE.exists()) {
            profileList.add("Testing");
            profileList.add("PvP Settings");
            saveProfilesList();
            return;
        }
        try (FileReader reader = new FileReader(PROFILES_LIST_FILE)) {
            Type type = new TypeToken<List<String>>(){}.getType();
            List<String> loaded = GSON.fromJson(reader, type);
            if (loaded != null) {
                for (String p : loaded) {
                    if (!p.equalsIgnoreCase("MarinMC") && !profileList.contains(p)) {
                        profileList.add(p);
                    }
                }
            }
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    public static void saveProfilesList() {
        try (FileWriter writer = new FileWriter(PROFILES_LIST_FILE)) {
            GSON.toJson(profileList, writer);
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
    private String activeProfile = "MarinMC";
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

    // Profile Add Modal state
    private boolean showProfileAdd = false;
    private String newProfileName = "";
    private boolean profileNameFocused = false;
    
    public OverlayScreen() {
        super(Text.literal("MarinMC Mod Config"));
        
        // Populate mod list with categories and icons
        modCards.add(new ModCard("FPS Counter", "fps", "Displays current FPS on screen with customizable format.", "HUD", "\u23F1", 0xFF2D7DD2));
        modCards.add(new ModCard("CPS Counter", "cps", "Displays left and right clicks per second.", "HUD", "\u2328", 0xFF9C27B0));
        modCards.add(new ModCard("Keystrokes", "keystrokes", "Displays WASD keys and mouse buttons with press states.", "HUD", "\u2328", 0xFFE91E63));
        modCards.add(new ModCard("Armor Status", "armor", "Displays equipped armor durability.", "HUD", "\u26E8", 0xFFFF5722));
        modCards.add(new ModCard("Direction HUD", "compass", "Displays compass heading and degree.", "HUD", "\u2316", 0xFF4CAF50));
        modCards.add(new ModCard("Coordinates", "coords", "Displays current XYZ coordinates.", "HUD", "\u2316", 0xFF00BCD4));
        modCards.add(new ModCard("Ping Counter", "ping", "Displays current player ping to server.", "SERVER", "\u2767", 0xFF009688));
        modCards.add(new ModCard("Speedometer", "speed", "Displays velocity in blocks per second.", "HUD", "\u26A1", 0xFFFFC107));
        modCards.add(new ModCard("Replay Status", "replay", "Displays recording indicator dot.", "NEW", "\u2B24", 0xFFF44336));
        modCards.add(new ModCard("Potion Status", "potion_status", "Displays active potion effects and timers.", "HUD", "\u2697", 0xFF9C27B0));
        modCards.add(new ModCard("Crosshair", "crosshair", "Customizable crosshair with multiple styles.", "HUD", "\u271B", 0xFFE91E63));
        modCards.add(new ModCard("Toggle Sneak", "toggle_sneak", "Toggle sneak and sprint with one key press.", "MECHANIC", "\u21E7", 0xFF795548));
        modCards.add(new ModCard("Zoom", "zoom", "Cinematic optifine-style zoom with scroll.", "MECHANIC", "\u2295", 0xFF607D8B));
        modCards.add(new ModCard("1.7 Visuals", "visuals_1_7", "Enforces classic 1.7 hit animations.", "MECHANIC", "\u2694", 0xFF3F51B5));
        modCards.add(new ModCard("Block Outline", "block_outline", "Custom neon color for block selection outline.", "MECHANIC", "\u25A3", 0xFF9E9E9E));
        modCards.add(new ModCard("Item Physics", "item_physics", "Flat lying 3D item drops on the ground.", "MECHANIC", "\u25A6", 0xFF4CAF50));
        modCards.add(new ModCard("Freelook", "freelook", "Hold F to look around 360\u00B0 without turning character.", "MECHANIC", "\u25C9", 0xFF2196F3));
        modCards.add(new ModCard("Fullbright", "fullbright", "Overrides gamma for maximum brightness in dark.", "MECHANIC", "\u2600", 0xFFFFEB3B));
        modCards.add(new ModCard("TNT Radius", "tnt_radius", "Visualizes TNT explosion range with wireframe.", "MECHANIC", "\u2622", 0xFFFF5722));
        modCards.add(new ModCard("Time Display", "time_display", "Shows real-world time and Minecraft day cycle.", "HUD", "\u231A", 0xFF00BCD4));
        modCards.add(new ModCard("Server Info", "server_info", "Displays current server address.", "SERVER", "\u2746", 0xFF009688));
        modCards.add(new ModCard("Item Counter", "item_counter", "Shows count of held item in inventory.", "HUD", "\u2116", 0xFF8BC34A));
        modCards.add(new ModCard("Hit Indicator", "hit_indicator", "Directional damage indicator when hit.", "NEW", "\u2726", 0xFFEF5350));
        modCards.add(new ModCard("Damage Indicator", "damage_indicator", "Shows damage indicator status.", "NEW", "\u2764", 0xFFE53935));
        modCards.add(new ModCard("Saturation Display", "saturation_display", "Displays saturation level.", "HUD", "\u2665", 0xFFFF9800));
        modCards.add(new ModCard("Light Level", "light_level", "Shows block and sky light levels.", "HUD", "\u2606", 0xFFFFEB3B));
        modCards.add(new ModCard("Chat Macros", "chat_macros", "Quick chat message shortcuts.", "NEW", "\u2709", 0xFF7C4DFF));
        modCards.add(new ModCard("Memory Usage", "memory_usage", "Shows real-world RAM usage and allocation details.", "HUD", "\uD83D\uDCBB", 0xFF00FFCC));
    }

    @Override
    protected void init() {
        this.clearChildren();
        loadProfilesList();
        
        // Sync activeProfile from loaded configs
        this.activeProfile = configStrings.getOrDefault("active_profile", "MarinMC");
        if (!profileList.contains(this.activeProfile)) {
            this.activeProfile = "MarinMC";
        }
        
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
        // 1. Draw 60% transparent backdrop
        context.fill(0, 0, this.width, this.height, 0x66000000);

        // 2. Define Card Dimensions (Centered Window) - Premium 760x460 dashboard
        int w = Math.min(this.width - 40, 760);
        int h = Math.min(this.height - 40, 460);
        int x = (this.width - w) / 2;
        int y = (this.height - h) / 2;

        // Glowing aqua neon outer border layers
        drawRoundedBorder(context, x - 2, y - 2, w + 4, h + 4, 0x0800FBFF, 15);
        drawRoundedBorder(context, x - 1, y - 1, w + 2, h + 2, 0x1800FBFF, 14);
        
        // Draw outer glassmorphic window panel - deep navy space bg
        drawRoundedRect(context, x, y, w, h, 0xEB03050C, 12);
        drawRoundedBorder(context, x, y, w, h, 0x3500FBFF, 12); // glowing neon active border

        // Aurora gradient top line (Cyan -> Violet neon strip)
        int auroraY = y + 1;
        int auroraH = 2;
        int segments = 8;
        int segW = (w - 24) / segments;
        int[] auroraColors = {0xFF00FBFF, 0xFF00D4FF, 0xFF3BA3FF, 0xFF7B6FFF, 0xFFA855F7, 0xFFD946EF, 0xFFA855F7, 0xFF7B6FFF};
        for (int s = 0; s < segments; s++) {
            context.fill(x + 12 + s * segW, auroraY, x + 12 + (s + 1) * segW, auroraY + auroraH, auroraColors[s]);
        }

        // Draw Moon Logo on Header
        int logoSize = 18;
        context.drawTexture(
            RenderPipelines.GUI_TEXTURED,
            LOGO_TEXTURE,
            x + 12, y + 7,
            0f, 0f,
            logoSize, logoSize,
            logoSize, logoSize
        );
        
        // Draw double rendered title for bold glow effect
        int mw = this.textRenderer.getWidth("MARIN");
        int brandX = x + 34;
        int brandY = y + 11;
        context.drawTextWithShadow(this.textRenderer, "MARIN", brandX + 1, brandY, 0x9055FFFF);
        context.drawTextWithShadow(this.textRenderer, "MC", brandX + mw + 1, brandY, 0x902D7DD2);
        context.drawTextWithShadow(this.textRenderer, "MARIN", brandX, brandY, 0xFF55FFFF);
        context.drawTextWithShadow(this.textRenderer, "MC", brandX + mw, brandY, 0xFF2D7DD2);

        // 3. Render Top Header Tabs (MODS, SETTINGS, WAYPOINTS) - Segmented track design
        String[] tabs = {"MODS", "SETTINGS", "WAYPOINTS"};
        String[] tabKeys = {"marinmc.tab.mods", "marinmc.tab.settings", "marinmc.tab.waypoints"};
        
        int trackW = 168;
        int trackH = 18;
        int trackX = x + w / 2 - trackW / 2;
        int trackY = y + 7;
        drawRoundedRect(context, trackX, trackY, trackW, trackH, 0x25000000, 6);
        drawRoundedBorder(context, trackX, trackY, trackW, trackH, 0x15FFFFFF, 6);

        for (int i = 0; i < tabs.length; i++) {
            String tab = tabs[i];
            String tabLabel = I18n.translate(tabKeys[i]);
            int tw = 54;
            int th = 14;
            int tx = trackX + 2 + i * 55;
            int ty = trackY + 2;
            boolean active = activeTab.equals(tab);
            
            if (active) {
                // Sliding active pill - glowing gradient look
                drawRoundedRect(context, tx, ty, tw, th, 0x6500FBFF, 5);
                drawRoundedBorder(context, tx, ty, tw, th, 0xFF00FBFF, 5);
            } else {
                boolean tabHov = mouseX >= tx && mouseX <= tx + tw && mouseY >= ty && mouseY <= ty + th;
                if (tabHov) {
                    drawRoundedRect(context, tx, ty, tw, th, 0x18FFFFFF, 5);
                    drawRoundedBorder(context, tx, ty, tw, th, 0x30FFFFFF, 5);
                }
            }
            
            int color = active ? 0xFFFFFFFF : 0xFF94A3B8;
            context.drawCenteredTextWithShadow(this.textRenderer, tabLabel, tx + tw / 2, ty + 3, color);
        }

        // Close X Button on Top Right
        int closeX = x + w - 18;
        int closeY = y + 9;
        boolean closeHovered = mouseX >= closeX - 2 && mouseX <= closeX + 10 && mouseY >= closeY - 2 && mouseY <= closeY + 10;
        drawRoundedRect(context, closeX - 3, closeY - 3, 14, 14, closeHovered ? 0x40EF4444 : 0x10FFFFFF, 7);
        drawRoundedBorder(context, closeX - 3, closeY - 3, 14, 14, closeHovered ? 0xAAEF4444 : 0x15FFFFFF, 7);
        context.drawTextWithShadow(this.textRenderer, "✖", closeX, closeY, closeHovered ? 0xFFEF4444 : 0xFF94A3B8);

        // 4. Render Sidebar (Left) - always visible - premium glass
        int sbX = x + 6;
        int sbY = y + 30;
        int sbW = 125;
        int sbH = h - 36;
        drawRoundedRect(context, sbX, sbY, sbW, sbH, 0x45040710, 8);
        drawRoundedBorder(context, sbX, sbY, sbW, sbH, 0x18FFFFFF, 8);

        // Vertical neon separator line between sidebar and content
        int sepX = sbX + sbW + 2;
        for (int dy = 0; dy < sbH - 8; dy++) {
            float progress = (float) dy / (sbH - 8);
            int alpha = (int)(20 + 25 * Math.sin(progress * Math.PI));
            context.fill(sepX, sbY + 4 + dy, sepX + 1, sbY + 5 + dy, (alpha << 24) | 0x00FBFF);
        }

        // i18n sidebar title
        context.drawTextWithShadow(this.textRenderer, I18n.translate("marinmc.sidebar.profiles"), sbX + 8, sbY + 8, 0xFF94A3B8);
        context.fill(sbX + 8, sbY + 18, sbX + sbW - 8, sbY + 19, 0x15FFFFFF);

        // (+) Add Profile button
        int addProfX = sbX + sbW - 14;
        int addProfY = sbY + 8;
        boolean addProfHovered = mouseX >= addProfX && mouseX <= addProfX + 10 && mouseY >= addProfY && mouseY <= addProfY + 16;
        context.drawTextWithShadow(this.textRenderer, "+", addProfX, addProfY, addProfHovered ? 0xFFFFD700 : 0xFF94A3B8);
        // Profiles list
        for (int i = 0; i < profileList.size(); i++) {
            String prof = profileList.get(i);
            int px = sbX + 6;
            int py = sbY + 22 + i * 22;
            int pw = sbW - 12;
            int ph = 18;
            boolean active = activeProfile.equals(prof);
            boolean rowHovered = mouseX >= px && mouseX <= px + pw && mouseY >= py && mouseY <= py + ph;
            
            if (active) {
                // Glow active profile card
                drawRoundedRect(context, px, py, pw, ph, 0x3000FBFF, 6);
                drawRoundedBorder(context, px, py, pw, ph, 0xFF00FBFF, 6);
                // Active indicator neon line on the left
                drawRoundedRect(context, px + 2, py + 3, 2, ph - 6, 0xFF00FBFF, 1);
            } else {
                drawRoundedRect(context, px, py, pw, ph, rowHovered ? 0x20FFFFFF : 0x0CFFFFFF, 6);
                drawRoundedBorder(context, px, py, pw, ph, rowHovered ? 0x35FFFFFF : 0x10FFFFFF, 6);
            }
            
            int color = active ? 0xFFFFFFFF : 0xFF94A3B8;
            // Draw profile name
            int nameOffsetX = (i > 0) ? -4 : 0;
            String displayProf = prof;
            // Gold star badge for MarinMC profile
            if (i == 0) {
                displayProf = "\u2605 " + prof;
                color = active ? 0xFFFFD700 : 0xFFDAA520;
            }
            context.drawCenteredTextWithShadow(this.textRenderer, displayProf, px + pw / 2 + nameOffsetX, py + 5, color);

            // Draw small X delete button for custom profiles on hover of row
            if (i > 0) {
                int delX = px + pw - 12;
                int delY = py + 4;
                boolean delHovered = mouseX >= delX && mouseX <= delX + 8 && mouseY >= delY && mouseY <= delY + 10;
                int delColor = delHovered ? 0xFFEF4444 : 0x35FFFFFF;
                if (rowHovered) {
                    context.drawTextWithShadow(this.textRenderer, "\u2716", delX, delY, delColor);
                }
            }
        }

        // Sidebar Bottom Pill Button: EDIT HUD - i18n, premium glass
        int hudX = sbX + 6;
        int hudY = sbY + sbH - 22;
        int hudW = sbW - 12;
        int hudH = 16;
        boolean hudHovered = mouseX >= hudX && mouseX <= hudX + hudW && mouseY >= hudY && mouseY <= hudY + hudH;
        drawRoundedRect(context, hudX, hudY, hudW, hudH, hudHovered ? 0x90BF5BFF : 0x502D7DD2, 6);
        drawRoundedBorder(context, hudX, hudY, hudW, hudH, hudHovered ? 0xFFBF5BFF : 0x602D7DD2, 6);
        context.drawCenteredTextWithShadow(this.textRenderer, I18n.translate("marinmc.sidebar.edithud"), hudX + hudW / 2, hudY + 4, 0xFFFFFFFF);

        // 5. Render Content Area (Right) based on active tab
        int contentX = x + 136;
        int contentY = y + 30;
        int contentW = w - 142;
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

        // Render profile add modal
        if (showProfileAdd) {
            renderProfileAddModal(context, mouseX, mouseY);
        }

        super.render(context, mouseX, mouseY, delta);
    }

    // ============================================================================
    // MODS TAB
    // ============================================================================
    private void renderModsTab(DrawContext context, int mouseX, int mouseY,
                                int contentX, int contentY, int contentW, int contentH, int windowH) {
        // Render Filter Pills (ALL, NEW, HUD, SERVER, MECHANIC) - Segmented track design
        String[] categories = {"ALL", "NEW", "HUD", "SERVER", "MECHANIC"};
        String[] catKeys = {"marinmc.category.all", "marinmc.category.new", "marinmc.category.hud", "marinmc.category.server", "marinmc.category.mechanic"};
        int catStartX = contentX + 4;
        for (int i = 0; i < categories.length; i++) {
            String cat = categories[i];
            String catLabel = I18n.translate(catKeys[i]);
            int cx = catStartX + i * 48;
            int cy = contentY + 6;
            int cw = 44;
            int ch = 14;
            boolean active = activeCategory.equals(cat);
            
            if (active) {
                drawRoundedRect(context, cx, cy, cw, ch, 0x752D7DD2, 5);
                drawRoundedBorder(context, cx, cy, cw, ch, 0xFF00FBFF, 5); // neon active border
            } else {
                boolean catHov = mouseX >= cx && mouseX <= cx + cw && mouseY >= cy && mouseY <= cy + ch;
                drawRoundedRect(context, cx, cy, cw, ch, catHov ? 0x25FFFFFF : 0x0EFFFFFF, 5);
                drawRoundedBorder(context, cx, cy, cw, ch, catHov ? 0x40FFFFFF : 0x0BFFFFFF, 5);
            }
            int color = active ? 0xFFFFFFFF : 0xFF94A3B8;
            context.drawCenteredTextWithShadow(this.textRenderer, catLabel, cx + cw / 2, cy + 3, color);
        }

        // Search Bar (Right of categories)
        int searchX = contentX + contentW - 90;
        int searchY = contentY + 5;
        int searchW = 85;
        int searchH = 14;
        drawRoundedRect(context, searchX, searchY, searchW, searchH, searchFocused ? 0xAA080B15 : 0x40080B15, 5);
        drawRoundedBorder(context, searchX, searchY, searchW, searchH, searchFocused ? 0xFF00FBFF : 0x15FFFFFF, 5);
        String searchPlaceholder = I18n.translate("marinmc.menu.search");
        String displayText = searchQuery.isEmpty() ? (searchFocused ? "" : searchPlaceholder) : searchQuery;
        int displayColor = searchQuery.isEmpty() && !searchFocused ? 0xFF64748B : 0xFFFFFFFF;
        context.drawTextWithShadow(this.textRenderer, displayText, searchX + 5, searchY + 3, displayColor);

        // Draw Mod Cards 2-Column Grid
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

        int colWidth = (gridW - 8) / 2;
        int cardHeight = 60;
        int spacing = 6;

        for (int i = 0; i < filtered.size(); i++) {
            ModCard mod = filtered.get(i);
            int col = i % 2;
            int row = i / 2;
            int cx = gridX + col * (colWidth + spacing);
            int cy = gridY + row * (cardHeight + spacing) - scrollOffset;

            // Render Card - premium glass design
            boolean isEnabled = configStates.getOrDefault(mod.id, false);
            boolean cardHovered = mouseX >= cx && mouseX <= cx + colWidth && mouseY >= cy && mouseY <= cy + cardHeight;
            
            // Premium Card Fill with gradient layers & Borders
            int cardBgTop = cardHovered ? 0x90121A30 : 0x65121A30;
            int cardBgBot = cardHovered ? 0x850E1428 : 0x550E1428;
            int cardBorder = isEnabled ? 0x6500FBFF : (cardHovered ? 0x30FFFFFF : 0x12FFFFFF);
            
            // Two-tone gradient effect: top half lighter, bottom half darker
            drawRoundedRect(context, cx, cy, colWidth, cardHeight / 2, cardBgTop, 8);
            drawRoundedRect(context, cx, cy + cardHeight / 2, colWidth, cardHeight / 2, cardBgBot, 8);
            drawRoundedRect(context, cx, cy, colWidth, cardHeight, 0x00000000, 8); // blend
            drawRoundedBorder(context, cx, cy, colWidth, cardHeight, cardBorder, 8);
            
            // Subtle enabled glow effect
            if (isEnabled) {
                drawRoundedRect(context, cx + 1, cy + 1, colWidth - 2, cardHeight - 2, 0x0800FBFF, 7);
            }

            // Left category icon circle with neon accents
            int iconSize = 22;
            int iconX = cx + 6;
            int iconY = cy + (cardHeight - iconSize) / 2;
            drawRoundedRect(context, iconX, iconY, iconSize, iconSize, mod.iconBgColor | 0xFF000000, 11);
            drawRoundedBorder(context, iconX - 1, iconY - 1, iconSize + 2, iconSize + 2, 0x30FFFFFF, 12);
            context.drawCenteredTextWithShadow(this.textRenderer, mod.icon, iconX + iconSize / 2, iconY + 7, 0xFFFFFFFF);

            // Text layout - Title and Description
            int textStartX = cx + 34;
            String modNameKey = "marinmc.mod." + mod.id + ".name";
            String translatedName = I18n.translate(modNameKey);
            String displayName = translatedName.equals(modNameKey) ? mod.name : translatedName;
            String trimmedName = this.textRenderer.trimToWidth(displayName, colWidth - 85).toString();
            context.drawTextWithShadow(this.textRenderer, trimmedName, textStartX, cy + 9, 0xFFFFFFFF);
            
            String modDescKey = "marinmc.mod." + mod.id + ".desc";
            String translatedDesc = I18n.translate(modDescKey);
            String displayDesc = translatedDesc.equals(modDescKey) ? mod.description : translatedDesc;
            String trimmedDesc = this.textRenderer.trimToWidth(displayDesc, colWidth - 85).toString();
            context.drawTextWithShadow(this.textRenderer, trimmedDesc, textStartX, cy + 21, 0xFF94A3B8);

            // Options Gear button on the right
            int gearX = cx + colWidth - 48;
            int gearY = cy + (cardHeight - 12) / 2;
            boolean gearHovered = mouseX >= gearX && mouseX <= gearX + 12 && mouseY >= gearY && mouseY <= gearY + 12;
            context.drawTextWithShadow(this.textRenderer, "⚙", gearX, gearY, gearHovered ? 0xFFFFD700 : 0xFF64748B);

            // iOS-style Toggle Switch on the far right
            int toggleX = cx + colWidth - 32;
            int toggleY = cy + (cardHeight - 12) / 2;
            int toggleW = 24;
            int toggleH = 12;
            
            // Switch Track (modern iOS-style glow)
            int trackColor = isEnabled ? 0xFF0ECB81 : 0xFF334155;
            drawRoundedRect(context, toggleX, toggleY, toggleW, toggleH, trackColor, 6);
            drawRoundedBorder(context, toggleX, toggleY, toggleW, toggleH, isEnabled ? 0xFF10DBA0 : 0x20FFFFFF, 6);
            if (isEnabled) {
                // Subtle glow around active toggle
                drawRoundedRect(context, toggleX - 1, toggleY - 1, toggleW + 2, toggleH + 2, 0x150ECB81, 7);
            }
            
            // Switch Knob
            int knobSize = 8;
            int knobX = isEnabled ? toggleX + toggleW - knobSize - 2 : toggleX + 2;
            drawRoundedRect(context, knobX, toggleY + 2, knobSize, knobSize, 0xFFFFFFFF, 4);
        }

        context.disableScissor();

        // Draw Scrollbar
        int totalRows = (filtered.size() + 1) / 2;
        int totalHeight = totalRows * (cardHeight + spacing) - spacing;
        int maxScroll = Math.max(0, totalHeight - gridH);
        if (maxScroll > 0) {
            int scrollbarW = 3;
            int scrollbarX = contentX + contentW - scrollbarW - 2;
            int scrollbarY = gridY;
            int scrollbarH = gridH;
            
            drawRoundedRect(context, scrollbarX, scrollbarY, scrollbarW, scrollbarH, 0x10FFFFFF, 1);
            int thumbH = Math.max(15, (scrollbarH * scrollbarH) / totalHeight);
            int thumbY = scrollbarY + (scrollOffset * (scrollbarH - thumbH)) / maxScroll;
            drawRoundedRect(context, scrollbarX, thumbY, scrollbarW, thumbH, 0x6500FBFF, 1);
        }
    }

    // ============================================================================
    // SETTINGS TAB 
    // ============================================================================
    private void renderSettingsTab(DrawContext context, int mouseX, int mouseY,
                                    int contentX, int contentY, int contentW, int contentH) {
        // Sub-tabs: GENERAL, PERFORMANCE, CONTROLS - Segmented track design
        String[] subTabs = {"GENERAL", "PERFORMANCE", "CONTROLS"};
        String[] subTabKeys = {"marinmc.settings.general", "marinmc.settings.performance", "marinmc.settings.controls"};
        
        int trackW = 210;
        int trackH = 18;
        int trackX = contentX + 6;
        int trackY = contentY + 6;
        drawRoundedRect(context, trackX, trackY, trackW, trackH, 0x25000000, 6);
        drawRoundedBorder(context, trackX, trackY, trackW, trackH, 0x15FFFFFF, 6);

        for (int i = 0; i < subTabs.length; i++) {
            String st = subTabs[i];
            String stLabel = I18n.translate(subTabKeys[i]);
            int sw = 66;
            int sh = 14;
            int sx = trackX + 2 + i * 69;
            int sy = trackY + 2;
            boolean active = settingsSubTab.equals(st);
            
            if (active) {
                drawRoundedRect(context, sx, sy, sw, sh, 0x6500FBFF, 5);
                drawRoundedBorder(context, sx, sy, sw, sh, 0xFF00FBFF, 5);
            } else {
                boolean stHov = mouseX >= sx && mouseX <= sx + sw && mouseY >= sy && mouseY <= sy + sh;
                if (stHov) {
                    drawRoundedRect(context, sx, sy, sw, sh, 0x18FFFFFF, 5);
                    drawRoundedBorder(context, sx, sy, sw, sh, 0x30FFFFFF, 5);
                }
            }
            int color = active ? 0xFFFFFFFF : 0xFF94A3B8;
            context.drawCenteredTextWithShadow(this.textRenderer, stLabel, sx + sw / 2, sy + 3, color);
        }

        // Settings content area
        int listX = contentX + 6;
        int listY = contentY + 28;
        int listW = contentW - 12;
        int listH = contentH - 34;

        context.enableScissor(listX, listY, listX + listW, listY + listH);

        List<SettingEntry> settings = getSettingsForSubTab(settingsSubTab);
        int rowHeight = 26;
        for (int i = 0; i < settings.size(); i++) {
            SettingEntry entry = settings.get(i);
            int ry = listY + i * rowHeight - scrollOffset;

            // Row background - subtle glass card on hover
            boolean rowHovered = mouseX >= listX && mouseX <= listX + listW && mouseY >= ry && mouseY <= ry + rowHeight;
            boolean inViewport = mouseY >= listY && mouseY <= listY + listH;
            
            int rowBg = (i % 2 == 0) ? 0x08FFFFFF : 0x00000000;
            if (rowHovered && inViewport) {
                rowBg = 0x18FFFFFF;
            }
            drawRoundedRect(context, listX, ry, listW, rowHeight - 2, rowBg, 4);

            // Label
            context.drawTextWithShadow(this.textRenderer, I18n.translate("marinmc.setting.name." + entry.configKey), listX + 8, ry + 7, 0xFFE2E8F0);

            // Toggle switch on the right (compact iOS style)
            int toggleW = 24;
            int toggleH = 12;
            int toggleX = listX + listW - toggleW - 8;
            int toggleY = ry + (rowHeight - toggleH) / 2 - 1;
            boolean isOn = configStates.getOrDefault(entry.configKey, false);
            
            int trackColor = isOn ? 0xFF0ECB81 : 0xFF334155;
            drawRoundedRect(context, toggleX, toggleY, toggleW, toggleH, trackColor, 6);
            drawRoundedBorder(context, toggleX, toggleY, toggleW, toggleH, isOn ? 0xFF10DBA0 : 0x20FFFFFF, 6);
            if (isOn) {
                drawRoundedRect(context, toggleX - 1, toggleY - 1, toggleW + 2, toggleH + 2, 0x150ECB81, 7);
            }
            
            int knobSize = 8;
            int knobX = isOn ? toggleX + toggleW - knobSize - 2 : toggleX + 2;
            drawRoundedRect(context, knobX, toggleY + 2, knobSize, knobSize, 0xFFFFFFFF, 4);
        }

        context.disableScissor();

        // Draw Scrollbar
        int totalHeight = settings.size() * rowHeight;
        int maxScroll = Math.max(0, totalHeight - listH);
        if (maxScroll > 0) {
            int scrollbarW = 3;
            int scrollbarX = contentX + contentW - scrollbarW - 2;
            int scrollbarY = listY;
            int scrollbarH = listH;
            
            drawRoundedRect(context, scrollbarX, scrollbarY, scrollbarW, scrollbarH, 0x10FFFFFF, 1);
            int thumbH = Math.max(15, (scrollbarH * scrollbarH) / totalHeight);
            int thumbY = scrollbarY + (scrollOffset * (scrollbarH - thumbH)) / maxScroll;
            drawRoundedRect(context, scrollbarX, thumbY, scrollbarW, thumbH, 0x6500FBFF, 1);
        }
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
        // Title - i18n
        context.drawTextWithShadow(this.textRenderer, I18n.translate("marinmc.tab.waypoints"), contentX + 8, contentY + 8, 0xFFE2E8F0);

        // Add Waypoint button - premium capsule
        int addBtnW = 54;
        int addBtnH = 14;
        int addBtnX = contentX + contentW - addBtnW - 8;
        int addBtnY = contentY + 6;
        boolean addHovered = mouseX >= addBtnX && mouseX <= addBtnX + addBtnW && mouseY >= addBtnY && mouseY <= addBtnY + addBtnH;
        
        drawRoundedRect(context, addBtnX, addBtnY, addBtnW, addBtnH, addHovered ? 0x8010B981 : 0x4510B981, 5);
        drawRoundedBorder(context, addBtnX, addBtnY, addBtnW, addBtnH, addHovered ? 0xFF10B981 : 0x7010B981, 5);
        context.drawCenteredTextWithShadow(this.textRenderer, "+ ADD", addBtnX + addBtnW / 2, addBtnY + 3, 0xFFFFFFFF);

        // Waypoint list
        int listX = contentX + 6;
        int listY = contentY + 28;
        int listW = contentW - 12;
        int listH = contentH - 34;

        context.enableScissor(listX, listY, listX + listW, listY + listH);

        if (waypoints.isEmpty()) {
            context.drawCenteredTextWithShadow(this.textRenderer, I18n.translate("marinmc.waypoint.no_waypoints"), listX + listW / 2, listY + listH / 2 - 4, 0xFF64748B);
            context.drawCenteredTextWithShadow(this.textRenderer, I18n.translate("marinmc.waypoint.click_add"), listX + listW / 2, listY + listH / 2 + 8, 0xFF475569);
        } else {
            int rowH = 26;
            for (int i = 0; i < waypoints.size(); i++) {
                Waypoint wp = waypoints.get(i);
                int ry = listY + i * rowH - scrollOffset;

                // Row background
                boolean rowHovered = mouseX >= listX && mouseX <= listX + listW && mouseY >= ry && mouseY <= ry + rowH;
                boolean inViewport = mouseY >= listY && mouseY <= listY + listH;
                
                int rowBg = (i % 2 == 0) ? 0x08FFFFFF : 0x00000000;
                if (rowHovered && inViewport) {
                    rowBg = 0x18FFFFFF;
                }
                drawRoundedRect(context, listX, ry, listW, rowH - 2, rowBg, 5);

                // Color dot
                int dotColor = getWaypointColor(wp.color);
                context.fill(listX + 8, ry + 8, listX + 13, ry + 13, dotColor);

                // Name
                context.drawTextWithShadow(this.textRenderer, wp.name, listX + 18, ry + 4, 0xFFFFFFFF);

                // Coordinates
                String coordsStr = String.format("X: %d  Y: %d  Z: %d", wp.x, wp.y, wp.z);
                context.drawTextWithShadow(this.textRenderer, coordsStr, listX + 18, ry + 14, 0xFF8E9AA8);

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
                    context.drawTextWithShadow(this.textRenderer, distStr, listX + listW - distW - 28, ry + 9, 0xFF8E9AA8);
                }

                // Delete button (X) on hover
                if (rowHovered && inViewport) {
                    int delX = listX + listW - 16;
                    int delY = ry + 8;
                    boolean delHovered = mouseX >= delX && mouseX <= delX + 12 && mouseY >= delY && mouseY <= delY + 10;
                    context.drawTextWithShadow(this.textRenderer, "✖", delX, delY, delHovered ? 0xFFEF4444 : 0x50FFFFFF);
                }
            }
        }

        context.disableScissor();

        // Draw Scrollbar
        int totalHeight = waypoints.size() * 26;
        int maxScroll = Math.max(0, totalHeight - listH);
        if (maxScroll > 0) {
            int scrollbarW = 3;
            int scrollbarX = contentX + contentW - scrollbarW - 2;
            int scrollbarY = listY;
            int scrollbarH = listH;
            
            drawRoundedRect(context, scrollbarX, scrollbarY, scrollbarW, scrollbarH, 0x10FFFFFF, 1);
            int thumbH = Math.max(15, (scrollbarH * scrollbarH) / totalHeight);
            int thumbY = scrollbarY + (scrollOffset * (scrollbarH - thumbH)) / maxScroll;
            drawRoundedRect(context, scrollbarX, thumbY, scrollbarW, thumbH, 0x6500FBFF, 1);
        }
    }

    private int getWaypointColor(String color) {
        switch (color.toLowerCase()) {
            case "red": return 0xFFEF4444;
            case "blue": return 0xFF3B82F6;
            case "yellow": return 0xFFFFC107;
            case "purple": return 0xFFA78BFA;
            case "orange": return 0xFFF97316;
            case "white": return 0xFFFFFFFF;
            default: return 0xFF10B981; // green default
        }
    }

    // ============================================================================
    // MOD DETAIL POPUP
    // ============================================================================
    private void renderModDetailPopup(DrawContext context, int mouseX, int mouseY) {
        // Dark overlay behind popup
        context.fill(0, 0, this.width, this.height, 0xAA000000);

        int pw = 300;
        int ph = 210;
        int px = (this.width - pw) / 2;
        int py = (this.height - ph) / 2;

        // Popup background - premium navy blue glass
        drawRoundedRect(context, px, py, pw, ph, 0xFB080B15, 10);
        drawRoundedBorder(context, px, py, pw, ph, 0x4000FBFF, 10); // neon active border

        // Header - dark glass
        drawRoundedRect(context, px + 1, py + 1, pw - 2, 22, 0x30FFFFFF, 9);
        
        // Icon
        int iconX = px + 8;
        int iconY = py + 5;
        drawRoundedRect(context, iconX, iconY, 12, 12, detailMod.iconBgColor | 0xFF000000, 4);
        context.drawCenteredTextWithShadow(this.textRenderer, detailMod.icon, px + 14, py + 7, 0xFFFFFFFF);
        
        // Title - i18n
        String modNameKey = "marinmc.mod." + detailMod.id + ".name";
        String translatedModName = I18n.translate(modNameKey);
        String displayModName = translatedModName.equals(modNameKey) ? detailMod.name : translatedModName;
        String settingsTitle = displayModName + " " + I18n.translate("marinmc.tab.settings");
        context.drawTextWithShadow(this.textRenderer, settingsTitle, px + 24, py + 7, 0xFFFFFFFF);

        // Close button
        int clX = px + pw - 15;
        int clY = py + 6;
        boolean clHov = mouseX >= clX && mouseX <= clX + 10 && mouseY >= clY && mouseY <= clY + 10;
        context.drawTextWithShadow(this.textRenderer, "✖", clX, clY, clHov ? 0xFFEF4444 : 0xFFA1A1AA);

        // Description - i18n
        String modDescKey = "marinmc.mod." + detailMod.id + ".desc";
        String translatedDesc = I18n.translate(modDescKey);
        String displayDesc = translatedDesc.equals(modDescKey) ? detailMod.description : translatedDesc;
        context.drawTextWithShadow(this.textRenderer, displayDesc, px + 10, py + 28, 0xFF8E9AA8);

        // Status toggle (large) - glass style
        boolean isEnabled = configStates.getOrDefault(detailMod.id, false);
        int tbX = px + 10;
        int tbY = py + 42;
        int tbW = pw - 20;
        int tbH = 16;
        boolean tbHov = mouseX >= tbX && mouseX <= tbX + tbW && mouseY >= tbY && mouseY <= tbY + tbH;
        String enabledText = I18n.translate("marinmc.menu.enabled");
        String disabledText = I18n.translate("marinmc.menu.disabled");
        
        int tbColor = isEnabled ? (tbHov ? 0x8010B981 : 0x5010B981) : (tbHov ? 0x80EF4444 : 0x50EF4444);
        drawRoundedRect(context, tbX, tbY, tbW, tbH, tbColor, 6);
        drawRoundedBorder(context, tbX, tbY, tbW, tbH, isEnabled ? 0xFF10B981 : 0xFFEF4444, 6);
        context.drawCenteredTextWithShadow(this.textRenderer, isEnabled ? enabledText : disabledText, tbX + tbW / 2, tbY + 4, 0xFFFFFFFF);

        // Settings: Customization options specific to HUD elements
        HudElement hudEl = null;
        for (HudElement el : HudManager.getInstance().getElements()) {
            if (el.getId().equals(detailMod.id)) {
                hudEl = el;
                break;
            }
        }

        int settingsY = py + 66;

        if (hudEl != null) {
            // Scale slider
            context.drawTextWithShadow(this.textRenderer, I18n.translate("marinmc.setting.scale"), px + 10, settingsY, 0xFFE2E8F0);
            float scale = hudEl.getScale();
            int sliderX = px + 70;
            int sliderW = pw - 110;
            int sliderY = settingsY + 2;
            int filled = (int) ((scale - 0.5f) / 2.0f * sliderW);
            
            // Slider Rounded Track
            drawRoundedRect(context, sliderX, sliderY + 2, sliderW, 4, 0xFF334155, 2);
            drawRoundedRect(context, sliderX, sliderY + 2, Math.min(filled, sliderW), 4, 0xFF00FBFF, 2);
            // Slider Circular Knob
            int knobX = sliderX + Math.min(filled, sliderW) - 3;
            drawRoundedRect(context, knobX, sliderY, 6, 6, 0xFFFFFFFF, 3);

            String scaleText = String.format("%.1fx", scale);
            context.drawTextWithShadow(this.textRenderer, scaleText, sliderX + sliderW + 6, settingsY, 0xFFA1A1AA);
            settingsY += 18;

            // Color theme selector
            context.drawTextWithShadow(this.textRenderer, I18n.translate("marinmc.setting.color_theme"), px + 10, settingsY, 0xFFE2E8F0);
            String[] themes = {"white", "red", "green", "blue", "purple", "orange"};
            int[] themeColors = {0xFFFFFFFF, 0xFFEF4444, 0xFF10B981, 0xFF3B82F6, 0xFFA78BFA, 0xFFF97316};
            for (int i = 0; i < themes.length; i++) {
                int tx = px + 80 + i * 20;
                int ty = settingsY - 1;
                boolean isActive = hudEl.getColorTheme().equalsIgnoreCase(themes[i]);
                drawRoundedRect(context, tx, ty, 14, 10, themeColors[i], 3);
                if (isActive) {
                    drawRoundedBorder(context, tx - 1, ty - 1, 16, 12, 0xFF00FBFF, 4);
                }
            }
            settingsY += 18;

            // Background opacity slider
            context.drawTextWithShadow(this.textRenderer, I18n.translate("marinmc.setting.bg_opacity"), px + 10, settingsY, 0xFFE2E8F0);
            int opacity = hudEl.getBgOpacity();
            int opSliderX = px + 95;
            int opSliderW = pw - 140;
            int opFilled = (int) ((float) opacity / 255f * opSliderW);
            
            // Slider Rounded Track
            drawRoundedRect(context, opSliderX, settingsY + 4, opSliderW, 4, 0xFF334155, 2);
            drawRoundedRect(context, opSliderX, settingsY + 4, Math.min(opFilled, opSliderW), 4, 0xFF00FBFF, 2);
            // Slider Circular Knob
            int opKnobX = opSliderX + Math.min(opFilled, opSliderW) - 3;
            drawRoundedRect(context, opKnobX, settingsY + 2, 6, 6, 0xFFFFFFFF, 3);

            String opText = String.format("%d%%", (int)((float) opacity / 255f * 100));
            context.drawTextWithShadow(this.textRenderer, opText, opSliderX + opSliderW + 6, settingsY, 0xFFA1A1AA);
            settingsY += 18;

            // Text shadow toggle
            context.drawTextWithShadow(this.textRenderer, I18n.translate("marinmc.setting.text_shadow"), px + 10, settingsY, 0xFFE2E8F0);
            boolean shadow = configStates.getOrDefault(detailMod.id + "_shadow", true);
            int swW = 20;
            int swH = 10;
            int swX = px + pw - swW - 12;
            int swY = settingsY;
            
            // Switch track
            drawRoundedRect(context, swX, swY, swW, swH, shadow ? 0xFF00FBFF : 0xFF334155, 5);
            // Switch knob
            int knobX2 = shadow ? swX + swW - 8 : swX + 2;
            drawRoundedRect(context, knobX2, swY + 1, 6, 6, 0xFFFFFFFF, 3);
            settingsY += 18;

            // Bracket type selector
            context.drawTextWithShadow(this.textRenderer, I18n.translate("marinmc.setting.bracket_type"), px + 10, settingsY, 0xFFE2E8F0);
            String[] brackets = {"[%s]", "(%s)", "<%s>", "{%s}", "| %s |", "- %s -"};
            String[] bracketLabels = {"[ ]", "( )", "< >", "{ }", "| |", "- -"};
            String currentBracket = configStrings.getOrDefault(detailMod.id + "_bracket", "[%s]");
            for (int i = 0; i < brackets.length; i++) {
                int bx = px + 80 + i * 24;
                int by = settingsY - 1;
                boolean bActive = currentBracket.equals(brackets[i]);
                drawRoundedRect(context, bx, by, 20, 10, bActive ? 0x6500FBFF : 0x15FFFFFF, 4);
                drawRoundedBorder(context, bx, by, 20, 10, bActive ? 0xFF00FBFF : 0x15FFFFFF, 4);
                context.drawCenteredTextWithShadow(this.textRenderer, bracketLabels[i], bx + 10, by + 1, bActive ? 0xFFFFFFFF : 0xFF94A3B8);
            }
        } else {
            // Non-HUD mod: show simple description
            context.drawTextWithShadow(this.textRenderer, I18n.translate("marinmc.setting.category") + ": " + detailMod.category, px + 10, settingsY, 0xFF94A3B8);
            settingsY += 14;

            // Show relevant config toggles for this mod
            if (detailMod.id.equals("freelook")) {
                context.drawTextWithShadow(this.textRenderer, I18n.translate("marinmc.setting.perspective"), px + 10, settingsY, 0xFFE2E8F0);
                String[] perspectives = {"third_back", "third_front", "first"};
                String[] perspLabels = {
                    I18n.translate("marinmc.setting.perspective.3rd_back"),
                    I18n.translate("marinmc.setting.perspective.3rd_front"),
                    I18n.translate("marinmc.setting.perspective.1st")
                };
                String current = configStrings.getOrDefault("freelook_perspective", "third_back");
                for (int i = 0; i < perspectives.length; i++) {
                    int bx = px + 80 + i * 50;
                    int by = settingsY - 1;
                    boolean bActive = current.equals(perspectives[i]);
                    drawRoundedRect(context, bx, by, 46, 10, bActive ? 0x6500FBFF : 0x15FFFFFF, 4);
                    drawRoundedBorder(context, bx, by, 46, 10, bActive ? 0xFF00FBFF : 0x15FFFFFF, 4);
                    context.drawCenteredTextWithShadow(this.textRenderer, perspLabels[i], bx + 23, by + 1, bActive ? 0xFFFFFFFF : 0xFF94A3B8);
                }
                settingsY += 18;

                // Invert Y toggle
                context.drawTextWithShadow(this.textRenderer, I18n.translate("marinmc.setting.invert_y"), px + 10, settingsY, 0xFFE2E8F0);
                boolean invertY = configStates.getOrDefault("freelook_invert_y", false);
                int swW = 20;
                int swH = 10;
                int swX = px + pw - swW - 12;
                int swY = settingsY;
                
                // Track
                drawRoundedRect(context, swX, swY, swW, swH, invertY ? 0xFF00FBFF : 0xFF334155, 5);
                // Knob
                int knobX2 = invertY ? swX + swW - 8 : swX + 2;
                drawRoundedRect(context, knobX2, swY + 1, 6, 6, 0xFFFFFFFF, 3);
            } else if (detailMod.id.equals("block_outline")) {
                context.drawTextWithShadow(this.textRenderer, I18n.translate("marinmc.setting.outline_color"), px + 10, settingsY, 0xFFE2E8F0);
                String[] colors = {"gold", "red", "green", "blue", "orange", "white"};
                int[] colorVals = {0xFFFFD700, 0xFFEF4444, 0xFF10B981, 0xFF3B82F6, 0xFFF97316, 0xFFFFFFFF};
                String current = configStrings.getOrDefault("outline_color", "gold");
                for (int i = 0; i < colors.length; i++) {
                    int tx = px + 80 + i * 20;
                    int ty = settingsY - 1;
                    boolean cActive = current.equalsIgnoreCase(colors[i]);
                    drawRoundedRect(context, tx, ty, 14, 10, colorVals[i], 3);
                    if (cActive) {
                        drawRoundedBorder(context, tx - 1, ty - 1, 16, 12, 0xFF00FBFF, 4);
                    }
                }
            }
        }
    }

    // ============================================================================
    // WAYPOINT ADD MODAL
    // ============================================================================
    private void renderWaypointAddModal(DrawContext context, int mouseX, int mouseY) {
        context.fill(0, 0, this.width, this.height, 0xAA000000);

        int pw = 220;
        int ph = 140;
        int px = (this.width - pw) / 2;
        int py = (this.height - ph) / 2;

        drawRoundedRect(context, px, py, pw, ph, 0xFB080B15, 10);
        drawRoundedBorder(context, px, py, pw, ph, 0x4000FBFF, 10);

        // Header
        context.drawTextWithShadow(this.textRenderer, I18n.translate("marinmc.waypoint.add"), px + 10, py + 8, 0xFFFFFFFF);
        
        // Close button
        int clX = px + pw - 15;
        int clY = py + 7;
        boolean clHov = mouseX >= clX && mouseX <= clX + 10 && mouseY >= clY && mouseY <= clY + 10;
        context.drawTextWithShadow(this.textRenderer, "✖", clX, clY, clHov ? 0xFFEF4444 : 0xFFA1A1AA);

        // Name field
        context.drawTextWithShadow(this.textRenderer, I18n.translate("marinmc.waypoint.name"), px + 10, py + 30, 0xFFE2E8F0);
        int nameFieldX = px + 50;
        int nameFieldY = py + 27;
        int nameFieldW = pw - 60;
        int nameFieldH = 14;
        context.fill(nameFieldX, nameFieldY, nameFieldX + nameFieldW, nameFieldY + nameFieldH, wpNameFocused ? 0x90080B15 : 0x40080B15);
        context.drawBorder(nameFieldX, nameFieldY, nameFieldW, nameFieldH, wpNameFocused ? 0xFF00FBFF : 0x20FFFFFF);
        String nameDisplay = wpName.isEmpty() ? (wpNameFocused ? "" : I18n.translate("marinmc.waypoint.enter_name")) : wpName;
        int nameColor = wpName.isEmpty() && !wpNameFocused ? 0xFF64748B : 0xFFFFFFFF;
        context.drawTextWithShadow(this.textRenderer, nameDisplay, nameFieldX + 4, nameFieldY + 3, nameColor);

        // Color selector
        context.drawTextWithShadow(this.textRenderer, I18n.translate("marinmc.waypoint.color"), px + 10, py + 52, 0xFFE2E8F0);
        String[] colors = {"green", "red", "blue", "yellow", "purple", "orange"};
        int[] colorVals = {0xFF10B981, 0xFFEF4444, 0xFF3B82F6, 0xFFFFC107, 0xFFA78BFA, 0xFFF97316};
        for (int i = 0; i < colors.length; i++) {
            int cx = px + 50 + i * 20;
            int cy = py + 50;
            boolean cActive = wpColor.equalsIgnoreCase(colors[i]);
            drawRoundedRect(context, cx, cy, 14, 10, colorVals[i], 3);
            if (cActive) {
                drawRoundedBorder(context, cx - 1, cy - 1, 16, 12, 0xFF00FBFF, 4);
            }
        }

        // Current position display
        net.minecraft.client.MinecraftClient mc = net.minecraft.client.MinecraftClient.getInstance();
        String posStr = I18n.translate("marinmc.waypoint.current_position");
        if (mc.player != null) {
            posStr = String.format("X: %d  Y: %d  Z: %d", (int) mc.player.getX(), (int) mc.player.getY(), (int) mc.player.getZ());
        }
        context.drawTextWithShadow(this.textRenderer, posStr, px + 10, py + 72, 0xFF8E9AA8);

        // Confirm button
        int confirmX = px + 10;
        int confirmY = py + ph - 26;
        int confirmW = pw - 20;
        int confirmH = 16;
        boolean confirmHov = mouseX >= confirmX && mouseX <= confirmX + confirmW && mouseY >= confirmY && mouseY <= confirmY + confirmH;
        drawRoundedRect(context, confirmX, confirmY, confirmW, confirmH, confirmHov ? 0x9010B981 : 0x5010B981, 6);
        drawRoundedBorder(context, confirmX, confirmY, confirmW, confirmH, confirmHov ? 0xFF10B981 : 0x4010B981, 6);
        context.drawCenteredTextWithShadow(this.textRenderer, "ADD WAYPOINT", confirmX + confirmW / 2, confirmY + 4, 0xFFFFFFFF);
    }

    // ============================================================================
    // PROFILE ADD MODAL
    // ============================================================================
    private void renderProfileAddModal(DrawContext context, int mouseX, int mouseY) {
        context.fill(0, 0, this.width, this.height, 0xAA000000);

        int pw = 200;
        int ph = 90;
        int px = (this.width - pw) / 2;
        int py = (this.height - ph) / 2;

        // Glass-style profile add panel
        drawRoundedRect(context, px, py, pw, ph, 0xFB080B15, 10);
        drawRoundedBorder(context, px, py, pw, ph, 0x4000FBFF, 10);

        // Header - i18n
        context.drawTextWithShadow(this.textRenderer, I18n.translate("marinmc.profile.add_title"), px + 10, py + 8, 0xFFFFFFFF);
        
        // Close button
        int clX = px + pw - 15;
        int clY = py + 7;
        boolean clHov = mouseX >= clX && mouseX <= clX + 10 && mouseY >= clY && mouseY <= clY + 10;
        context.drawTextWithShadow(this.textRenderer, "✖", clX, clY, clHov ? 0xFFEF4444 : 0xFFA1A1AA);

        // Input field for profile name
        int nameFieldX = px + 10;
        int nameFieldY = py + 27;
        int nameFieldW = pw - 20;
        int nameFieldH = 16;
        context.fill(nameFieldX, nameFieldY, nameFieldX + nameFieldW, nameFieldY + nameFieldH, profileNameFocused ? 0x90080B15 : 0x40080B15);
        context.drawBorder(nameFieldX, nameFieldY, nameFieldW, nameFieldH, profileNameFocused ? 0xFF00FBFF : 0x20FFFFFF);
        String nameDisplay = newProfileName.isEmpty() ? (profileNameFocused ? "" : I18n.translate("marinmc.profile.add_placeholder")) : newProfileName;
        int nameColor = newProfileName.isEmpty() && !profileNameFocused ? 0xFF64748B : 0xFFFFFFFF;
        context.drawTextWithShadow(this.textRenderer, nameDisplay, nameFieldX + 6, nameFieldY + 4, nameColor);

        // Confirm button
        int confirmX = px + 10;
        int confirmY = py + ph - 24;
        int confirmW = pw - 20;
        int confirmH = 14;
        boolean confirmHov = mouseX >= confirmX && mouseX <= confirmX + confirmW && mouseY >= confirmY && mouseY <= confirmY + confirmH;
        drawRoundedRect(context, confirmX, confirmY, confirmW, confirmH, confirmHov ? 0x9000FBFF : 0x5000FBFF, 5);
        drawRoundedBorder(context, confirmX, confirmY, confirmW, confirmH, confirmHov ? 0xFF00FBFF : 0x4000FBFF, 5);
        context.drawCenteredTextWithShadow(this.textRenderer, I18n.translate("marinmc.profile.add_btn"), confirmX + confirmW / 2, confirmY + 3, 0xFFFFFFFF);
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

        int w = Math.min(this.width - 40, 760);
        int h = Math.min(this.height - 40, 460);
        int contentH = h - 36;
        
        int maxScroll = 0;
        if ("MODS".equals(activeTab)) {
            List<ModCard> filtered = new ArrayList<>();
            for (ModCard mod : modCards) {
                boolean matchesCat = activeCategory.equals("ALL") || mod.category.equalsIgnoreCase(activeCategory);
                boolean matchesSearch = searchQuery.isEmpty() || mod.name.toLowerCase().contains(searchQuery.toLowerCase());
                if (matchesCat && matchesSearch) filtered.add(mod);
            }
            int totalRows = (filtered.size() + 1) / 2;
            maxScroll = Math.max(0, totalRows * 66 - 6 - (contentH - 30));
        } else if ("SETTINGS".equals(activeTab)) {
            List<SettingEntry> settings = getSettingsForSubTab(settingsSubTab);
            maxScroll = Math.max(0, settings.size() * 26 - (contentH - 34));
        } else if ("WAYPOINTS".equals(activeTab)) {
            maxScroll = Math.max(0, waypoints.size() * 26 - (contentH - 34));
        }

        scrollOffset = Math.max(0, Math.min(maxScroll, scrollOffset - (int)(verticalAmount * 16)));
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

        // Handle profile add modal clicks
        if (showProfileAdd) {
            return handleProfileAddClick(mouseX, mouseY);
        }

        int w = Math.min(this.width - 40, 760);
        int h = Math.min(this.height - 40, 460);
        int x = (this.width - w) / 2;
        int y = (this.height - h) / 2;

        // Top Header Close Button Click
        int closeX = x + w - 18;
        int closeY = y + 9;
        if (mouseX >= closeX - 3 && mouseX <= closeX + 11 && mouseY >= closeY - 3 && mouseY <= closeY + 11) {
            this.close();
            return true;
        }

        // Top Tabs Click (Segmented control)
        String[] tabs = {"MODS", "SETTINGS", "WAYPOINTS"};
        int trackW = 168;
        int trackX = x + w / 2 - trackW / 2;
        int trackY = y + 7;
        for (int i = 0; i < tabs.length; i++) {
            int tx = trackX + 2 + i * 55;
            int ty = trackY + 2;
            if (mouseX >= tx && mouseX <= tx + 54 && mouseY >= ty && mouseY <= ty + 14) {
                activeTab = tabs[i];
                scrollOffset = 0;
                return true;
            }
        }

        // Profile Sidebar click
        int sbX = x + 6;
        int sbY = y + 30;
        int sbW = 125;
        int sbH = h - 36;
        
        // (+) Add Profile click
        int addProfX = sbX + sbW - 14;
        int addProfY = sbY + 8;
        if (mouseX >= addProfX && mouseX <= addProfX + 10 && mouseY >= addProfY && mouseY <= addProfY + 16) {
            showProfileAdd = true;
            newProfileName = "";
            profileNameFocused = true; // Auto-focus
            return true;
        }

        for (int i = 0; i < profileList.size(); i++) {
            String prof = profileList.get(i);
            int px = sbX + 6;
            int py = sbY + 22 + i * 22;
            int pw = sbW - 12;
            int ph = 18;
            
            // Delete button (X) click for custom profiles
            if (i > 0) {
                int delX = px + pw - 12;
                int delY = py + 4;
                if (mouseX >= delX && mouseX <= delX + 8 && mouseY >= delY && mouseY <= delY + 11) {
                    profileList.remove(i);
                    saveProfilesList();
                    
                    if (activeProfile.equals(prof)) {
                        activeProfile = "MarinMC";
                        loadProfileConfig("MarinMC");
                        configStrings.put("active_profile", "MarinMC");
                        saveStringsConfigStatic();
                    }
                    
                    try {
                        java.io.File configDir = net.fabricmc.loader.api.FabricLoader.getInstance()
                            .getConfigDir().toFile();
                        String safeProfileName = prof.replace(" ", "_").toLowerCase();
                        java.io.File profileFile = new java.io.File(configDir, "marinmc-profile-" + safeProfileName + ".json");
                        if (profileFile.exists()) {
                            profileFile.delete();
                        }
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                    return true;
                }
            }

            // Profile row selection click
            boolean hitProfile = false;
            if (i > 0) {
                hitProfile = mouseX >= px && mouseX <= px + pw - 12 && mouseY >= py && mouseY <= py + ph;
            } else {
                hitProfile = mouseX >= px && mouseX <= px + pw && mouseY >= py && mouseY <= py + ph;
            }
            
            if (hitProfile) {
                if (!activeProfile.equals(prof)) {
                    saveProfileConfig(activeProfile);
                    activeProfile = prof;
                    loadProfileConfig(activeProfile);
                    configStrings.put("active_profile", activeProfile);
                    saveStringsConfigStatic();
                }
                return true;
            }
        }

        // EDIT HUD click
        int hudX = sbX + 6;
        int hudY = sbY + sbH - 22;
        int hudW = sbW - 12;
        int hudH = 16;
        if (mouseX >= hudX && mouseX <= hudX + hudW && mouseY >= hudY && mouseY <= hudY + hudH) {
            if (this.client != null) {
                this.client.setScreen(new HudEditorScreen());
            }
            return true;
        }

        // Route to tab-specific click handlers
        int contentX = x + 136;
        int contentY = y + 30;
        int contentW = w - 142;
        int contentH = h - 36;

        if ("MODS".equals(activeTab)) {
            return handleModsTabClick(mouseX, mouseY, contentX, contentY, contentW, contentH);
        } else if ("SETTINGS".equals(activeTab)) {
            return handleSettingsTabClick(mouseX, mouseY, contentX, contentY, contentW, contentH);
        } else if ("WAYPOINTS".equals(activeTab)) {
            return handleWaypointsTabClick(mouseX, mouseY, contentX, contentY, contentW, contentH);
        }

        return super.mouseClicked(mouseX, mouseY, button);
    }

    private boolean handleModsTabClick(double mouseX, double mouseY,
                                        int contentX, int contentY, int contentW, int contentH) {
        // Category Pills click
        String[] categories = {"ALL", "NEW", "HUD", "SERVER", "MECHANIC"};
        int catStartX = contentX + 4;
        for (int i = 0; i < categories.length; i++) {
            int cx = catStartX + i * 48;
            int cy = contentY + 6;
            if (mouseX >= cx && mouseX <= cx + 44 && mouseY >= cy && mouseY <= cy + 14) {
                activeCategory = categories[i];
                scrollOffset = 0;
                return true;
            }
        }

        // Search Bar click
        int searchX = contentX + contentW - 90;
        int searchY = contentY + 5;
        if (mouseX >= searchX && mouseX <= searchX + 85 && mouseY >= searchY && mouseY <= searchY + 14) {
            searchFocused = true;
            return true;
        } else {
            searchFocused = false;
        }

        // Mod Cards grid click
        int gridX = contentX + 6;
        int gridY = contentY + 24;
        int gridW = contentW - 12;
        int gridH = contentH - 30;

        List<ModCard> filtered = new ArrayList<>();
        for (ModCard mod : modCards) {
            boolean matchesCat = activeCategory.equals("ALL") || mod.category.equalsIgnoreCase(activeCategory);
            boolean matchesSearch = searchQuery.isEmpty() || mod.name.toLowerCase().contains(searchQuery.toLowerCase());
            if (matchesCat && matchesSearch) {
                filtered.add(mod);
            }
        }

        int colWidth = (gridW - 8) / 2;
        int cardHeight = 60;
        int spacing = 6;

        boolean inViewport = mouseX >= gridX && mouseX <= gridX + gridW && mouseY >= gridY && mouseY <= gridY + gridH;

        for (int i = 0; i < filtered.size(); i++) {
            ModCard mod = filtered.get(i);
            int col = i % 2;
            int row = i / 2;
            int cx = gridX + col * (colWidth + spacing);
            int cy = gridY + row * (cardHeight + spacing) - scrollOffset;

            if (inViewport && mouseX >= cx && mouseX <= cx + colWidth && mouseY >= cy && mouseY <= cy + cardHeight) {
                // Gear icon click -> open detail popup
                int gearX = cx + colWidth - 48;
                int gearY = cy + (cardHeight - 12) / 2;
                if (mouseX >= gearX && mouseX <= gearX + 12 && mouseY >= gearY && mouseY <= gearY + 12) {
                    showModDetail = true;
                    detailMod = mod;
                    detailScroll = 0;
                    return true;
                }

                // Toggle click (iOS switch or card click)
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

        return false;
    }

    private boolean handleSettingsTabClick(double mouseX, double mouseY,
                                            int contentX, int contentY, int contentW, int contentH) {
        // Sub-tab clicks
        String[] subTabs = {"GENERAL", "PERFORMANCE", "CONTROLS"};
        int trackX = contentX + 6;
        int trackY = contentY + 6;
        for (int i = 0; i < subTabs.length; i++) {
            int sx = trackX + 2 + i * 69;
            int sy = trackY + 2;
            if (mouseX >= sx && mouseX <= sx + 66 && mouseY >= sy && mouseY <= sy + 14) {
                settingsSubTab = subTabs[i];
                scrollOffset = 0;
                return true;
            }
        }

        // Toggle switches
        int listX = contentX + 6;
        int listY = contentY + 28;
        int listW = contentW - 12;
        int listH = contentH - 34;

        List<SettingEntry> settings = getSettingsForSubTab(settingsSubTab);
        int rowHeight = 26;
        boolean inViewport = mouseX >= listX && mouseX <= listX + listW && mouseY >= listY && mouseY <= listY + listH;
        
        for (int i = 0; i < settings.size(); i++) {
            SettingEntry entry = settings.get(i);
            int ry = listY + i * rowHeight - scrollOffset;

            if (inViewport && mouseX >= listX && mouseX <= listX + listW && mouseY >= ry && mouseY <= ry + rowHeight) {
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
        int addBtnW = 54;
        int addBtnH = 14;
        int addBtnX = contentX + contentW - addBtnW - 8;
        int addBtnY = contentY + 6;
        if (mouseX >= addBtnX && mouseX <= addBtnX + addBtnW && mouseY >= addBtnY && mouseY <= addBtnY + addBtnH) {
            showWaypointAdd = true;
            wpName = "";
            wpColor = "green";
            wpNameFocused = true; // Auto-focus
            return true;
        }

        // Delete buttons on waypoint list
        int listX = contentX + 6;
        int listY = contentY + 28;
        int listW = contentW - 12;
        int listH = contentH - 34;
        int rowH = 26;
        
        boolean inViewport = mouseX >= listX && mouseX <= listX + listW && mouseY >= listY && mouseY <= listY + listH;
        if (inViewport) {
            for (int i = 0; i < waypoints.size(); i++) {
                int ry = listY + i * rowH - scrollOffset;
                int delX = listX + listW - 16;
                int delY = ry + 8;
                if (mouseX >= delX && mouseX <= delX + 12 && mouseY >= delY && mouseY <= delY + 10) {
                    waypoints.remove(i);
                    saveWaypointsStatic();
                    return true;
                }
            }
        }

        return false;
    }

    private boolean handleModDetailClick(double mouseX, double mouseY) {
        int pw = 300;
        int ph = 210;
        int px = (this.width - pw) / 2;
        int py = (this.height - ph) / 2;

        // Close button
        int clX = px + pw - 15;
        int clY = py + 6;
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
        int tbY = py + 42;
        int tbW = pw - 20;
        int tbH = 16;
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

        int settingsY = py + 66;

        if (hudEl != null) {
            // Scale slider click
            int sliderX = px + 70;
            int sliderW = pw - 110;
            int sliderY = settingsY + 2;
            if (mouseX >= sliderX && mouseX <= sliderX + sliderW && mouseY >= sliderY && mouseY <= sliderY + 8) {
                float newScale = 0.5f + (float)(mouseX - sliderX) / sliderW * 2.0f;
                newScale = Math.max(0.5f, Math.min(2.5f, newScale));
                hudEl.setScale(newScale);
                HudManager.getInstance().saveConfig();
                return true;
            }
            settingsY += 18;

            // Color theme click
            String[] themes = {"white", "red", "green", "blue", "purple", "orange"};
            for (int i = 0; i < themes.length; i++) {
                int tx = px + 80 + i * 20;
                int ty = settingsY - 1;
                if (mouseX >= tx && mouseX <= tx + 14 && mouseY >= ty && mouseY <= ty + 10) {
                    hudEl.setColorTheme(themes[i]);
                    HudManager.getInstance().saveConfig();
                    return true;
                }
            }
            settingsY += 18;

            // Opacity slider click
            int opSliderX = px + 95;
            int opSliderW = pw - 140;
            if (mouseX >= opSliderX && mouseX <= opSliderX + opSliderW && mouseY >= settingsY + 2 && mouseY <= settingsY + 10) {
                int newOp = (int)((mouseX - opSliderX) / opSliderW * 255);
                newOp = Math.max(0, Math.min(255, newOp));
                hudEl.setBgOpacity(newOp);
                HudManager.getInstance().saveConfig();
                return true;
            }
            settingsY += 18;

            // Text shadow toggle
            int swW = 20;
            int swX = px + pw - swW - 12;
            int swY = settingsY;
            if (mouseX >= swX && mouseX <= swX + swW && mouseY >= swY && mouseY <= swY + 10) {
                boolean current = configStates.getOrDefault(detailMod.id + "_shadow", true);
                configStates.put(detailMod.id + "_shadow", !current);
                saveConfigStatic();
                return true;
            }
            settingsY += 18;

            // Bracket type click
            String[] brackets = {"[%s]", "(%s)", "<%s>", "{%s}", "| %s |", "- %s -"};
            for (int i = 0; i < brackets.length; i++) {
                int bx = px + 80 + i * 24;
                int by = settingsY - 1;
                if (mouseX >= bx && mouseX <= bx + 20 && mouseY >= by && mouseY <= by + 10) {
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
                    int bx = px + 80 + i * 50;
                    int by = settingsY - 1;
                    if (mouseX >= bx && mouseX <= bx + 46 && mouseY >= by && mouseY <= by + 10) {
                        configStrings.put("freelook_perspective", perspectives[i]);
                        saveStringsConfigStatic();
                        return true;
                    }
                }
                settingsY += 18;

                // Invert Y toggle
                int swW = 20;
                int swX = px + pw - swW - 12;
                int swY = settingsY;
                if (mouseX >= swX && mouseX <= swX + swW && mouseY >= swY && mouseY <= swY + 10) {
                    boolean current = configStates.getOrDefault("freelook_invert_y", false);
                    configStates.put("freelook_invert_y", !current);
                    saveConfigStatic();
                    return true;
                }
            } else if (detailMod.id.equals("block_outline")) {
                String[] colors = {"gold", "red", "green", "blue", "orange", "white"};
                for (int i = 0; i < colors.length; i++) {
                    int tx = px + 80 + i * 20;
                    int ty = settingsY - 1;
                    if (mouseX >= tx && mouseX <= tx + 14 && mouseY >= ty && mouseY <= ty + 10) {
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
        int clX = px + pw - 15;
        int clY = py + 7;
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
            int cx = px + 50 + i * 20;
            int cy = py + 50;
            if (mouseX >= cx && mouseX <= cx + 14 && mouseY >= cy && mouseY <= cy + 10) {
                wpColor = colors[i];
                return true;
            }
        }

        // Confirm button
        int confirmX = px + 10;
        int confirmY = py + ph - 24;
        int confirmW = pw - 20;
        int confirmH = 14;
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

    private boolean handleProfileAddClick(double mouseX, double mouseY) {
        int pw = 200;
        int ph = 90;
        int px = (this.width - pw) / 2;
        int py = (this.height - ph) / 2;

        // Close button
        int clX = px + pw - 15;
        int clY = py + 7;
        if (mouseX >= clX && mouseX <= clX + 10 && mouseY >= clY && mouseY <= clY + 10) {
            showProfileAdd = false;
            return true;
        }

        // Click outside to close
        if (mouseX < px || mouseX > px + pw || mouseY < py || mouseY > py + ph) {
            showProfileAdd = false;
            return true;
        }

        // Name field click
        int nameFieldX = px + 10;
        int nameFieldY = py + 27;
        int nameFieldW = pw - 20;
        int nameFieldH = 16;
        if (mouseX >= nameFieldX && mouseX <= nameFieldX + nameFieldW && mouseY >= nameFieldY && mouseY <= nameFieldY + nameFieldH) {
            profileNameFocused = true;
        } else {
            profileNameFocused = false;
        }

        // Confirm button
        int confirmX = px + 10;
        int confirmY = py + ph - 24;
        int confirmW = pw - 20;
        int confirmH = 14;
        if (mouseX >= confirmX && mouseX <= confirmX + confirmW && mouseY >= confirmY && mouseY <= confirmY + confirmH) {
            if (!newProfileName.isEmpty()) {
                String cleanName = newProfileName.trim();
                if (!profileList.contains(cleanName)) {
                    profileList.add(cleanName);
                    saveProfilesList();
                    
                    saveProfileConfig(activeProfile);
                    activeProfile = cleanName;
                    loadProfileConfig(activeProfile);
                    configStrings.put("active_profile", activeProfile);
                    saveStringsConfigStatic();
                    
                    showProfileAdd = false;
                }
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
        if (showProfileAdd && profileNameFocused) {
            newProfileName += chr;
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
            } else if (keyCode == GLFW.GLFW_KEY_ENTER) {
                wpNameFocused = false;
            } else if (keyCode == GLFW.GLFW_KEY_ESCAPE) {
                showWaypointAdd = false;
            }
            return true; // Consume all key inputs when typing name
        }

        if (showProfileAdd && profileNameFocused) {
            if (keyCode == GLFW.GLFW_KEY_BACKSPACE) {
                if (!newProfileName.isEmpty()) {
                    newProfileName = newProfileName.substring(0, newProfileName.length() - 1);
                }
            } else if (keyCode == GLFW.GLFW_KEY_ENTER) {
                profileNameFocused = false;
            } else if (keyCode == GLFW.GLFW_KEY_ESCAPE) {
                showProfileAdd = false;
            }
            return true; // Consume all key inputs when typing profile name
        }

        if (showProfileAdd) {
            if (keyCode == GLFW.GLFW_KEY_ESCAPE) {
                showProfileAdd = false;
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
            } else if (keyCode == GLFW.GLFW_KEY_ENTER || keyCode == GLFW.GLFW_KEY_ESCAPE) {
                searchFocused = false;
            }
            return true; // Consume all key inputs when searching
        }
        return super.keyPressed(keyCode, scanCode, modifiers);
    }

    private void drawRoundedRect(DrawContext context, int x, int y, int w, int h, int color, int r) {
        if (r <= 0) {
            context.fill(x, y, x + w, y + h, color);
            return;
        }
        context.fill(x + r, y, x + w - r, y + h, color);
        context.fill(x, y + r, x + r, y + h - r, color);
        context.fill(x + w - r, y + r, x + w, y + h - r, color);
        for (int i = 0; i < r; i++) {
            int cx = (int) Math.round(Math.sqrt(r * r - (r - i) * (r - i)));
            context.fill(x + r - cx, y + i, x + r, y + i + 1, color);
            context.fill(x + w - r, y + i, x + w - r + cx, y + i + 1, color);
            context.fill(x + r - cx, y + h - i - 1, x + r, y + h - i, color);
            context.fill(x + w - r, y + h - i - 1, x + w - r + cx, y + h - i, color);
        }
    }

    private void drawRoundedBorder(DrawContext context, int x, int y, int w, int h, int borderColor, int r) {
        if (r <= 0) {
            context.drawBorder(x, y, w, h, borderColor);
            return;
        }
        context.fill(x + r, y, x + w - r, y + 1, borderColor);
        context.fill(x + r, y + h - 1, x + w - r, y + h, borderColor);
        context.fill(x, y + r, x + 1, y + h - r, borderColor);
        context.fill(x + w - 1, y + r, x + w, y + h - r, borderColor);

        for (int i = 0; i < r; i++) {
            int cx = (int) Math.round(Math.sqrt(r * r - (r - i) * (r - i)));
            int prevCx = (i == 0) ? 0 : (int) Math.round(Math.sqrt(r * r - (r - i + 1) * (r - i + 1)));
            
            context.fill(x + r - cx, y + i, x + r - prevCx + 1, y + i + 1, borderColor);
            context.fill(x + w - r + prevCx - 1, y + i, x + w - r + cx, y + i + 1, borderColor);
            context.fill(x + r - cx, y + h - i - 1, x + r - prevCx + 1, y + h - i, borderColor);
            context.fill(x + w - r + prevCx - 1, y + h - i - 1, x + w - r + cx, y + h - i, borderColor);
        }
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

    // ============================================================================
    // PROFILE SAVE/LOAD SYSTEM
    // ============================================================================
    private static void saveProfileConfig(String profileName) {
        try {
            java.io.File configDir = net.fabricmc.loader.api.FabricLoader.getInstance()
                .getConfigDir().toFile();
            String safeProfileName = profileName.replace(" ", "_").toLowerCase();
            java.io.File profileFile = new java.io.File(configDir, "marinmc-profile-" + safeProfileName + ".json");
            
            JsonObject json = new JsonObject();
            // Save configStates
            JsonObject states = new JsonObject();
            for (Map.Entry<String, Boolean> entry : configStates.entrySet()) {
                states.addProperty(entry.getKey(), entry.getValue());
            }
            json.add("states", states);
            
            // Save configStrings
            JsonObject strings = new JsonObject();
            for (Map.Entry<String, String> entry : configStrings.entrySet()) {
                strings.addProperty(entry.getKey(), entry.getValue());
            }
            json.add("strings", strings);
            
            try (java.io.FileWriter writer = new java.io.FileWriter(profileFile)) {
                new GsonBuilder().setPrettyPrinting().create().toJson(json, writer);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private static void loadProfileConfig(String profileName) {
        try {
            java.io.File configDir = net.fabricmc.loader.api.FabricLoader.getInstance()
                .getConfigDir().toFile();
            String safeProfileName = profileName.replace(" ", "_").toLowerCase();
            java.io.File profileFile = new java.io.File(configDir, "marinmc-profile-" + safeProfileName + ".json");
            
            if (profileFile.exists()) {
                // First reset config to default values so missing keys from older/incomplete profile configs don't get cleared/lost
                resetStatesToDefaults();
                
                try (java.io.FileReader reader = new java.io.FileReader(profileFile)) {
                    JsonObject json = JsonParser.parseReader(reader).getAsJsonObject();
                    
                    // Load configStates
                    if (json.has("states")) {
                        JsonObject states = json.getAsJsonObject("states");
                        for (Map.Entry<String, JsonElement> entry : states.entrySet()) {
                            configStates.put(entry.getKey(), entry.getValue().getAsBoolean());
                        }
                    }
                    
                    // Load configStrings
                    if (json.has("strings")) {
                        JsonObject strings = json.getAsJsonObject("strings");
                        for (Map.Entry<String, JsonElement> entry : strings.entrySet()) {
                            configStrings.put(entry.getKey(), entry.getValue().getAsString());
                        }
                    }
                }
                
                // Sync with HudManager
                for (HudElement el : HudManager.getInstance().getElements()) {
                    boolean enabled = configStates.getOrDefault(el.getId(), false);
                    el.setEnabled(enabled);
                }
            }
            // If profile file doesn't exist, keep current config (first-time use)
        } catch (Exception e) {
            e.printStackTrace();
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
                bgColor = hovered ? 0x602E7D32 : 0x302E7D32;
                borderColor = hovered ? 0xC02E7D32 : 0x602E7D32;
                if (hovered) accentColor = 0xFF2E7D32;
            } else if (text.contains("DISABLED")) {
                bgColor = hovered ? 0x60C62828 : 0x30C62828;
                borderColor = hovered ? 0xC0C62828 : 0x60C62828;
                if (hovered) accentColor = 0xFFC62828;
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
