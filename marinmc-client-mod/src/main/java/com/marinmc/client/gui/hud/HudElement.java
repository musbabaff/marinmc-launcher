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
    protected int borderRadius = 0;

    protected boolean textShadow = true;
    protected String bracketType = "none";
    protected boolean showBackground = true;

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
    public int getBorderRadius() { return borderRadius; }
    public void setBorderRadius(int borderRadius) { this.borderRadius = borderRadius; }
    public boolean isTextShadow() { return textShadow; }
    public void setTextShadow(boolean textShadow) { this.textShadow = textShadow; }
    public String getBracketType() { return bracketType; }
    public void setBracketType(String bracketType) { this.bracketType = bracketType; }
    public boolean isShowBackground() { return showBackground; }
    public void setShowBackground(boolean showBackground) { this.showBackground = showBackground; }

    public String formatText(String value) {
        if (bracketType == null) return value;
        switch (bracketType.toLowerCase()) {
            case "square":
            case "[]":
                return "[" + value + "]";
            case "parentheses":
            case "()":
                return "(" + value + ")";
            case "braces":
            case "{}":
                return "{" + value + "}";
            case "chevrons":
            case "<>":
                return "<" + value + ">";
            default:
                return value;
        }
    }

    public int getThemeColorHex() {
        if ("red".equalsIgnoreCase(colorTheme)) return 0xFFEF4444;
        if ("green".equalsIgnoreCase(colorTheme)) return 0xFF22C55E;
        if ("blue".equalsIgnoreCase(colorTheme)) return 0xFF2D7DD2; // Upgraded to theme royal blue
        if ("purple".equalsIgnoreCase(colorTheme)) return 0xFFA78BFA;
        if ("orange".equalsIgnoreCase(colorTheme)) return 0xFFF97316;
        return 0xFFFFFFFF;
    }

    public int getThemeBorderColorHex() {
        if ("red".equalsIgnoreCase(colorTheme)) return 0x44EF4444;
        if ("green".equalsIgnoreCase(colorTheme)) return 0x4422C55E;
        if ("blue".equalsIgnoreCase(colorTheme)) return 0x442D7DD2; // Upgraded to theme royal blue
        if ("purple".equalsIgnoreCase(colorTheme)) return 0x44A78BFA;
        if ("orange".equalsIgnoreCase(colorTheme)) return 0x44F97316;
        return 0x33FFFFFF;
    }

    public boolean isHovered(double mouseX, double mouseY) {
        return mouseX >= x && mouseX <= x + getWidth() && mouseY >= y && mouseY <= y + getHeight();
    }

    public abstract void render(DrawContext context);

    public void drawElementText(DrawContext context, String text, int textX, int textY, int color) {
        net.minecraft.client.MinecraftClient mc = net.minecraft.client.MinecraftClient.getInstance();
        String formatted = formatText(text);
        if (textShadow) {
            context.drawTextWithShadow(mc.textRenderer, formatted, textX, textY, color);
        } else {
            context.drawText(mc.textRenderer, formatted, textX, textY, color, false);
        }
    }

    public void drawCenteredElementText(DrawContext context, String text, int textX, int textY, int color) {
        net.minecraft.client.MinecraftClient mc = net.minecraft.client.MinecraftClient.getInstance();
        String formatted = formatText(text);
        int textW = mc.textRenderer.getWidth(formatted);
        if (textShadow) {
            context.drawCenteredTextWithShadow(mc.textRenderer, formatted, textX, textY, color);
        } else {
            context.drawText(mc.textRenderer, formatted, textX - textW / 2, textY, color, false);
        }
    }

    public void drawRoundedRect(DrawContext context, int x, int y, int w, int h, int color, int r) {
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

    public void drawRoundedBorder(DrawContext context, int x, int y, int w, int h, int borderColor, int r) {
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

    public void renderDummy(DrawContext context) {
        net.minecraft.client.MinecraftClient mc = net.minecraft.client.MinecraftClient.getInstance();
        this.width = mc.textRenderer.getWidth(formatText(name)) + 16;
        if (showBackground) {
            int bgColor = (bgOpacity << 24) | 0x000000;
            drawRoundedRect(context, x, y, getWidth(), getHeight(), bgColor, borderRadius);
        }
        drawRoundedBorder(context, x, y, getWidth(), getHeight(), getThemeColorHex(), borderRadius);
        
        int textX = x + getWidth() / 2;
        int textY = y + getHeight() / 2 - 4;
        drawCenteredElementText(context, name, textX, textY, getThemeColorHex());
    }
}
