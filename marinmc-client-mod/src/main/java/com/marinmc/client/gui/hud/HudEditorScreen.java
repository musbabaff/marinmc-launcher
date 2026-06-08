package com.marinmc.client.gui.hud;

import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.gui.screen.Screen;
import net.minecraft.text.Text;

public class HudEditorScreen extends Screen {
    private HudElement draggedElement = null;
    private int dragOffsetX = 0;
    private int dragOffsetY = 0;

    public HudEditorScreen() {
        super(Text.literal("HUD Editor"));
    }

    @Override
    protected void init() {
        super.init();
    }

    @Override
    public void render(DrawContext context, int mouseX, int mouseY, float delta) {
        // Draw semi-transparent background
        this.renderBackground(context, mouseX, mouseY, delta);
        
        // Draw editor title and instructions
        context.drawCenteredTextWithShadow(
            this.textRenderer, 
            "HUD EDITÖRÜ", 
            this.width / 2, 
            10, 
            0xFF2D7DD2
        );
        context.drawCenteredTextWithShadow(
            this.textRenderer, 
            "Eşyaları sürüklemek için sol tıkla basılı tutun. Çıkmak için ESC tuşuna basın.", 
            this.width / 2, 
            22, 
            0xFFA1A1AA
        );

        // Draw HUD Elements in edit mode
        for (HudElement element : HudManager.getInstance().getElements()) {
            if (element.isEnabled()) {
                element.renderDummy(context);
            }
        }

        super.render(context, mouseX, mouseY, delta);
    }

    @Override
    public boolean mouseClicked(double mouseX, double mouseY, int button) {
        if (button == 0) { // Left-click
            for (HudElement element : HudManager.getInstance().getElements()) {
                if (element.isEnabled() && element.isHovered(mouseX, mouseY)) {
                    draggedElement = element;
                    dragOffsetX = (int)mouseX - element.getX();
                    dragOffsetY = (int)mouseY - element.getY();
                    return true;
                }
            }
        }
        return super.mouseClicked(mouseX, mouseY, button);
    }

    @Override
    public boolean mouseDragged(double mouseX, double mouseY, int button, double deltaX, double deltaY) {
        if (draggedElement != null) {
            int newX = (int)mouseX - dragOffsetX;
            int newY = (int)mouseY - dragOffsetY;
            
            // Bounds clamping
            newX = Math.max(0, Math.min(this.width - draggedElement.getWidth(), newX));
            newY = Math.max(0, Math.min(this.height - draggedElement.getHeight(), newY));
            
            draggedElement.setX(newX);
            draggedElement.setY(newY);
            return true;
        }
        return super.mouseDragged(mouseX, mouseY, button, deltaX, deltaY);
    }

    @Override
    public boolean mouseReleased(double mouseX, double mouseY, int button) {
        if (draggedElement != null) {
            draggedElement = null;
            HudManager.getInstance().saveConfig();
            return true;
        }
        return super.mouseReleased(mouseX, mouseY, button);
    }

    @Override
    public boolean shouldPause() {
        return false;
    }
}
