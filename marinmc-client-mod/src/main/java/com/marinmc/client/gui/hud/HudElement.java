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

    public boolean isHovered(double mouseX, double mouseY) {
        return mouseX >= x && mouseX <= x + getWidth() && mouseY >= y && mouseY <= y + getHeight();
    }

    public abstract void render(DrawContext context);

    public void renderDummy(DrawContext context) {
        // Draw dotted outline / transparent gray background for editor
        context.fill(x, y, x + getWidth(), y + getHeight(), 0x55000000);
        context.drawBorder(x, y, getWidth(), getHeight(), 0xFF2D7DD2);
        context.drawCenteredTextWithShadow(
            net.minecraft.client.MinecraftClient.getInstance().textRenderer, 
            name, 
            x + getWidth() / 2, 
            y + getHeight() / 2 - 4, 
            0xFFFFFFFF
        );
    }
}
