package com.marinmc.client.gui.hud;

import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.gui.screen.Screen;
import net.minecraft.text.Text;

public class HudEditorScreen extends Screen {
    private HudElement draggedElement = null;
    private int dragOffsetX = 0;
    private int dragOffsetY = 0;
    
    // Snapping guidelines states
    private boolean snappedX = false;
    private boolean snappedY = false;

    // Customization popup state
    private HudElement selectedElement = null;

    public HudEditorScreen() {
        super(Text.translatable("marinmc.menu.hud_editor_title"));
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
        
        // Draw alignment guidelines if snapping is active
        if (draggedElement != null) {
            int centerX = this.width / 2;
            int centerY = this.height / 2;
            
            if (snappedX) {
                // Vertical center guide line
                context.fill(centerX - 1, 0, centerX + 1, this.height, 0xAA7C3AED); // glowing purple line
            }
            if (snappedY) {
                // Horizontal center guide line
                context.fill(0, centerY - 1, this.width, centerY + 1, 0xAA7C3AED); // glowing purple line
            }
        }

        // Draw editor title and instructions - i18n
        String titleText = Text.translatable("marinmc.menu.hud_editor_title").getString();
        String descText = Text.translatable("marinmc.menu.hud_editor_desc").getString();
        
        context.drawCenteredTextWithShadow(this.textRenderer, titleText, this.width / 2, 12, 0xFFB180E8);
        context.drawCenteredTextWithShadow(this.textRenderer, descText, this.width / 2, 24, 0xFFA1A1AA);

        // Draw HUD Elements in edit mode
        for (HudElement element : HudManager.getInstance().getElements()) {
            if (element.isEnabled()) {
                boolean isHovered = element.isHovered(mouseX, mouseY) && selectedElement == null;
                
                // Highlight hovered or dragged elements
                if (element == draggedElement) {
                    element.renderDummy(context);
                    context.drawBorder(element.getX() - 2, element.getY() - 2, element.getWidth() + 4, element.getHeight() + 4, 0xFFBF5BFF);
                } else if (isHovered) {
                    element.renderDummy(context);
                    // Glowing breathing border on hover
                    int alpha = (int) (150 + Math.sin(System.currentTimeMillis() * 0.01) * 50);
                    int glowColor = (alpha << 24) | 0xB180E8;
                    context.drawBorder(element.getX() - 1, element.getY() - 1, element.getWidth() + 2, element.getHeight() + 2, glowColor);
                } else {
                    element.renderDummy(context);
                }
            }
        }

        // Draw popup settings if an element is selected (Glassmorphic modal panel)
        if (selectedElement != null) {
            int panelW = 220;
            int panelH = 160;
            int px = this.width / 2 - panelW / 2;
            int py = this.height / 2 - panelH / 2;

            // Draw premium glassmorphic background panel
            context.fill(px, py, px + panelW, py + panelH, 0xF20F0C16);
            context.drawBorder(px, py, panelW, panelH, 0xFFB180E8); // violet glowing border
            context.fill(px + 4, py + 4, px + panelW - 4, py + 20, 0x30B180E8); // header strip

            // Header Title
            context.drawCenteredTextWithShadow(
                this.textRenderer, 
                selectedElement.getName() + " - " + Text.translatable("marinmc.tab.settings").getString(), 
                this.width / 2, 
                py + 7, 
                0xFFFFFFFF
            );

            // 1. Color Themes - i18n
            String themeLabel = Text.translatable("marinmc.menu.theme").getString();
            context.drawTextWithShadow(this.textRenderer, themeLabel, px + 12, py + 32, 0xFFA1A1AA);
            String[] themes = {"white", "red", "green", "blue", "purple", "orange"};
            int[] themeColors = {0xFFFFFFFF, 0xFFEF4444, 0xFF22C55E, 0xFF3B82F6, 0xFFA78BFA, 0xFFF97316};
            for (int i = 0; i < 6; i++) {
                int bx = px + 52 + i * 26;
                boolean isCurrent = themes[i].equalsIgnoreCase(selectedElement.getColorTheme());
                context.fill(bx, py + 30, bx + 20, py + 42, themeColors[i]);
                if (isCurrent) {
                    context.drawBorder(bx - 1, py + 29, 22, 14, 0xFFFFFFFF);
                } else {
                    context.drawBorder(bx - 1, py + 29, 22, 14, 0x44FFFFFF);
                }
            }

            // 2. Scales - i18n
            String scaleLabel = Text.translatable("marinmc.menu.scale").getString();
            context.drawTextWithShadow(this.textRenderer, scaleLabel, px + 12, py + 62, 0xFFA1A1AA);
            float[] scales = {0.8f, 1.0f, 1.2f, 1.5f};
            String[] scaleLabels = {"0.8x", "1.0x", "1.2x", "1.5x"};
            for (int i = 0; i < 4; i++) {
                int bx = px + 52 + i * 38;
                boolean isCurrent = Math.abs(selectedElement.getScale() - scales[i]) < 0.05f;
                int btnColor = isCurrent ? 0x60B180E8 : 0x30FFFFFF;
                int borderColor = isCurrent ? 0xFFB180E8 : 0x20FFFFFF;
                context.fill(bx, py + 60, bx + 34, py + 72, btnColor);
                context.drawBorder(bx, py + 60, 34, 12, borderColor);
                context.drawCenteredTextWithShadow(this.textRenderer, scaleLabels[i], bx + 17, py + 62, 0xFFFFFFFF);
            }

            // 3. Opacities - i18n
            String opLabel = Text.translatable("marinmc.menu.opacity").getString();
            context.drawTextWithShadow(this.textRenderer, opLabel, px + 12, py + 92, 0xFFA1A1AA);
            int[] opacities = {0, 76, 168, 255};
            String[] opLabels = {"0%", "30%", "66%", "100%"};
            for (int i = 0; i < 4; i++) {
                int bx = px + 52 + i * 38;
                boolean isCurrent = selectedElement.getBgOpacity() == opacities[i];
                int btnColor = isCurrent ? 0x60B180E8 : 0x30FFFFFF;
                int borderColor = isCurrent ? 0xFFB180E8 : 0x20FFFFFF;
                context.fill(bx, py + 90, bx + 34, py + 102, btnColor);
                context.drawBorder(bx, py + 90, 34, 12, borderColor);
                context.drawCenteredTextWithShadow(this.textRenderer, opLabels[i], bx + 17, py + 92, 0xFFFFFFFF);
            }

            // 4. Save and Reset Buttons - i18n
            String resetLabel = Text.translatable("marinmc.menu.reset").getString();
            String saveLabel = Text.translatable("marinmc.menu.save").getString();
            
            // Reset position button (Left)
            int resetX = px + 12;
            int btnY = py + 125;
            boolean resetHover = mouseX >= resetX && mouseX <= resetX + 90 && mouseY >= btnY && mouseY <= btnY + 18;
            context.fill(resetX, btnY, resetX + 90, btnY + 18, resetHover ? 0x80EF4444 : 0x40EF4444);
            context.drawBorder(resetX, btnY, 90, 18, resetHover ? 0xFFEF4444 : 0x60EF4444);
            context.drawCenteredTextWithShadow(this.textRenderer, resetLabel, resetX + 45, btnY + 5, 0xFFFFFFFF);

            // Save/Close button (Right)
            int saveX = px + panelW - 102;
            boolean saveHover = mouseX >= saveX && mouseX <= saveX + 90 && mouseY >= btnY && mouseY <= btnY + 18;
            context.fill(saveX, btnY, saveX + 90, btnY + 18, saveHover ? 0x8010B981 : 0x4010B981);
            context.drawBorder(saveX, btnY, 90, 18, saveHover ? 0xFF10B981 : 0x6010B981);
            context.drawCenteredTextWithShadow(this.textRenderer, saveLabel, saveX + 45, btnY + 5, 0xFFFFFFFF);
        }

        super.render(context, mouseX, mouseY, delta);
    }

    @Override
    public boolean mouseClicked(double mouseX, double mouseY, int button) {
        if (selectedElement != null) {
            int panelW = 220;
            int panelH = 160;
            int px = this.width / 2 - panelW / 2;
            int py = this.height / 2 - panelH / 2;

            if (mouseX >= px && mouseX <= px + panelW && mouseY >= py && mouseY <= py + panelH) {
                // 1. Color Themes
                int buttonY = py + 29;
                String[] themes = {"white", "red", "green", "blue", "purple", "orange"};
                for (int i = 0; i < 6; i++) {
                    int bx = px + 52 + i * 26;
                    if (mouseX >= bx && mouseX <= bx + 20 && mouseY >= buttonY && mouseY <= buttonY + 14) {
                        selectedElement.setColorTheme(themes[i]);
                        HudManager.getInstance().saveConfig();
                        return true;
                    }
                }

                // 2. Scales
                int scaleY = py + 60;
                float[] scales = {0.8f, 1.0f, 1.2f, 1.5f};
                for (int i = 0; i < 4; i++) {
                    int bx = px + 52 + i * 38;
                    if (mouseX >= bx && mouseX <= bx + 34 && mouseY >= scaleY && mouseY <= scaleY + 12) {
                        selectedElement.setScale(scales[i]);
                        HudManager.getInstance().saveConfig();
                        return true;
                    }
                }

                // 3. Opacities
                int opY = py + 90;
                int[] opacities = {0, 76, 168, 255};
                for (int i = 0; i < 4; i++) {
                    int bx = px + 52 + i * 38;
                    if (mouseX >= bx && mouseX <= bx + 34 && mouseY >= opY && mouseY <= opY + 12) {
                        selectedElement.setBgOpacity(opacities[i]);
                        HudManager.getInstance().saveConfig();
                        return true;
                    }
                }

                // 4. Action Buttons
                int btnY = py + 125;
                // Reset Button click
                int resetX = px + 12;
                if (mouseX >= resetX && mouseX <= resetX + 90 && mouseY >= btnY && mouseY <= btnY + 18) {
                    // Reset to center of screen
                    selectedElement.setX(this.width / 2 - selectedElement.getWidth() / 2);
                    selectedElement.setY(this.height / 2 - selectedElement.getHeight() / 2);
                    HudManager.getInstance().saveConfig();
                    selectedElement = null;
                    return true;
                }

                // Save Button click
                int saveX = px + panelW - 102;
                if (mouseX >= saveX && mouseX <= saveX + 90 && mouseY >= btnY && mouseY <= btnY + 18) {
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
                    snappedX = false;
                    snappedY = false;
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
            
            // Alignment / Snapping logic
            int centerX = this.width / 2;
            int centerY = this.height / 2;
            int elementHalfW = draggedElement.getWidth() / 2;
            int elementHalfH = draggedElement.getHeight() / 2;
            
            // Snap to vertical center axis (within 6 pixels)
            if (Math.abs((newX + elementHalfW) - centerX) < 6) {
                newX = centerX - elementHalfW;
                snappedX = true;
            } else {
                snappedX = false;
            }
            
            // Snap to horizontal center axis (within 6 pixels)
            if (Math.abs((newY + elementHalfH) - centerY) < 6) {
                newY = centerY - elementHalfH;
                snappedY = true;
            } else {
                snappedY = false;
            }
            
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
            snappedX = false;
            snappedY = false;
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
