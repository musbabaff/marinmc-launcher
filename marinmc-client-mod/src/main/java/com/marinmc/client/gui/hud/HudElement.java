package com.marinmc.client.gui.hud;

import net.minecraft.client.gui.DrawContext;

public abstract class HudElement {
    protected final String id;
    protected final String name;
    protected int x;
    protected int y;
    protected int width;
    protected int height;
    protected boolean enabled;
    protected float scale = 1.0f;
    protected String colorTheme = "white"; // default white theme
    protected int bgOpacity = 0xAA;       // default opacity (170/255)

    public HudElement(String id, String name, int defaultX, int defaultY, int width, int height) {
        this.id = id;
        this.name = name;
        this.x = defaultX;
        this.y = defaultY;
        this.width = width;
        this.height = height;
        this.enabled = true;
    }

    public String getId() { return id; }
    public String getName() { return name; }
    public int getX() { return x; }
    public void setX(int x) { this.x = x; }
    public int getY() { return y; }
    public void setY(int y) { this.y = y; }
    public int getWidth() { return (int)(width * scale); }
    public int getHeight() { return (int)(height * scale); }
    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
    public float getScale() { return scale; }
    public void setScale(float scale) { this.scale = scale; }
    public String getColorTheme() { return colorTheme; }
    public void setColorTheme(String colorTheme) { this.colorTheme = colorTheme; }
    public int getBgOpacity() { return bgOpacity; }
    public void setBgOpacity(int bgOpacity) { this.bgOpacity = bgOpacity; }

    public int getThemeColorHex() {
        if ("red".equalsIgnoreCase(colorTheme)) return 0xFFEF4444;
        if ("green".equalsIgnoreCase(colorTheme)) return 0xFF22C55E;
        if ("blue".equalsIgnoreCase(colorTheme)) return 0xFF3B82F6;
        if ("purple".equalsIgnoreCase(colorTheme)) return 0xFFA78BFA;
        if ("orange".equalsIgnoreCase(colorTheme)) return 0xFFF97316;
        return 0xFFFFFFFF;
    }

    public int getThemeBorderColorHex() {
        if ("red".equalsIgnoreCase(colorTheme)) return 0x44EF4444;
        if ("green".equalsIgnoreCase(colorTheme)) return 0x4422C55E;
        if ("blue".equalsIgnoreCase(colorTheme)) return 0x443B82F6;
        if ("purple".equalsIgnoreCase(colorTheme)) return 0x44A78BFA;
        if ("orange".equalsIgnoreCase(colorTheme)) return 0x44F97316;
        return 0x33FFFFFF;
    }

    public boolean isHovered(double mouseX, double mouseY) {
        return mouseX >= x && mouseX <= x + getWidth() && mouseY >= y && mouseY <= y + getHeight();
    }

    public abstract void render(DrawContext context);

    public void renderDummy(DrawContext context) {
        // Draw dotted outline / transparent gray background for editor
        int bgColor = (bgOpacity << 24) | 0x000000;
        context.fill(x, y, x + getWidth(), y + getHeight(), bgColor);
        context.drawBorder(x, y, getWidth(), getHeight(), getThemeColorHex());
        context.drawCenteredTextWithShadow(
            net.minecraft.client.MinecraftClient.getInstance().textRenderer, 
            name, 
            x + getWidth() / 2, 
            y + getHeight() / 2 - 4, 
            getThemeColorHex()
        );
    }
}
