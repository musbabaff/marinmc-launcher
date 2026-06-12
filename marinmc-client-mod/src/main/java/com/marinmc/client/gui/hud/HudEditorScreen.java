package com.marinmc.client.gui.hud;

import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.gui.screen.Screen;
import net.minecraft.text.Text;

public class HudEditorScreen extends Screen {
    private HudElement draggedElement = null;
    private int dragOffsetX = 0;
    private int dragOffsetY = 0;
    
    // Customization popup state
    private HudElement selectedElement = null;

    public HudEditorScreen() {
        super(Text.literal("HUD Editor"));
    }

    @Override
    protected void init() {
        super.init();
    }

    @Override
    public void renderBackground(DrawContext context, int mouseX, int mouseY, float delta) {
        // Overridden to do nothing here; we call super.renderBackground manually in render()
        // to prevent duplicate background blurring in super.render() which crashes 1.21.8.
    }

    @Override
    public void render(DrawContext context, int mouseX, int mouseY, float delta) {
        // Draw semi-transparent background
        super.renderBackground(context, mouseX, mouseY, delta);
        
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
            "Sürüklemek için sol tıkla basılı tutun. Özelleştirmek için sağ tıklayın. Çıkmak için ESC.", 
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

        // Draw popup settings if an element is selected
        if (selectedElement != null) {
            int panelW = 200;
            int panelH = 140;
            int px = this.width / 2 - panelW / 2;
            int py = this.height / 2 - panelH / 2;

            // Draw dark background panel
            context.fill(px, py, px + panelW, py + panelH, 0xEE08080C);
            context.drawBorder(px, py, panelW, panelH, 0xFF2D7DD2);

            // Title
            context.drawCenteredTextWithShadow(
                this.textRenderer, 
                selectedElement.getName() + " AYARLARI", 
                this.width / 2, 
                py + 8, 
                0xFF2D7DD2
            );

            // 1. Color Themes
            context.drawTextWithShadow(this.textRenderer, "Tema:", px + 12, py + 28, 0xFFA1A1AA);
            String[] themes = {"white", "red", "green", "blue", "purple", "orange"};
            int[] themeColors = {0xFFFFFFFF, 0xFFEF4444, 0xFF22C55E, 0xFF3B82F6, 0xFFA78BFA, 0xFFF97316};
            for (int i = 0; i < 6; i++) {
                int bx = px + 48 + i * 24;
                boolean isCurrent = themes[i].equalsIgnoreCase(selectedElement.getColorTheme());
                context.fill(bx, py + 26, bx + 18, py + 38, themeColors[i]);
                if (isCurrent) {
                    context.drawBorder(bx - 1, py + 25, 20, 14, 0xFFFFFFFF);
                } else {
                    context.drawBorder(bx - 1, py + 25, 20, 14, 0x44FFFFFF);
                }
            }

            // 2. Scales
            context.drawTextWithShadow(this.textRenderer, "Boyut:", px + 12, py + 58, 0xFFA1A1AA);
            float[] scales = {0.8f, 1.0f, 1.2f, 1.5f};
            String[] scaleLabels = {"0.8x", "1.0x", "1.2x", "1.5x"};
            for (int i = 0; i < 4; i++) {
                int bx = px + 48 + i * 36;
                boolean isCurrent = Math.abs(selectedElement.getScale() - scales[i]) < 0.05f;
                int btnColor = isCurrent ? 0xFF2D7DD2 : 0xAA111111;
                context.fill(bx, py + 56, bx + 32, py + 68, btnColor);
                context.drawBorder(bx, py + 56, 32, 12, 0x44FFFFFF);
                context.drawCenteredTextWithShadow(this.textRenderer, scaleLabels[i], bx + 16, py + 58, 0xFFFFFFFF);
            }

            // 3. Opacities
            context.drawTextWithShadow(this.textRenderer, "Matlık:", px + 12, py + 88, 0xFFA1A1AA);
            int[] opacities = {0, 76, 168, 255};
            String[] opLabels = {"0%", "30%", "66%", "100%"};
            for (int i = 0; i < 4; i++) {
                int bx = px + 48 + i * 36;
                boolean isCurrent = selectedElement.getBgOpacity() == opacities[i];
                int btnColor = isCurrent ? 0xFF2D7DD2 : 0xAA111111;
                context.fill(bx, py + 86, bx + 32, py + 98, btnColor);
                context.drawBorder(bx, py + 86, 32, 12, 0x44FFFFFF);
                context.drawCenteredTextWithShadow(this.textRenderer, opLabels[i], bx + 16, py + 88, 0xFFFFFFFF);
            }

            // 4. Close Button
            int bx = px + panelW / 2 - 40;
            context.fill(bx, py + 114, bx + 80, py + 130, 0xFF259457);
            context.drawBorder(bx, py + 114, 80, 16, 0x44FFFFFF);
            context.drawCenteredTextWithShadow(this.textRenderer, "KAYDET", bx + 40, py + 118, 0xFFFFFFFF);
        }

        super.render(context, mouseX, mouseY, delta);
    }

    @Override
    public boolean mouseClicked(double mouseX, double mouseY, int button) {
        if (selectedElement != null) {
            int panelW = 200;
            int panelH = 140;
            int px = this.width / 2 - panelW / 2;
            int py = this.height / 2 - panelH / 2;

            if (mouseX >= px && mouseX <= px + panelW && mouseY >= py && mouseY <= py + panelH) {
                // 1. Color Themes
                int buttonY = py + 26;
                String[] themes = {"white", "red", "green", "blue", "purple", "orange"};
                for (int i = 0; i < 6; i++) {
                    int bx = px + 48 + i * 24;
                    if (mouseX >= bx && mouseX <= bx + 18 && mouseY >= buttonY && mouseY <= buttonY + 12) {
                        selectedElement.setColorTheme(themes[i]);
                        HudManager.getInstance().saveConfig();
                        return true;
                    }
                }

                // 2. Scales
                int scaleY = py + 56;
                float[] scales = {0.8f, 1.0f, 1.2f, 1.5f};
                for (int i = 0; i < 4; i++) {
                    int bx = px + 48 + i * 36;
                    if (mouseX >= bx && mouseX <= bx + 32 && mouseY >= scaleY && mouseY <= scaleY + 12) {
                        selectedElement.setScale(scales[i]);
                        HudManager.getInstance().saveConfig();
                        return true;
                    }
                }

                // 3. Opacities
                int opY = py + 86;
                int[] opacities = {0, 76, 168, 255};
                for (int i = 0; i < 4; i++) {
                    int bx = px + 48 + i * 36;
                    if (mouseX >= bx && mouseX <= bx + 32 && mouseY >= opY && mouseY <= opY + 12) {
                        selectedElement.setBgOpacity(opacities[i]);
                        HudManager.getInstance().saveConfig();
                        return true;
                    }
                }

                // 4. Save/Close button
                int closeY = py + 114;
                if (mouseX >= px + panelW / 2 - 40 && mouseX <= px + panelW / 2 + 40 && mouseY >= closeY && mouseY <= closeY + 16) {
                    selectedElement = null;
                    return true;
                }
                return true;
            } else {
                selectedElement = null;
                return true;
            }
        }

        if (button == 0) { // Left-click
            for (HudElement element : HudManager.getInstance().getElements()) {
                if (element.isEnabled() && element.isHovered(mouseX, mouseY)) {
                    draggedElement = element;
                    dragOffsetX = (int)mouseX - element.getX();
                    dragOffsetY = (int)mouseY - element.getY();
                    return true;
                }
            }
        } else if (button == 1) { // Right-click
            for (HudElement element : HudManager.getInstance().getElements()) {
                if (element.isEnabled() && element.isHovered(mouseX, mouseY)) {
                    selectedElement = element;
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
