package com.marinmc.client.gui.hud;

import net.minecraft.client.MinecraftClient;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.gui.screen.Screen;
import net.minecraft.text.Text;
import net.minecraft.client.resource.language.I18n;

import java.util.ArrayList;
import java.util.List;
import java.util.Stack;

public class HudEditorScreen extends Screen {
    private static final int SIDEBAR_WIDTH = 130;
    private static final int ROW_HEIGHT = 16;
    private boolean sidebarOpen = true;

    private int getSidebarWidth() {
        return sidebarOpen ? SIDEBAR_WIDTH : 0;
    }

    private HudElement draggedElement = null;
    private int dragOffsetX = 0;
    private int dragOffsetY = 0;
    
    // Snapping guidelines states
    private int snapLineX = -1;
    private int snapLineY = -1;

    // Grid snapping size: 0 = None, 5 = 5px, 10 = 10px
    private int gridSnappingSize = 0;

    // Customization popup state
    private HudElement selectedElement = null;

    // Left Sidebar scroll offset
    private int sidebarScrollOffset = 0;

    // Undo/Redo Stacks
    private final Stack<List<UndoState>> undoStack = new Stack<>();
    private final Stack<List<UndoState>> redoStack = new Stack<>();

    public HudEditorScreen() {
        super(Text.translatable("marinmc.menu.hud_editor_title"));
    }

    private static class UndoState {
        final String id;
        final int x;
        final int y;
        final boolean enabled;
        final float scale;
        final String colorTheme;
        final int bgOpacity;
        final int borderRadius;
        final boolean textShadow;
        final String bracketType;
        final boolean showBackground;

        UndoState(HudElement el) {
            this.id = el.getId();
            this.x = el.getX();
            this.y = el.getY();
            this.enabled = el.isEnabled();
            this.scale = el.getScale();
            this.colorTheme = el.getColorTheme();
            this.bgOpacity = el.getBgOpacity();
            this.borderRadius = el.getBorderRadius();
            this.textShadow = el.isTextShadow();
            this.bracketType = el.getBracketType();
            this.showBackground = el.isShowBackground();
        }

        void restore(HudElement el) {
            el.setX(this.x);
            el.setY(this.y);
            el.setEnabled(this.enabled);
            el.setScale(this.scale);
            el.setColorTheme(this.colorTheme);
            el.setBgOpacity(this.bgOpacity);
            el.setBorderRadius(this.borderRadius);
            el.setTextShadow(this.textShadow);
            el.setBracketType(this.bracketType);
            el.setShowBackground(this.showBackground);
        }
    }

    private void saveUndoState() {
        List<UndoState> state = new ArrayList<>();
        for (HudElement el : HudManager.getInstance().getElements()) {
            state.add(new UndoState(el));
        }
        undoStack.push(state);
        if (undoStack.size() > 30) {
            undoStack.remove(0);
        }
        redoStack.clear();
    }

    private void undo() {
        if (!undoStack.isEmpty()) {
            List<UndoState> currentState = new ArrayList<>();
            for (HudElement el : HudManager.getInstance().getElements()) {
                currentState.add(new UndoState(el));
            }
            redoStack.push(currentState);

            List<UndoState> prevState = undoStack.pop();
            for (UndoState s : prevState) {
                HudElement el = HudManager.getInstance().getElementById(s.id);
                if (el != null) {
                    s.restore(el);
                }
            }
            HudManager.getInstance().saveConfig();
        }
    }

    private void redo() {
        if (!redoStack.isEmpty()) {
            List<UndoState> currentState = new ArrayList<>();
            for (HudElement el : HudManager.getInstance().getElements()) {
                currentState.add(new UndoState(el));
            }
            undoStack.push(currentState);

            List<UndoState> nextState = redoStack.pop();
            for (UndoState s : nextState) {
                HudElement el = HudManager.getInstance().getElementById(s.id);
                if (el != null) {
                    s.restore(el);
                }
            }
            HudManager.getInstance().saveConfig();
        }
    }

    @Override
    protected void init() {
        super.init();
    }

    @Override
    public void renderBackground(DrawContext context, int mouseX, int mouseY, float delta) {
        // Overridden to prevent duplicate background blurring which crashes 1.21.8.
    }

    @Override
    public void render(DrawContext context, int mouseX, int mouseY, float delta) {
        super.renderBackground(context, mouseX, mouseY, delta);
        
        // Draw alignment guidelines if snapping is active
        if (draggedElement != null) {
            if (snapLineX != -1) {
                context.fill(snapLineX - 1, 0, snapLineX + 1, this.height, 0xAA2D7DD2);
            }
            if (snapLineY != -1) {
                context.fill(0, snapLineY - 1, this.width, snapLineY + 1, 0xAA2D7DD2);
            }
        }

        // Draw HUD Elements in edit mode
        for (HudElement element : HudManager.getInstance().getElements()) {
            if (!element.isEnabled()) {
                continue; // Do not render disabled elements in edit mode to prevent overlap clutter!
            }
            boolean isHovered = element.isHovered(mouseX, mouseY) && selectedElement == null && mouseX > getSidebarWidth();
            
            if (element == draggedElement) {
                element.renderDummy(context);
                context.drawBorder(element.getX() - 2, element.getY() - 2, element.getWidth() + 4, element.getHeight() + 4, 0xFF2D7DD2);
                
                // Coordinates tooltip
                String coords = "X: " + element.getX() + ", Y: " + element.getY();
                int tx = element.getX() + element.getWidth() / 2;
                int ty = element.getY() + element.getHeight() + 6;
                int tw = this.textRenderer.getWidth(coords) + 6;
                context.fill(tx - tw / 2, ty - 2, tx + tw / 2, ty + 10, 0xCC000000);
                context.drawBorder(tx - tw / 2, ty - 2, tw, 12, 0xFF2D7DD2);
                context.drawCenteredTextWithShadow(this.textRenderer, coords, tx, ty, 0xFFFFFFFF);
            } else if (isHovered) {
                element.renderDummy(context);
                int alpha = (int) (150 + Math.sin(System.currentTimeMillis() * 0.01) * 50);
                int glowColor = (alpha << 24) | 0x2D7DD2;
                context.drawBorder(element.getX() - 1, element.getY() - 1, element.getWidth() + 2, element.getHeight() + 2, glowColor);
            } else {
                element.renderDummy(context);
            }
        }

        if (sidebarOpen) {
            // Draw Left Side Elements Panel
            int sidebarY = 36;
            int sidebarH = this.height - 36;
            context.fill(0, sidebarY, SIDEBAR_WIDTH, sidebarY + sidebarH, 0xEB070B19); // Premium dark glass
            context.fill(SIDEBAR_WIDTH - 1, sidebarY, SIDEBAR_WIDTH, sidebarY + sidebarH, 0xAA2D7DD2); // Subtle neon divider line

            // ELEMENTS Header
            context.fill(0, sidebarY, SIDEBAR_WIDTH, sidebarY + 16, 0x202D7DD2);
            context.drawCenteredTextWithShadow(this.textRenderer, I18n.translate("marinmc.editor.elements"), SIDEBAR_WIDTH / 2, sidebarY + 4, 0xFFFFFFFF);

            int currentElementY = sidebarY + 20 - sidebarScrollOffset;
            for (HudElement el : HudManager.getInstance().getElements()) {
                if (currentElementY >= sidebarY + 16 && currentElementY + ROW_HEIGHT <= sidebarY + sidebarH) {
                    boolean rowHovered = mouseX >= 0 && mouseX <= SIDEBAR_WIDTH && mouseY >= currentElementY && mouseY <= currentElementY + ROW_HEIGHT;
                    boolean isSelected = el == selectedElement;
                    int textColor = el.isEnabled() ? 0xFFFFFFFF : 0xFF888888;
                    
                    if (rowHovered || isSelected) {
                        drawRoundedRect(context, 3, currentElementY + 1, SIDEBAR_WIDTH - 6, ROW_HEIGHT - 2, isSelected ? 0x302D7DD2 : 0x152D7DD2, 3);
                    }

                    // Beautiful glowing dot instead of basic square
                    int circleX = 8;
                    int circleY = currentElementY + ROW_HEIGHT / 2;
                    int circleRadius = 3;
                    int dotColor = el.isEnabled() ? 0xFF10DBA0 : 0xFFEF4444; // Teal/emerald vs Red
                    drawRoundedRect(context, circleX - circleRadius, circleY - circleRadius, circleRadius * 2, circleRadius * 2, dotColor, circleRadius);
                    if (el.isEnabled()) {
                        drawRoundedRect(context, circleX - circleRadius - 1, circleY - circleRadius - 1, circleRadius * 2 + 2, circleRadius * 2 + 2, 0x4010DBA0, circleRadius + 1);
                    }

                    String displayName = el.getName();
                    if (this.textRenderer.getWidth(displayName) > SIDEBAR_WIDTH - 20) {
                        displayName = this.textRenderer.trimToWidth(displayName, SIDEBAR_WIDTH - 28) + "..";
                    }
                    context.drawTextWithShadow(this.textRenderer, displayName, 18, currentElementY + 4, textColor);
                }
                currentElementY += ROW_HEIGHT;
            }
        }

        // Draw Left Sidebar Collapsible Handle Tab
        int tabX = sidebarOpen ? SIDEBAR_WIDTH : 0;
        int tabY = this.height / 2 - 15;
        boolean tabHovered = mouseX >= tabX && mouseX <= tabX + 12 && mouseY >= tabY && mouseY <= tabY + 30;
        int tabBg = tabHovered ? 0x802D7DD2 : 0xEB070B19;
        int tabBorder = tabHovered ? 0xFF2D7DD2 : 0x60FFFFFF;
        drawRoundedRect(context, tabX, tabY, 12, 30, tabBg, 3);
        drawRoundedBorder(context, tabX - 1, tabY - 1, 14, 32, tabBorder, 3);
        String arrow = sidebarOpen ? "◀" : "▶";
        context.drawCenteredTextWithShadow(this.textRenderer, arrow, tabX + 6, tabY + 11, 0xFFFFFFFF);

        // Draw Global Top Control Panel
        context.fill(0, 0, this.width, 36, 0xEB070B19); // Premium dark glass
        
        // Neon Aurora bottom border gradient line
        int segW = Math.max(1, this.width / 8);
        int[] auroraColors = {0xFF00FBFF, 0xFF00D4FF, 0xFF3BA3FF, 0xFF7B6FFF, 0xFFA855F7, 0xFFD946EF, 0xFFA855F7, 0xFF7B6FFF};
        for (int s = 0; s < 8; s++) {
            int axStart = s * segW;
            int axEnd = (s == 7) ? this.width : (s + 1) * segW;
            context.fill(axStart, 34, axEnd, 36, auroraColors[s]);
        }

        // Left: Presets label & buttons
        context.drawTextWithShadow(this.textRenderer, I18n.translate("marinmc.menu.presets"), 10, 14, 0xFFA1A1AA);
        String[] presetNames = {"classic", "left_aligned", "minimal", "clean", "reset"};
        String[] presetLabels = {
            I18n.translate("marinmc.preset.classic"),
            I18n.translate("marinmc.preset.left"),
            I18n.translate("marinmc.preset.minimal"),
            I18n.translate("marinmc.preset.clean"),
            I18n.translate("marinmc.preset.reset")
        };
        int currentX = 72; // Shifted right to prevent overlap with "Şablonlar:"
        for (int i = 0; i < presetNames.length; i++) {
            int bx = currentX;
            int by = 8;
            int bw = 48;
            int bh = 20;
            boolean hover = mouseX >= bx && mouseX <= bx + bw && mouseY >= by && mouseY <= by + bh;
            int btnColor = hover ? 0x602D7DD2 : 0x15FFFFFF;
            int borderColor = hover ? 0xFF2D7DD2 : 0x30FFFFFF;
            drawRoundedRect(context, bx, by, bw, bh, btnColor, 4);
            drawRoundedBorder(context, bx, by, bw, bh, borderColor, 4);
            context.drawCenteredTextWithShadow(this.textRenderer, presetLabels[i], bx + bw / 2, by + 6, 0xFFFFFFFF);
            currentX += 54;
        }

        // Undo & Redo Buttons
        int undoX = currentX + 8;
        int btnY = 8;
        int btnW = 20;
        int btnH = 20;
        boolean undoHover = mouseX >= undoX && mouseX <= undoX + btnW && mouseY >= btnY && mouseY <= btnY + btnH;
        boolean undoEnabled = !undoStack.isEmpty();
        int undoBg = undoEnabled ? (undoHover ? 0x602D7DD2 : 0x15FFFFFF) : 0x10FFFFFF;
        int undoBorder = undoEnabled ? (undoHover ? 0xFF2D7DD2 : 0x20FFFFFF) : 0x10FFFFFF;
        drawRoundedRect(context, undoX, btnY, btnW, btnH, undoBg, 4);
        drawRoundedBorder(context, undoX, btnY, btnW, btnH, undoBorder, 4);
        context.drawCenteredTextWithShadow(this.textRenderer, "↩", undoX + btnW / 2, btnY + 6, undoEnabled ? 0xFFFFFFFF : 0x55FFFFFF);

        int redoX = undoX + 24;
        boolean redoHover = mouseX >= redoX && mouseX <= redoX + btnW && mouseY >= btnY && mouseY <= btnY + btnH;
        boolean redoEnabled = !redoStack.isEmpty();
        int redoBg = redoEnabled ? (redoHover ? 0x602D7DD2 : 0x15FFFFFF) : 0x10FFFFFF;
        int redoBorder = redoEnabled ? (redoHover ? 0xFF2D7DD2 : 0x20FFFFFF) : 0x10FFFFFF;
        drawRoundedRect(context, redoX, btnY, btnW, btnH, redoBg, 4);
        drawRoundedBorder(context, redoX, btnY, btnW, btnH, redoBorder, 4);
        context.drawCenteredTextWithShadow(this.textRenderer, "↪", redoX + btnW / 2, btnY + 6, redoEnabled ? 0xFFFFFFFF : 0x55FFFFFF);

        // Middle: Grid toggles
        int gridX = redoX + 38;
        context.drawTextWithShadow(this.textRenderer, I18n.translate("marinmc.menu.grid_snapping"), gridX, 14, 0xFFA1A1AA);
        int[] gridSizes = {0, 5, 10};
        String[] gridLabels = {I18n.translate("marinmc.grid.off"), "5px", "10px"};
        for (int i = 0; i < 3; i++) {
            int bx = gridX + 110 + i * 36; // Shifted from +76 to +110 to prevent overlap with "Izgaraya Hizalama:"
            int by = 8;
            int bw = 32;
            int bh = 20;
            boolean isCurrent = gridSnappingSize == gridSizes[i];
            boolean hover = mouseX >= bx && mouseX <= bx + bw && mouseY >= by && mouseY <= by + bh;
            int btnColor = isCurrent ? 0x602D7DD2 : (hover ? 0x25FFFFFF : 0x15FFFFFF);
            int borderColor = isCurrent ? 0xFF2D7DD2 : (hover ? 0x40FFFFFF : 0x20FFFFFF);
            drawRoundedRect(context, bx, by, bw, bh, btnColor, 4);
            drawRoundedBorder(context, bx, by, bw, bh, borderColor, 4);
            context.drawCenteredTextWithShadow(this.textRenderer, gridLabels[i], bx + bw / 2, by + 6, 0xFFFFFFFF);
        }

        // Right: Close Button & Reset All Button (Rounded style)
        int closeBtnW = 75;
        int closeBtnX = this.width - closeBtnW - 12;
        boolean closeHover = mouseX >= closeBtnX && mouseX <= closeBtnX + closeBtnW && mouseY >= 8 && mouseY <= 28;
        drawRoundedRect(context, closeBtnX, 8, closeBtnW, 20, closeHover ? 0x800ECB81 : 0x400ECB81, 4);
        drawRoundedBorder(context, closeBtnX, 8, closeBtnW, 20, closeHover ? 0xFF0ECB81 : 0x600ECB81, 4);
        context.drawCenteredTextWithShadow(this.textRenderer, I18n.translate("marinmc.menu.save_close"), closeBtnX + closeBtnW / 2, 14, 0xFFFFFFFF);

        int resetAllW = 70;
        int resetAllX = closeBtnX - resetAllW - 8;
        boolean resetAllHover = mouseX >= resetAllX && mouseX <= resetAllX + resetAllW && mouseY >= 8 && mouseY <= 28;
        drawRoundedRect(context, resetAllX, 8, resetAllW, 20, resetAllHover ? 0x80EF4444 : 0x40EF4444, 4);
        drawRoundedBorder(context, resetAllX, 8, resetAllW, 20, resetAllHover ? 0xFFEF4444 : 0x60EF4444, 4);
        context.drawCenteredTextWithShadow(this.textRenderer, I18n.translate("marinmc.editor.reset_all"), resetAllX + resetAllW / 2, 14, 0xFFFFFFFF);

        // Draw help hint at the bottom
        String descText = I18n.translate("marinmc.menu.hud_editor_desc");
        context.drawCenteredTextWithShadow(this.textRenderer, descText, this.width / 2 + getSidebarWidth() / 2, this.height - 18, 0xFFA1A1AA);

        // Draw popup settings if an element is selected (Modern premium glassmorphic popup modal)
        if (selectedElement != null) {
            int panelW = 240;
            int panelH = 260;
            int px = this.width / 2 - panelW / 2;
            int py = this.height / 2 - panelH / 2;

            // Rounded glassmorphic panel body
            drawRoundedRect(context, px, py, panelW, panelH, 0xED03050C, 8);
            drawRoundedBorder(context, px, py, panelW, panelH, 0xAA2D7DD2, 8);
            
            // Rounded header area inside
            drawRoundedRect(context, px + 1, py + 1, panelW - 2, 22, 0x252D7DD2, 7);

            context.drawCenteredTextWithShadow(
                this.textRenderer, 
                selectedElement.getName() + " - " + I18n.translate("marinmc.tab.settings"), 
                this.width / 2, 
                py + 7, 
                0xFFFFFFFF
            );

            // 1. Color Themes (Rounded circle theme selectors)
            context.drawTextWithShadow(this.textRenderer, I18n.translate("marinmc.menu.theme"), px + 12, py + 32, 0xFFA1A1AA);
            String[] themes = {"white", "red", "green", "blue", "purple", "orange"};
            int[] themeColors = {0xFFFFFFFF, 0xFFEF4444, 0xFF22C55E, 0xFF2D7DD2, 0xFFA78BFA, 0xFFF97316};
            for (int i = 0; i < 6; i++) {
                int bx = px + 52 + i * 28;
                boolean isCurrent = themes[i].equalsIgnoreCase(selectedElement.getColorTheme());
                drawRoundedRect(context, bx, py + 30, 22, 12, themeColors[i], 3);
                if (isCurrent) {
                    drawRoundedBorder(context, bx - 1, py + 29, 24, 14, 0xFFFFFFFF, 4);
                } else {
                    drawRoundedBorder(context, bx - 1, py + 29, 24, 14, 0x44FFFFFF, 4);
                }
            }

            // 2. Scale slider (Rounded styles)
            context.drawTextWithShadow(this.textRenderer, I18n.translate("marinmc.menu.scale"), px + 12, py + 57, 0xFFA1A1AA);
            int sliderX = px + 52;
            int sliderW = 120;
            int sliderY = py + 58;
            drawRoundedRect(context, sliderX, sliderY, sliderW, 4, 0x30FFFFFF, 2);
            float scaleProgress = (selectedElement.getScale() - 0.5f) / 1.5f;
            int fillW = (int)(scaleProgress * sliderW);
            drawRoundedRect(context, sliderX, sliderY, fillW, 4, 0xFF2D7DD2, 2);
            drawRoundedRect(context, sliderX + fillW - 2, sliderY - 2, 4, 8, 0xFFFFFFFF, 2);
            
            boolean decScaleHover = mouseX >= px + 180 && mouseX <= px + 192 && mouseY >= py + 54 && mouseY <= py + 66;
            int decBg = decScaleHover ? 0x602D7DD2 : 0x15FFFFFF;
            int decBorder = decScaleHover ? 0xFF2D7DD2 : 0x30FFFFFF;
            drawRoundedRect(context, px + 180, py + 54, 12, 12, decBg, 3);
            drawRoundedBorder(context, px + 180, py + 54, 12, 12, decBorder, 3);
            context.drawCenteredTextWithShadow(this.textRenderer, "-", px + 186, py + 56, 0xFFFFFFFF);
            
            boolean incScaleHover = mouseX >= px + 196 && mouseX <= px + 208 && mouseY >= py + 54 && mouseY <= py + 66;
            int incBg = incScaleHover ? 0x602D7DD2 : 0x15FFFFFF;
            int incBorder = incScaleHover ? 0xFF2D7DD2 : 0x30FFFFFF;
            drawRoundedRect(context, px + 196, py + 54, 12, 12, incBg, 3);
            drawRoundedBorder(context, px + 196, py + 54, 12, 12, incBorder, 3);
            context.drawCenteredTextWithShadow(this.textRenderer, "+", px + 202, py + 56, 0xFFFFFFFF);

            String scaleText = String.format("%.1fx", selectedElement.getScale());
            context.drawText(this.textRenderer, scaleText, px + 214, py + 56, 0xFFFFFFFF, false);

            // 3. Opacity slider
            context.drawTextWithShadow(this.textRenderer, I18n.translate("marinmc.menu.opacity"), px + 12, py + 81, 0xFFA1A1AA);
            int opSliderY = py + 82;
            drawRoundedRect(context, sliderX, opSliderY, sliderW, 4, 0x30FFFFFF, 2);
            float opProgress = selectedElement.getBgOpacity() / 255f;
            int opFillW = (int)(opProgress * sliderW);
            drawRoundedRect(context, sliderX, opSliderY, opFillW, 4, 0xFF2D7DD2, 2);
            drawRoundedRect(context, sliderX + opFillW - 2, opSliderY - 2, 4, 8, 0xFFFFFFFF, 2);
            
            boolean decOpHover = mouseX >= px + 180 && mouseX <= px + 192 && mouseY >= py + 78 && mouseY <= py + 90;
            int decOpBg = decOpHover ? 0x602D7DD2 : 0x15FFFFFF;
            int decOpBorder = decOpHover ? 0xFF2D7DD2 : 0x30FFFFFF;
            drawRoundedRect(context, px + 180, py + 78, 12, 12, decOpBg, 3);
            drawRoundedBorder(context, px + 180, py + 78, 12, 12, decOpBorder, 3);
            context.drawCenteredTextWithShadow(this.textRenderer, "-", px + 186, py + 80, 0xFFFFFFFF);
            
            boolean incOpHover = mouseX >= px + 196 && mouseX <= px + 208 && mouseY >= py + 78 && mouseY <= py + 90;
            int incOpBg = incOpHover ? 0x602D7DD2 : 0x15FFFFFF;
            int incOpBorder = incOpHover ? 0xFF2D7DD2 : 0x30FFFFFF;
            drawRoundedRect(context, px + 196, py + 78, 12, 12, incOpBg, 3);
            drawRoundedBorder(context, px + 196, py + 78, 12, 12, incOpBorder, 3);
            context.drawCenteredTextWithShadow(this.textRenderer, "+", px + 202, py + 80, 0xFFFFFFFF);

            String opText = Math.round(opProgress * 100) + "%";
            context.drawText(this.textRenderer, opText, px + 214, py + 80, 0xFFFFFFFF, false);

            // 4. Border Radius slider
            context.drawTextWithShadow(this.textRenderer, I18n.translate("marinmc.menu.radius"), px + 12, py + 105, 0xFFA1A1AA);
            int radSliderY = py + 106;
            drawRoundedRect(context, sliderX, radSliderY, sliderW, 4, 0x30FFFFFF, 2);
            float radProgress = selectedElement.getBorderRadius() / 10f;
            int radFillW = (int)(radProgress * sliderW);
            drawRoundedRect(context, sliderX, radSliderY, radFillW, 4, 0xFF2D7DD2, 2);
            drawRoundedRect(context, sliderX + radFillW - 2, radSliderY - 2, 4, 8, 0xFFFFFFFF, 2);
            
            boolean decRadHover = mouseX >= px + 180 && mouseX <= px + 192 && mouseY >= py + 102 && mouseY <= py + 114;
            int decRadBg = decRadHover ? 0x602D7DD2 : 0x15FFFFFF;
            int decRadBorder = decRadHover ? 0xFF2D7DD2 : 0x30FFFFFF;
            drawRoundedRect(context, px + 180, py + 102, 12, 12, decRadBg, 3);
            drawRoundedBorder(context, px + 180, py + 102, 12, 12, decRadBorder, 3);
            context.drawCenteredTextWithShadow(this.textRenderer, "-", px + 186, py + 104, 0xFFFFFFFF);
            
            boolean incRadHover = mouseX >= px + 196 && mouseX <= px + 208 && mouseY >= py + 102 && mouseY <= py + 114;
            int incRadBg = incRadHover ? 0x602D7DD2 : 0x15FFFFFF;
            int incRadBorder = incRadHover ? 0xFF2D7DD2 : 0x30FFFFFF;
            drawRoundedRect(context, px + 196, py + 102, 12, 12, incRadBg, 3);
            drawRoundedBorder(context, px + 196, py + 102, 12, 12, incRadBorder, 3);
            context.drawCenteredTextWithShadow(this.textRenderer, "+", px + 202, py + 104, 0xFFFFFFFF);

            String radText = selectedElement.getBorderRadius() + "px";
            context.drawText(this.textRenderer, radText, px + 214, py + 104, 0xFFFFFFFF, false);

            // 5. Shadow & BG Box Row (Rounded toggles)
            context.drawTextWithShadow(this.textRenderer, I18n.translate("marinmc.menu.shadow"), px + 12, py + 129, 0xFFA1A1AA);
            boolean shaHover = mouseX >= px + 52 && mouseX <= px + 102 && mouseY >= py + 126 && mouseY <= py + 140;
            int shaBtnColor = selectedElement.isTextShadow() ? 0x602D7DD2 : 0x15FFFFFF;
            int shaBorderColor = selectedElement.isTextShadow() ? 0xFF2D7DD2 : 0x30FFFFFF;
            drawRoundedRect(context, px + 52, py + 126, 50, 14, shaHover ? shaBtnColor + 0x20000000 : shaBtnColor, 3);
            drawRoundedBorder(context, px + 52, py + 126, 50, 14, shaHover ? 0xFF2D7DD2 : shaBorderColor, 3);
            context.drawCenteredTextWithShadow(this.textRenderer, selectedElement.isTextShadow() ? I18n.translate("marinmc.menu.on") : I18n.translate("marinmc.menu.off"), px + 77, py + 129, 0xFFFFFFFF);

            context.drawTextWithShadow(this.textRenderer, I18n.translate("marinmc.menu.bg_box"), px + 114, py + 129, 0xFFA1A1AA);
            boolean bgHover = mouseX >= px + 154 && mouseX <= px + 194 && mouseY >= py + 126 && mouseY <= py + 140;
            int bgBtnColor = selectedElement.isShowBackground() ? 0x602D7DD2 : 0x15FFFFFF;
            int bgBorderColor = selectedElement.isShowBackground() ? 0xFF2D7DD2 : 0x30FFFFFF;
            drawRoundedRect(context, px + 154, py + 126, 40, 14, bgHover ? bgBtnColor + 0x20000000 : bgBtnColor, 3);
            drawRoundedBorder(context, px + 154, py + 126, 40, 14, bgHover ? 0xFF2D7DD2 : bgBorderColor, 3);
            context.drawCenteredTextWithShadow(this.textRenderer, selectedElement.isShowBackground() ? I18n.translate("marinmc.menu.on") : I18n.translate("marinmc.menu.off"), px + 174, py + 129, 0xFFFFFFFF);

            // 6. Visible & Brackets Row
            context.drawTextWithShadow(this.textRenderer, I18n.translate("marinmc.menu.visible"), px + 12, py + 153, 0xFFA1A1AA);
            boolean visHover = mouseX >= px + 52 && mouseX <= px + 102 && mouseY >= py + 150 && mouseY <= py + 164;
            int visBtnColor = selectedElement.isEnabled() ? 0x602D7DD2 : 0x15FFFFFF;
            int visBorderColor = selectedElement.isEnabled() ? 0xFF2D7DD2 : 0x30FFFFFF;
            drawRoundedRect(context, px + 52, py + 150, 50, 14, visHover ? visBtnColor + 0x20000000 : visBtnColor, 3);
            drawRoundedBorder(context, px + 52, py + 150, 50, 14, visHover ? 0xFF2D7DD2 : visBorderColor, 3);
            context.drawCenteredTextWithShadow(this.textRenderer, selectedElement.isEnabled() ? I18n.translate("marinmc.menu.yes") : I18n.translate("marinmc.menu.no"), px + 77, py + 153, 0xFFFFFFFF);

            context.drawTextWithShadow(this.textRenderer, I18n.translate("marinmc.menu.brackets"), px + 108, py + 153, 0xFFA1A1AA);
            boolean braHover = mouseX >= px + 154 && mouseX <= px + 214 && mouseY >= py + 150 && mouseY <= py + 164;
            drawRoundedRect(context, px + 154, py + 150, 60, 14, braHover ? 0x40FFFFFF : 0x15FFFFFF, 3);
            drawRoundedBorder(context, px + 154, py + 150, 60, 14, braHover ? 0xFF2D7DD2 : 0x30FFFFFF, 3);
            String displayBracket = selectedElement.getBracketType();
            if ("none".equals(displayBracket)) displayBracket = I18n.translate("marinmc.menu.off");
            context.drawCenteredTextWithShadow(this.textRenderer, displayBracket, px + 184, py + 153, 0xFFFFFFFF);

            // 7. Position & Center Row
            context.drawTextWithShadow(this.textRenderer, I18n.translate("marinmc.editor.position"), px + 12, py + 177, 0xFFA1A1AA);
            String posText = "X: " + selectedElement.getX() + " Y: " + selectedElement.getY();
            context.drawTextWithShadow(this.textRenderer, posText, px + 68, py + 177, 0xFFFFFFFF);

            boolean centerHover = mouseX >= px + 154 && mouseX <= px + 214 && mouseY >= py + 174 && mouseY <= py + 188;
            drawRoundedRect(context, px + 154, py + 174, 60, 14, centerHover ? 0x802D7DD2 : 0x402D7DD2, 3);
            drawRoundedBorder(context, px + 154, py + 174, 60, 14, centerHover ? 0xFF2D7DD2 : 0x602D7DD2, 3);
            context.drawCenteredTextWithShadow(this.textRenderer, I18n.translate("marinmc.editor.center"), px + 184, py + 177, 0xFFFFFFFF);

            // 8. Action Buttons (Rounded emerald/rose actions)
            int actionBtnY = py + 225;
            int resetX = px + 12;
            boolean resetHover = mouseX >= resetX && mouseX <= resetX + 100 && mouseY >= actionBtnY && mouseY <= actionBtnY + 18;
            drawRoundedRect(context, resetX, actionBtnY, 100, 18, resetHover ? 0x80EF4444 : 0x40EF4444, 4);
            drawRoundedBorder(context, resetX, actionBtnY, 100, 18, resetHover ? 0xFFEF4444 : 0x60EF4444, 4);
            context.drawCenteredTextWithShadow(this.textRenderer, I18n.translate("marinmc.menu.reset_pos"), resetX + 50, actionBtnY + 5, 0xFFFFFFFF);

            int saveX = px + panelW - 112;
            boolean saveHover = mouseX >= saveX && mouseX <= saveX + 100 && mouseY >= actionBtnY && mouseY <= actionBtnY + 18;
            drawRoundedRect(context, saveX, actionBtnY, 100, 18, saveHover ? 0x800ECB81 : 0x400ECB81, 4);
            drawRoundedBorder(context, saveX, actionBtnY, 100, 18, saveHover ? 0xFF0ECB81 : 0x600ECB81, 4);
            context.drawCenteredTextWithShadow(this.textRenderer, I18n.translate("marinmc.menu.save_close"), saveX + 50, actionBtnY + 5, 0xFFFFFFFF);
        }

        super.render(context, mouseX, mouseY, delta);
    }

    @Override
    public boolean mouseScrolled(double mouseX, double mouseY, double horizontalAmount, double verticalAmount) {
        if (sidebarOpen && mouseX >= 0 && mouseX <= SIDEBAR_WIDTH && mouseY >= 36) {
            int maxScroll = Math.max(0, HudManager.getInstance().getElements().size() * ROW_HEIGHT - (this.height - 36 - 20));
            sidebarScrollOffset = Math.max(0, Math.min(maxScroll, sidebarScrollOffset - (int)(verticalAmount * 12)));
            return true;
        }
        return super.mouseScrolled(mouseX, mouseY, horizontalAmount, verticalAmount);
    }

    @Override
    public boolean keyPressed(int keyCode, int scanCode, int modifiers) {
        if (Screen.hasControlDown()) {
            if (keyCode == 90) { // Z
                undo();
                return true;
            } else if (keyCode == 89) { // Y
                redo();
                return true;
            }
        }
        return super.keyPressed(keyCode, scanCode, modifiers);
    }

    @Override
    public boolean mouseClicked(double mouseX, double mouseY, int button) {
        // Toggle collapsible sidebar click
        int tabX = sidebarOpen ? SIDEBAR_WIDTH : 0;
        int tabY = this.height / 2 - 15;
        if (mouseX >= tabX && mouseX <= tabX + 12 && mouseY >= tabY && mouseY <= tabY + 30) {
            sidebarOpen = !sidebarOpen;
            return true;
        }

        // Left elements list panel click
        if (sidebarOpen && mouseX >= 0 && mouseX <= SIDEBAR_WIDTH && mouseY >= 36) {
            int sidebarY = 36;
            int currentElementY = sidebarY + 20 - sidebarScrollOffset;
            for (HudElement el : HudManager.getInstance().getElements()) {
                if (mouseY >= currentElementY && mouseY <= currentElementY + ROW_HEIGHT) {
                    if (mouseX >= 0 && mouseX <= 18) { // Updated from 14 to 18 to match larger circle status badge
                        saveUndoState();
                        el.setEnabled(!el.isEnabled());
                        HudManager.getInstance().saveConfig();
                    } else {
                        selectedElement = el;
                    }
                    return true;
                }
                currentElementY += ROW_HEIGHT;
            }
            return true;
        }

        // Top control panel click
        if (mouseY >= 0 && mouseY <= 36) {
            String[] presetNames = {"classic", "left_aligned", "minimal", "clean", "reset"};
            
            // Presets
            int currentX = 72; // Updated from 58 to 72 to match rendering offset
            for (int i = 0; i < 5; i++) {
                int bx = currentX;
                int by = 8;
                int bw = 48;
                int bh = 20;
                if (mouseX >= bx && mouseX <= bx + bw && mouseY >= by && mouseY <= by + bh) {
                    saveUndoState();
                    HudManager.getInstance().applyPreset(presetNames[i]);
                    return true;
                }
                currentX += 54;
            }

            // Undo / Redo Buttons click
            int undoX = currentX + 8;
            if (mouseX >= undoX && mouseX <= undoX + 20 && mouseY >= 8 && mouseY <= 28) {
                undo();
                return true;
            }

            int redoX = undoX + 24;
            if (mouseX >= redoX && mouseX <= redoX + 20 && mouseY >= 8 && mouseY <= 28) {
                redo();
                return true;
            }

            // Grid snapping
            int gridX = redoX + 38;
            int[] gridSizes = {0, 5, 10};
            for (int i = 0; i < 3; i++) {
                int bx = gridX + 110 + i * 36; // Updated from +76 to +110 to match rendering offset
                int by = 8;
                int bw = 32;
                int bh = 20;
                if (mouseX >= bx && mouseX <= bx + bw && mouseY >= by && mouseY <= by + bh) {
                    gridSnappingSize = gridSizes[i];
                    return true;
                }
            }

            // Save & Close
            int closeBtnW = 75;
            int closeBtnX = this.width - closeBtnW - 12;
            if (mouseX >= closeBtnX && mouseX <= closeBtnX + closeBtnW && mouseY >= 8 && mouseY <= 28) {
                this.close();
                return true;
            }

            // Reset All
            int resetAllW = 70;
            int resetAllX = closeBtnX - resetAllW - 8;
            if (mouseX >= resetAllX && mouseX <= resetAllX + resetAllW && mouseY >= 8 && mouseY <= 28) {
                saveUndoState();
                HudManager.getInstance().applyPreset("reset");
                HudManager.getInstance().saveConfig();
                return true;
            }
            return true;
        }

        // Popup customization panel click
        if (selectedElement != null) {
            int panelW = 240;
            int panelH = 260;
            int px = this.width / 2 - panelW / 2;
            int py = this.height / 2 - panelH / 2;

            if (mouseX >= px && mouseX <= px + panelW && mouseY >= py && mouseY <= py + panelH) {
                // 1. Color Themes
                int buttonY = py + 29;
                String[] themes = {"white", "red", "green", "blue", "purple", "orange"};
                for (int i = 0; i < 6; i++) {
                    int bx = px + 52 + i * 28;
                    if (mouseX >= bx && mouseX <= bx + 22 && mouseY >= buttonY && mouseY <= buttonY + 14) {
                        saveUndoState();
                        selectedElement.setColorTheme(themes[i]);
                        HudManager.getInstance().saveConfig();
                        return true;
                    }
                }

                // 2. Scale slider drag/click
                int sliderX = px + 52;
                int sliderW = 120;
                if (mouseX >= sliderX && mouseX <= sliderX + sliderW && mouseY >= py + 54 && mouseY <= py + 66) {
                    float ratio = (float)(mouseX - sliderX) / sliderW;
                    ratio = Math.max(0f, Math.min(1f, ratio));
                    float newScale = 0.5f + ratio * 1.5f;
                    newScale = (float)(Math.round(newScale * 10.0) / 10.0);
                    saveUndoState();
                    selectedElement.setScale(newScale);
                    HudManager.getInstance().saveConfig();
                    return true;
                }

                // - and + buttons for Scale
                if (mouseY >= py + 54 && mouseY <= py + 66) {
                    if (mouseX >= px + 180 && mouseX <= px + 192) {
                        saveUndoState();
                        float newScale = Math.max(0.5f, (float)(Math.round((selectedElement.getScale() - 0.1f) * 10.0) / 10.0));
                        selectedElement.setScale(newScale);
                        HudManager.getInstance().saveConfig();
                        return true;
                    }
                    if (mouseX >= px + 196 && mouseX <= px + 208) {
                        saveUndoState();
                        float newScale = Math.min(2.0f, (float)(Math.round((selectedElement.getScale() + 0.1f) * 10.0) / 10.0));
                        selectedElement.setScale(newScale);
                        HudManager.getInstance().saveConfig();
                        return true;
                    }
                }

                // 3. Opacity slider drag/click
                if (mouseX >= sliderX && mouseX <= sliderX + sliderW && mouseY >= py + 78 && mouseY <= py + 90) {
                    float ratio = (float)(mouseX - sliderX) / sliderW;
                    ratio = Math.max(0f, Math.min(1f, ratio));
                    int newOp = (int)(ratio * 255);
                    saveUndoState();
                    selectedElement.setBgOpacity(newOp);
                    HudManager.getInstance().saveConfig();
                    return true;
                }

                // - and + buttons for Opacity
                if (mouseY >= py + 78 && mouseY <= py + 90) {
                    if (mouseX >= px + 180 && mouseX <= px + 192) {
                        saveUndoState();
                        int curOpPercent = (selectedElement.getBgOpacity() * 100) / 255;
                        int newPercent = Math.max(0, ((curOpPercent - 10) / 10) * 10);
                        selectedElement.setBgOpacity((newPercent * 255) / 100);
                        HudManager.getInstance().saveConfig();
                        return true;
                    }
                    if (mouseX >= px + 196 && mouseX <= px + 208) {
                        saveUndoState();
                        int curOpPercent = (selectedElement.getBgOpacity() * 100) / 255;
                        int newPercent = Math.min(100, ((curOpPercent + 10) / 10) * 10);
                        selectedElement.setBgOpacity((newPercent * 255) / 100);
                        HudManager.getInstance().saveConfig();
                        return true;
                    }
                }

                // 4. Border Radius slider drag/click
                if (mouseX >= sliderX && mouseX <= sliderX + sliderW && mouseY >= py + 102 && mouseY <= py + 114) {
                    float ratio = (float)(mouseX - sliderX) / sliderW;
                    ratio = Math.max(0f, Math.min(1f, ratio));
                    int newRad = Math.round(ratio * 10);
                    saveUndoState();
                    selectedElement.setBorderRadius(newRad);
                    HudManager.getInstance().saveConfig();
                    return true;
                }

                // - and + buttons for Border Radius
                if (mouseY >= py + 102 && mouseY <= py + 114) {
                    if (mouseX >= px + 180 && mouseX <= px + 192) {
                        saveUndoState();
                        int newRad = Math.max(0, selectedElement.getBorderRadius() - 1);
                        selectedElement.setBorderRadius(newRad);
                        HudManager.getInstance().saveConfig();
                        return true;
                    }
                    if (mouseX >= px + 196 && mouseX <= px + 208) {
                        saveUndoState();
                        int newRad = Math.min(10, selectedElement.getBorderRadius() + 1);
                        selectedElement.setBorderRadius(newRad);
                        HudManager.getInstance().saveConfig();
                        return true;
                    }
                }

                // 5. Shadow & BG Box Row
                if (mouseY >= py + 126 && mouseY <= py + 140) {
                    if (mouseX >= px + 52 && mouseX <= px + 102) {
                        saveUndoState();
                        selectedElement.setTextShadow(!selectedElement.isTextShadow());
                        HudManager.getInstance().saveConfig();
                        return true;
                    }
                    if (mouseX >= px + 154 && mouseX <= px + 194) {
                        saveUndoState();
                        selectedElement.setShowBackground(!selectedElement.isShowBackground());
                        HudManager.getInstance().saveConfig();
                        return true;
                    }
                }

                // 6. Visible & Brackets Row
                if (mouseY >= py + 150 && mouseY <= py + 164) {
                    if (mouseX >= px + 52 && mouseX <= px + 102) {
                        saveUndoState();
                        selectedElement.setEnabled(!selectedElement.isEnabled());
                        HudManager.getInstance().saveConfig();
                        return true;
                    }
                    if (mouseX >= px + 154 && mouseX <= px + 214) {
                        saveUndoState();
                        String cur = selectedElement.getBracketType();
                        String next = "none";
                        if ("none".equals(cur)) next = "[]";
                        else if ("[]".equals(cur) || "square".equals(cur)) next = "()";
                        else if ("()".equals(cur) || "parentheses".equals(cur)) next = "{}";
                        else if ("{}".equals(cur) || "braces".equals(cur)) next = "<>";
                        else if ("<>".equals(cur) || "chevrons".equals(cur)) next = "none";
                        selectedElement.setBracketType(next);
                        HudManager.getInstance().saveConfig();
                        return true;
                    }
                }

                // 7. Center Button
                if (mouseX >= px + 154 && mouseX <= px + 214 && mouseY >= py + 174 && mouseY <= py + 188) {
                    saveUndoState();
                    selectedElement.setX(this.width / 2 - selectedElement.getWidth() / 2);
                    selectedElement.setY(this.height / 2 - selectedElement.getHeight() / 2);
                    HudManager.getInstance().saveConfig();
                    return true;
                }

                // 8. Action Buttons
                int actionBtnY = py + 225;
                int resetX = px + 12;
                if (mouseX >= resetX && mouseX <= resetX + 100 && mouseY >= actionBtnY && mouseY <= actionBtnY + 18) {
                    saveUndoState();
                    selectedElement.setX(this.width / 2 - selectedElement.getWidth() / 2);
                    selectedElement.setY(this.height / 2 - selectedElement.getHeight() / 2);
                    HudManager.getInstance().saveConfig();
                    selectedElement = null;
                    return true;
                }

                int saveX = px + panelW - 112;
                if (mouseX >= saveX && mouseX <= saveX + 100 && mouseY >= actionBtnY && mouseY <= actionBtnY + 18) {
                    selectedElement = null;
                    return true;
                }
                return true;
            } else {
                selectedElement = null;
                return true;
            }
        }

        if (button == 0) {
            for (HudElement element : HudManager.getInstance().getElements()) {
                if (element.isEnabled() && element.isHovered(mouseX, mouseY) && mouseX > getSidebarWidth()) {
                    draggedElement = element;
                    dragOffsetX = (int)mouseX - element.getX();
                    dragOffsetY = (int)mouseY - element.getY();
                    snapLineX = -1;
                    snapLineY = -1;
                    saveUndoState();
                    return true;
                }
            }
        } else if (button == 1) {
            for (HudElement element : HudManager.getInstance().getElements()) {
                if (element.isHovered(mouseX, mouseY) && mouseX > getSidebarWidth()) {
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
            
            int centerX = this.width / 2;
            int centerY = this.height / 2;
            
            snapLineX = -1;
            snapLineY = -1;
            
            // Grid Snapping
            if (gridSnappingSize > 0) {
                newX = Math.round((float)newX / gridSnappingSize) * gridSnappingSize;
                newY = Math.round((float)newY / gridSnappingSize) * gridSnappingSize;
            }
            
            int draggedW = draggedElement.getWidth();
            int draggedH = draggedElement.getHeight();
            int draggedCenterX = newX + draggedW / 2;
            int draggedCenterY = newY + draggedH / 2;
            
            // Snap to screen center
            if (Math.abs(draggedCenterX - centerX) < 6) {
                newX = centerX - draggedW / 2;
                snapLineX = centerX;
            }
            if (Math.abs(draggedCenterY - centerY) < 6) {
                newY = centerY - draggedH / 2;
                snapLineY = centerY;
            }
            
            // Snap to other elements
            for (HudElement el : HudManager.getInstance().getElements()) {
                if (el == draggedElement || !el.isEnabled()) continue;
                
                int elX = el.getX();
                int elW = el.getWidth();
                int elY = el.getY();
                int elH = el.getHeight();
                int elCenterX = elX + elW / 2;
                int elCenterY = elY + elH / 2;
                
                if (Math.abs(newX - elX) < 6) {
                    newX = elX;
                    snapLineX = elX;
                }
                else if (Math.abs(newX - (elX + elW)) < 6) {
                    newX = elX + elW;
                    snapLineX = elX + elW;
                }
                else if (Math.abs((newX + draggedW) - elX) < 6) {
                    newX = elX - draggedW;
                    snapLineX = elX;
                }
                else if (Math.abs((newX + draggedW) - (elX + elW)) < 6) {
                    newX = elX + elW - draggedW;
                    snapLineX = elX + elW;
                }
                else if (Math.abs(draggedCenterX - elCenterX) < 6) {
                    newX = elCenterX - draggedW / 2;
                    snapLineX = elCenterX;
                }
                
                if (Math.abs(newY - elY) < 6) {
                    newY = elY;
                    snapLineY = elY;
                }
                else if (Math.abs(newY - (elY + elH)) < 6) {
                    newY = elY + elH;
                    snapLineY = elY + elH;
                }
                else if (Math.abs((newY + draggedH) - elY) < 6) {
                    newY = elY - draggedH;
                    snapLineY = elY;
                }
                else if (Math.abs((newY + draggedH) - (elY + elH)) < 6) {
                    newY = elY + elH - draggedH;
                    snapLineY = elY + elH;
                }
                else if (Math.abs(draggedCenterY - elCenterY) < 6) {
                    newY = elCenterY - draggedH / 2;
                    snapLineY = elCenterY;
                }
            }
            
            // Bounds clamping
            newX = Math.max(getSidebarWidth(), Math.min(this.width - draggedElement.getWidth(), newX));
            newY = Math.max(36, Math.min(this.height - draggedElement.getHeight(), newY));
            
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
            snapLineX = -1;
            snapLineY = -1;
            HudManager.getInstance().saveConfig();
            return true;
        }
        return super.mouseReleased(mouseX, mouseY, button);
    }

    @Override
    public boolean shouldPause() {
        return false;
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
}
