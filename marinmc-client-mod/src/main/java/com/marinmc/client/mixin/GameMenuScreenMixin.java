package com.marinmc.client.mixin;

import com.marinmc.client.gui.OverlayScreen;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.gui.screen.GameMenuScreen;
import net.minecraft.client.gui.screen.Screen;
import net.minecraft.client.gui.screen.TitleScreen;
import net.minecraft.client.gui.screen.multiplayer.ConnectScreen;
import net.minecraft.client.gui.screen.option.OptionsScreen;
import net.minecraft.client.gui.screen.option.LanguageOptionsScreen;
import net.minecraft.client.gui.screen.pack.PackScreen;
import net.minecraft.client.gui.widget.ButtonWidget;
import net.minecraft.client.network.ServerAddress;
import net.minecraft.client.network.ServerInfo;
import net.minecraft.text.Text;
import net.minecraft.util.Identifier;
import net.minecraft.client.gl.RenderPipelines;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

@Mixin(GameMenuScreen.class)
public class GameMenuScreenMixin extends Screen {
    private static final Identifier LOGO_TEXTURE = Identifier.of("marinmc-client", "textures/gui/logo.png");

    // UI state variables
    private boolean socialPanelOpen = false;
    private String socialSearchQuery = "";
    private boolean socialSearchFocused = false;
    private int hoveredIconIndex = -1;

    protected GameMenuScreenMixin(Text title) {
        super(title);
    }

    @Inject(method = "init", at = @At("TAIL"))
    private void onInit(CallbackInfo ci) {
        // Clear default Minecraft buttons
        this.clearChildren();

        // 3 Center Buttons: Emotes (symbol/icon), MODS (text), Locker (symbol/icon)
        int btnW = 100;
        int btnH = 20;
        int centerX = this.width / 2;
        int centerY = this.height / 2;

        // Left button: Emotes (jumping figure icon)
        this.addDrawableChild(ButtonWidget.builder(
            Text.literal("🕺"),
            button -> {
                if (this.client != null && this.client.player != null) {
                    this.client.player.sendMessage(Text.literal("§bMarinMC Client §f» §aEmotelar Yakında!"), true);
                }
            }
        ).dimensions(centerX - 70, centerY, 20, btnH).build());

        // Center button: MODS
        this.addDrawableChild(ButtonWidget.builder(
            Text.literal("MODS"),
            button -> {
                if (this.client != null) {
                    this.client.setScreen(new OverlayScreen());
                }
            }
        ).dimensions(centerX - 46, centerY, 92, btnH).build());

        // Right button: Locker (shirt icon)
        this.addDrawableChild(ButtonWidget.builder(
            Text.literal("👕"),
            button -> {
                if (this.client != null) {
                    this.client.setScreen(new OverlayScreen());
                }
            }
        ).dimensions(centerX + 50, centerY, 20, btnH).build());
    }

    @Inject(method = "render", at = @At("HEAD"), cancellable = true)
    private void onRender(DrawContext context, int mouseX, int mouseY, float delta, CallbackInfo ci) {
        // Draw slightly darker blurred overlay
        context.fill(0, 0, this.width, this.height, 0x60000000);

        // 1. Central Logo
        int logoSize = 48;
        int logoX = this.width / 2 - logoSize / 2;
        int logoY = this.height / 2 - 80;
        context.drawTexture(
            RenderPipelines.GUI_TEXTURED,
            LOGO_TEXTURE,
            logoX, logoY,
            0f, 0f,
            logoSize, logoSize,
            logoSize, logoSize
        );
        context.drawCenteredTextWithShadow(this.textRenderer, "LUNAR CLIENT", this.width / 2, logoY + logoSize + 4, 0xFFFFFFFF);

        // Render widgets (the 3 center buttons)
        super.render(context, mouseX, mouseY, delta);

        // 2. Render Bottom-Center Alt Icon Bar (8 Icons)
        int ibW = 8 * 22 + 7 * 4;
        int ibX = this.width / 2 - ibW / 2;
        int ibY = this.height - 30;
        hoveredIconIndex = -1;

        String[] symbols = {"☾", "👕", "💬", "⚙", "🌐", "⬡", "◀◀", "☰"};
        for (int i = 0; i < 8; i++) {
            int ix = ibX + i * 26;
            boolean iconHovered = mouseX >= ix && mouseX <= ix + 22 && mouseY >= ibY && mouseY <= ibY + 22;
            
            context.fill(ix, ibY, ix + 22, ibY + 22, iconHovered ? 0x60555555 : 0x40000000);
            context.drawBorder(ix, ibY, 22, 22, 0x30FFFFFF);
            
            int symColor = iconHovered ? 0xFFFFFFFF : 0xFFA1A1AA;
            context.drawCenteredTextWithShadow(this.textRenderer, symbols[i], ix + 11, ibY + 7, symColor);
            
            if (i == 1) { // active dot for cosmetics
                context.fill(ix + 18, ibY + 2, ix + 22, ibY + 6, 0xFF22C55E);
            }

            if (iconHovered) {
                hoveredIconIndex = i;
            }
        }

        // Draw tooltips ABOVE the hovered icon if any
        if (hoveredIconIndex != -1 && !socialPanelOpen) {
            String[] titles = {"Lunar Settings", "Locker", "Satellite", "Minecraft Settings", "Language", "Minecraft Realms", "Disconnect", "Fabric Mod Menu"};
            String[] subtitles = {"☾ Lunar", "☾ Lunar", "💬 Satellite", "⚙ Minecraft", "🌐 Language", "⚙ Minecraft", "◀◀ Exit World", "⬈ External"};
            
            String title = titles[hoveredIconIndex];
            String subtitle = subtitles[hoveredIconIndex];
            
            int tw = Math.max(90, this.textRenderer.getWidth(title) + 16);
            int th = 28;
            int tx = ibX + hoveredIconIndex * 26 + 11 - tw / 2;
            int ty = ibY - th - 6;
            
            context.fill(tx, ty, tx + tw, ty + th, 0xF00B0F19);
            context.drawBorder(tx, ty, tw, th, 0x40FFFFFF);
            
            context.drawCenteredTextWithShadow(this.textRenderer, title, tx + tw / 2, ty + 4, 0xFFFFFFFF);
            context.drawCenteredTextWithShadow(this.textRenderer, subtitle, tx + tw / 2, ty + 15, 0xFF64748B);
        }

        // 3. Render Bottom-Left Free Medal Quest Card
        int mqX = 10;
        int mqY = this.height - 105;
        int mqW = 145;
        int mqH = 90;
        context.fill(mqX, mqY, mqX + mqW, mqY + mqH, 0xC00B0F19);
        context.drawBorder(mqX, mqY, mqW, mqH, 0x3022C55E);
        context.drawTextWithShadow(this.textRenderer, "🎁 Free Medal Quest", mqX + 6, mqY + 6, 0xFF22C55E);
        
        for (int i = 0; i < 3; i++) {
            int bx = mqX + 6 + i * 28;
            int by = mqY + 20;
            context.fill(bx, by, bx + 24, by + 24, 0x40000000);
            context.drawBorder(bx, by, 24, 24, 0x20FFFFFF);
            String itemSymbol = i == 0 ? "🧥" : i == 1 ? "👾" : "👓";
            context.drawCenteredTextWithShadow(this.textRenderer, itemSymbol, bx + 12, by + 8, 0xFFFFFFFF);
        }
        context.drawTextWithShadow(this.textRenderer, "Earn 1 of 3 cosmetics!", mqX + 6, mqY + 48, 0xFFA1A1AA);
        
        int mqBtnY = mqY + 62;
        boolean mqBtnHovered = mouseX >= mqX + 6 && mouseX <= mqX + mqW - 6 && mouseY >= mqBtnY && mouseY <= mqBtnY + 16;
        context.fill(mqX + 6, mqBtnY, mqX + mqW - 6, mqBtnY + 16, mqBtnHovered ? 0xFF16A34A : 0xFF22C55E);
        context.drawCenteredTextWithShadow(this.textRenderer, "Complete Quest", mqX + mqW / 2, mqBtnY + 4, 0xFFFFFFFF);

        // 4. Render Sliding Social/Friend Menu Panel
        if (socialPanelOpen) {
            int sW = 125;
            context.fill(0, 0, sW, this.height, 0xF00B0F19);
            context.drawBorder(0, 0, sW, this.height, 0x40FFFFFF);
            
            // User Profile
            drawSteveFace(context, 10, 10, 24);
            context.drawTextWithShadow(this.textRenderer, "musbabaff", 40, 12, 0xFFFFFFFF);
            context.drawTextWithShadow(this.textRenderer, "Playing Minecraft 1.21.8", 40, 22, 0xFF22C55E);
            context.drawTextWithShadow(this.textRenderer, "▼", sW - 14, 12, 0xFFA1A1AA);
            
            // Tabs
            context.fill(10, 38, sW / 2 - 2, 50, 0x30BF5BFF);
            context.drawBorder(10, 38, sW / 2 - 12, 12, 0xFFBF5BFF);
            context.drawCenteredTextWithShadow(this.textRenderer, "Friends (0)", 10 + (sW / 2 - 12) / 2, 40, 0xFFFFFFFF);
            
            context.fill(sW / 2 + 2, 38, sW - 10, 50, 0x10FFFFFF);
            context.drawCenteredTextWithShadow(this.textRenderer, "Requests", sW / 2 + 2 + (sW / 2 - 12) / 2, 40, 0xFFA1A1AA);
            
            // Search Friends Bar
            int sbY = 54;
            context.fill(10, sbY, sW - 30, sbY + 14, socialSearchFocused ? 0x90000000 : 0x50000000);
            context.drawBorder(10, sbY, sW - 40, 14, socialSearchFocused ? 0xFFBF5BFF : 0x20FFFFFF);
            String displaySearch = socialSearchQuery.isEmpty() ? (socialSearchFocused ? "" : "Search...") : socialSearchQuery;
            int searchCol = socialSearchQuery.isEmpty() && !socialSearchFocused ? 0xFF64748B : 0xFFFFFFFF;
            context.drawTextWithShadow(this.textRenderer, displaySearch, 14, sbY + 3, searchCol);
            
            // Plus add icon
            int plusX = sW - 24;
            boolean plusHover = mouseX >= plusX && mouseX <= plusX + 14 && mouseY >= sbY && mouseY <= sbY + 14;
            context.fill(plusX, sbY, plusX + 14, sbY + 14, plusHover ? 0x60555555 : 0x30555555);
            context.drawBorder(plusX, sbY, 14, 14, 0x20FFFFFF);
            context.drawCenteredTextWithShadow(this.textRenderer, "+", plusX + 7, sbY + 3, 0xFFFFFFFF);
            
            // Online / Offline sections
            int secY = 74;
            context.drawTextWithShadow(this.textRenderer, "▼ Online (0)", 10, secY, 0xFF64748B);
            context.drawTextWithShadow(this.textRenderer, "▼ Offline (0)", 10, secY + 16, 0xFF64748B);
        }

        ci.cancel(); // Prevent standard escape menu rendering
    }

    @Override
    public boolean mouseClicked(double mouseX, double mouseY, int button) {
        if (socialPanelOpen) {
            int sW = 125;
            
            // Close social panel if clicked outside
            if (mouseX > sW) {
                // Click bubble icon toggles it below, so check it isn't bubble icon click
                int ibW = 8 * 22 + 7 * 4;
                int ibX = this.width / 2 - ibW / 2;
                int ibY = this.height - 30;
                int ix = ibX + 2 * 26;
                if (!(mouseX >= ix && mouseX <= ix + 22 && mouseY >= ibY && mouseY <= ibY + 22)) {
                    socialPanelOpen = false;
                    socialSearchFocused = false;
                }
            } else {
                // Inside social panel clicks
                int sbY = 54;
                if (mouseX >= 10 && mouseX <= sW - 30 && mouseY >= sbY && mouseY <= sbY + 14) {
                    socialSearchFocused = true;
                    return true;
                } else {
                    socialSearchFocused = false;
                }

                // Add Friend plus click
                int plusX = sW - 24;
                if (mouseX >= plusX && mouseX <= plusX + 14 && mouseY >= sbY && mouseY <= sbY + 14) {
                    if (this.client != null && this.client.player != null) {
                        this.client.player.sendMessage(Text.literal("§bSocial §f» §aArkadaş Ekleme özelliği yakında!"), true);
                    }
                    return true;
                }
                return true; // Consume all clicks inside panel
            }
        }

        // Complete Quest button click
        int mqX = 10;
        int mqY = this.height - 105;
        int mqW = 145;
        int mqBtnY = mqY + 62;
        if (mouseX >= mqX + 6 && mouseX <= mqX + mqW - 6 && mouseY >= mqBtnY && mouseY <= mqBtnY + 16) {
            net.minecraft.util.Util.getOperatingSystem().open("https://marinmc.com/quest");
            return true;
        }

        // Bottom-Center Alt Icon Bar clicks
        int ibW = 8 * 22 + 7 * 4;
        int ibX = this.width / 2 - ibW / 2;
        int ibY = this.height - 30;
        for (int i = 0; i < 8; i++) {
            int ix = ibX + i * 26;
            if (mouseX >= ix && mouseX <= ix + 22 && mouseY >= ibY && mouseY <= ibY + 22) {
                executeIconAction(i);
                return true;
            }
        }

        return super.mouseClicked(mouseX, mouseY, button);
    }

    private void executeIconAction(int index) {
        if (this.client == null) return;
        switch (index) {
            case 0: // Moon: Lunar Settings
            case 1: // Shirt: Locker
                this.client.setScreen(new OverlayScreen());
                break;
            case 2: // Social/Satellite Menu
                socialPanelOpen = !socialPanelOpen;
                break;
            case 3: // Gear: Minecraft settings
                this.client.setScreen(new OptionsScreen(this, this.client.options));
                break;
            case 4: // Globe: Language settings
                this.client.setScreen(new LanguageOptionsScreen(this, this.client.options, this.client.getLanguageManager()));
                break;
            case 5: // Crystal: Resource packs
                this.client.setScreen(new PackScreen(this.client.getResourcePackManager(), manager -> {
                    this.client.setScreen(this);
                }, this.client.getResourcePackDir(), Text.literal("Resource Packs")));
                break;
            case 6: // Disconnect from world
                if (this.client.world != null) {
                    this.client.disconnect(new TitleScreen(), false);
                }
                break;
            case 7: // Hamburger: Fabric mod menu / overlays
                this.client.setScreen(new OverlayScreen());
                break;
        }
    }

    @Override
    public boolean keyPressed(int keyCode, int scanCode, int modifiers) {
        if (socialPanelOpen && socialSearchFocused) {
            if (keyCode == 259) { // Backspace
                if (!socialSearchQuery.isEmpty()) {
                    socialSearchQuery = socialSearchQuery.substring(0, socialSearchQuery.length() - 1);
                }
                return true;
            } else if (keyCode == 256 || keyCode == 257) { // Escape or Enter
                socialSearchFocused = false;
                return true;
            }
        }
        return super.keyPressed(keyCode, scanCode, modifiers);
    }

    @Override
    public boolean charTyped(char chr, int modifiers) {
        if (socialPanelOpen && socialSearchFocused) {
            socialSearchQuery += chr;
            return true;
        }
        return super.charTyped(chr, modifiers);
    }

    // Helper to draw Steve skin face
    private void drawSteveFace(DrawContext context, int x, int y, int size) {
        int p = size / 8;
        if (p < 1) p = 1;
        context.fill(x, y, x + size, y + p, 0xFF2D1606);
        context.fill(x, y + p, x + size, y + p * 2, 0xFF2D1606);
        context.fill(x, y + p * 2, x + p, y + p * 3, 0xFF2D1606);
        context.fill(x + p, y + p * 2, x + p * 7, y + p * 3, 0xFFF6C095);
        context.fill(x + p * 7, y + p * 2, x + size, y + p * 3, 0xFF2D1606);
        context.fill(x, y + p * 3, x + p, y + p * 4, 0xFF2D1606);
        context.fill(x + p, y + p * 3, x + size - p, y + p * 4, 0xFFF6C095);
        context.fill(x + size - p, y + p * 3, x + size, y + p * 4, 0xFF2D1606);
        context.fill(x, y + p * 4, x + p, y + p * 5, 0xFFF6C095);
        context.fill(x + p, y + p * 4, x + p * 2, y + p * 5, 0xFFFFFFFF);
        context.fill(x + p * 2, y + p * 4, x + p * 3, y + p * 5, 0xFF2A5AA8);
        context.fill(x + p * 3, y + p * 4, x + p * 5, y + p * 5, 0xFFF6C095);
        context.fill(x + p * 5, y + p * 4, x + p * 6, y + p * 5, 0xFFFFFFFF);
        context.fill(x + p * 6, y + p * 4, x + p * 7, y + p * 5, 0xFF2A5AA8);
        context.fill(x + p * 7, y + p * 4, x + size, y + p * 5, 0xFFF6C095);
        context.fill(x, y + p * 5, x + p * 3, y + p * 6, 0xFFF6C095);
        context.fill(x + p * 3, y + p * 5, x + p * 5, y + p * 6, 0xFF863B2B);
        context.fill(x + p * 5, y + p * 5, x + size, y + p * 6, 0xFFF6C095);
        context.fill(x, y + p * 6, x + p * 2, y + p * 7, 0xFFF6C095);
        context.fill(x + p * 2, y + p * 6, x + p * 6, y + p * 7, 0xFF863B2B);
        context.fill(x + p * 6, y + p * 6, x + size, y + p * 7, 0xFFF6C095);
        context.fill(x, y + p * 7, x + size, y + p * 8, 0xFFF6C095);
    }
}

