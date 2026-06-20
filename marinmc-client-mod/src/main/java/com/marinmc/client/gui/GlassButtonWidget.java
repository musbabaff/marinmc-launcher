package com.marinmc.client.gui;

import net.minecraft.client.MinecraftClient;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.gui.widget.ButtonWidget;
import net.minecraft.text.Text;
import net.minecraft.client.font.TextRenderer;

public class GlassButtonWidget extends ButtonWidget {
    public GlassButtonWidget(int x, int y, int width, int height, Text message, PressAction onPress) {
        super(x, y, width, height, message, onPress, DEFAULT_NARRATION_SUPPLIER);
    }

    @Override
    protected void renderWidget(DrawContext context, int mouseX, int mouseY, float delta) {
        if (!this.visible) return;

        boolean hovered = this.isSelected() || (mouseX >= this.getX() && mouseX <= this.getX() + this.width && mouseY >= this.getY() && mouseY <= this.getY() + this.height);

        // Glassmorphic background: deep dark translucent panel with premium blue glow on hover
        int bgColor = hovered ? 0x90132247 : 0x60070408; 
        
        // Border: sharp dark border, glows gold on hover
        int borderColor = hovered ? 0xFFFFD700 : 0x25FFFFFF; 

        // Draw background
        context.fill(this.getX(), this.getY(), this.getX() + this.width, this.getY() + this.height, bgColor);
        
        // Draw border
        context.drawBorder(this.getX(), this.getY(), this.width, this.height, borderColor);

        // Render text
        TextRenderer textRenderer = MinecraftClient.getInstance().textRenderer;
        int textWidth = textRenderer.getWidth(this.getMessage());
        int textX = this.getX() + (this.width - textWidth) / 2;
        int textY = this.getY() + (this.height - 8) / 2;

        int textColor = hovered ? 0xFFFFFFFF : 0xFFDFDFDF;
        context.drawTextWithShadow(textRenderer, this.getMessage(), textX, textY, textColor);
    }
}
