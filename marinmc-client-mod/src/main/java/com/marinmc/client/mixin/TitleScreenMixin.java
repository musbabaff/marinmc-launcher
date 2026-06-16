package com.marinmc.client.mixin;

import com.marinmc.client.gui.OverlayScreen;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.gui.screen.Screen;
import net.minecraft.client.gui.screen.TitleScreen;
import net.minecraft.client.gui.screen.multiplayer.ConnectScreen;
import net.minecraft.client.gui.screen.multiplayer.MultiplayerScreen;
import net.minecraft.client.gui.screen.option.OptionsScreen;
import net.minecraft.client.gui.screen.option.LanguageOptionsScreen;
import net.minecraft.client.gui.screen.pack.PackScreen;
import net.minecraft.client.gui.screen.world.SelectWorldScreen;
import net.minecraft.client.gui.widget.ButtonWidget;
import net.minecraft.client.network.ServerAddress;
import net.minecraft.client.network.ServerInfo;
import net.minecraft.text.Text;
import net.minecraft.util.Identifier;
import net.minecraft.client.gl.RenderPipelines;
import net.minecraft.util.Util;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

@Mixin(TitleScreen.class)
public class TitleScreenMixin extends Screen {
    private static final Identifier LOGO_TEXTURE = Identifier.of("marinmc-client", "textures/gui/logo.png");

    // UI state variables
    private boolean accountDropdownOpen = false;
    private boolean themeModalOpen = false;
    private String themeSearchQuery = "";
    private boolean themeSearchFocused = false;
    
    private int hoveredIconIndex = -1;
    private int carouselIndex = 0;
    private int ticks = 0;

    protected TitleScreenMixin(Text title) {
        super(title);
    }

    @Inject(method = "init", at = @At("TAIL"))
    private void onInit(CallbackInfo ci) {
        // Clear default Minecraft buttons
        this.clearChildren();
        
        // Setup center buttons (Singleplayer, Multiplayer, Store)
        int btnW = 180;
        int btnH = 20;
        int btnX = this.width / 2 - btnW / 2;
        int btnY = this.height / 2 - 20;

        // Singleplayer
        this.addDrawableChild(ButtonWidget.builder(
            Text.literal("👤  Singleplayer"),
            button -> {
                if (this.client != null) {
                    this.client.setScreen(new SelectWorldScreen(this));
                }
            }
        ).dimensions(btnX, btnY, btnW, btnH).build());

        // Multiplayer
        this.addDrawableChild(ButtonWidget.builder(
            Text.literal("👥  Multiplayer"),
            button -> {
                if (this.client != null) {
                    this.client.setScreen(new MultiplayerScreen(this));
                }
            }
        ).dimensions(btnX, btnY + 25, btnW, btnH).build());

        // Store
        this.addDrawableChild(ButtonWidget.builder(
            Text.literal("🛒  Store"),
            button -> {
                // Open web store or mock purchase screen
                Util.getOperatingSystem().open("https://store.marinmc.com");
            }
        ).dimensions(btnX, btnY + 50, btnW, btnH).build());
    }

    @Inject(method = "render", at = @At("HEAD"), cancellable = true)
    private void onRender(DrawContext context, int mouseX, int mouseY, float delta, CallbackInfo ci) {
        ticks++;
        if (ticks % 100 == 0) {
            carouselIndex = (carouselIndex + 1) % 3;
        }

        // 1. Draw themed background
        context.drawTexture(
            RenderPipelines.GUI_TEXTURED,
            OverlayScreen.getThemeTexture(),
            0, 0,
            0f, 0f,
            this.width, this.height,
            this.width, this.height
        );
        context.fill(0, 0, this.width, this.height, 0x20000000); // Tint overlay

        // 2. Render Central Logo
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

        // 3. Render Top-Left Account Card
        int alX = 10;
        int alY = 10;
        int alW = 85;
        int alH = 20;
        boolean userCardHovered = mouseX >= alX && mouseX <= alX + alW && mouseY >= alY && mouseY <= alY + alH;
        context.fill(alX, alY, alX + alW, alY + alH, userCardHovered ? 0x60555555 : 0x40000000);
        context.drawBorder(alX, alY, alW, alH, 0x30FFFFFF);
        drawSteveFace(context, alX + 4, alY + 4, 12);
        context.drawTextWithShadow(this.textRenderer, "musbabaff", alX + 20, alY + 6, 0xFFFFFFFF);
        context.drawTextWithShadow(this.textRenderer, "▼", alX + alW - 10, alY + 6, 0xFFA1A1AA);

        // Link chain button next to Account
        int linkX = alX + alW + 4;
        boolean linkHovered = mouseX >= linkX && mouseX <= linkX + 20 && mouseY >= alY && mouseY <= alY + alH;
        context.fill(linkX, alY, linkX + 20, alY + alH, linkHovered ? 0x60555555 : 0x40000000);
        context.drawBorder(linkX, alY, 20, alH, 0x30FFFFFF);
        context.drawCenteredTextWithShadow(this.textRenderer, "🔗", linkX + 10, alY + 6, 0xFFFFFFFF);

        // 4. Render Top-Right Coin Count, Paintbrush, Close
        int trY = 10;
        // Close Button
        int closeX = this.width - 25;
        boolean closeHovered = mouseX >= closeX && mouseX <= closeX + 15 && mouseY >= trY && mouseY <= trY + 15;
        context.fill(closeX, trY, closeX + 15, trY + 15, closeHovered ? 0x60EF4444 : 0x40000000);
        context.drawBorder(closeX, trY, 15, 15, 0x30FFFFFF);
        context.drawCenteredTextWithShadow(this.textRenderer, "✖", closeX + 7, trY + 4, 0xFFFFFFFF);

        // Paintbrush (Theme Modal toggle)
        int paintX = closeX - 22;
        boolean paintHovered = mouseX >= paintX && mouseX <= paintX + 15 && mouseY >= trY && mouseY <= trY + 15;
        context.fill(paintX, trY, paintX + 15, trY + 15, paintHovered ? 0x60BF5BFF : 0x40000000);
        context.drawBorder(paintX, trY, 15, 15, 0x30FFFFFF);
        context.drawCenteredTextWithShadow(this.textRenderer, "🖌", paintX + 8, trY + 4, 0xFFFFFFFF);

        // Gold Coins Pill
        int coinX = paintX - 44;
        int coinW = 38;
        boolean coinHovered = mouseX >= coinX && mouseX <= coinX + coinW && mouseY >= trY && mouseY <= trY + 15;
        context.fill(coinX, trY, coinX + coinW, trY + 15, coinHovered ? 0x60F59E0B : 0x40000000);
        context.drawBorder(coinX, trY, coinW, 15, 0x30FFFFFF);
        context.fill(coinX + 4, trY + 4, coinX + 10, trY + 10, 0xFFF59E0B); // coin dot
        context.drawTextWithShadow(this.textRenderer, "0", coinX + 14, trY + 4, 0xFFFFFFFF);
        context.drawTextWithShadow(this.textRenderer, "+", coinX + coinW - 10, trY + 4, 0xFF64748B);

        // 5. Render Discord Banner below Store button
        int dbX = this.width / 2 - 90;
        int dbY = this.height / 2 + 55;
        int dbW = 180;
        int dbH = 36;
        boolean bannerHovered = mouseX >= dbX && mouseX <= dbX + dbW && mouseY >= dbY && mouseY <= dbY + dbH;
        context.fill(dbX, dbY, dbX + dbW, dbY + dbH, bannerHovered ? 0xF02A2E35 : 0xD01E222A);
        context.drawBorder(dbX, dbY, dbW, dbH, 0x307289DA); // discord blue glow
        drawSteveFace(context, dbX + 6, dbY + 6, 24); // mock discord avatar
        context.drawTextWithShadow(this.textRenderer, "JOIN OUR DISCORD", dbX + 36, dbY + 6, 0xFF7289DA);
        context.drawTextWithShadow(this.textRenderer, "Get Discord-themed cosmetics!", dbX + 36, dbY + 18, 0xFF94A3B8);
        
        // Free cosmetics pill
        int pillX = dbX + dbW - 65;
        context.fill(pillX, dbY + 4, dbX + dbW - 4, dbY + 12, 0xFFA78BFA);
        context.drawCenteredTextWithShadow(this.textRenderer, "FREE COSMETICS!", pillX + 30, dbY + 5, 0xFF000000);

        // 6. Render Bottom-Left Free Medal Quest Card
        int mqX = 10;
        int mqY = this.height - 105;
        int mqW = 145;
        int mqH = 90;
        context.fill(mqX, mqY, mqX + mqW, mqY + mqH, 0xC00B0F19);
        context.drawBorder(mqX, mqY, mqW, mqH, 0x3022C55E); // green border
        context.drawTextWithShadow(this.textRenderer, "🎁 Free Medal Quest", mqX + 6, mqY + 6, 0xFF22C55E);
        
        // Draw 3 item boxes
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

        // 7. Render Bottom-Right News Carousel Card
        int ncX = this.width - 155;
        int ncY = this.height - 105;
        int ncW = 145;
        int ncH = 90;
        context.fill(ncX, ncY, ncX + ncW, ncY + ncH, 0xC00B0F19);
        context.drawBorder(ncX, ncY, ncW, ncH, 0x3064748B);
        
        // News details
        String[] newsTitles = {"Shulker Preview", "Lunar Store 2.0", "New Emote Drop"};
        String[] newsStatus = {"OPTIONS - ENABLED", "SALE - 30% OFF", "NEW WAVE EMOTES"};
        int accentColor = carouselIndex == 0 ? 0xFF22C55E : carouselIndex == 1 ? 0xFFEF4444 : 0xFF3B82F6;
        
        context.drawTextWithShadow(this.textRenderer, newsTitles[carouselIndex], ncX + 8, ncY + 8, 0xFFFFFFFF);
        
        // Inner preview box
        context.fill(ncX + 8, ncY + 22, ncX + ncW - 8, ncY + 62, 0x40000000);
        context.drawBorder(ncX + 8, ncY + 22, ncW - 16, 40, 0x20FFFFFF);
        context.drawCenteredTextWithShadow(this.textRenderer, newsStatus[carouselIndex], ncX + ncW / 2, ncY + 36, accentColor);
        
        // Pagination dots
        for (int i = 0; i < 3; i++) {
            int dx = ncX + ncW / 2 - 12 + i * 10;
            int dy = ncY + 74;
            context.fill(dx, dy, dx + 6, dy + 6, i == carouselIndex ? 0xFFFFFFFF : 0x40FFFFFF);
        }

        // Render widgets (the 3 center buttons)
        super.render(context, mouseX, mouseY, delta);

        // 8. Render Bottom-Center Alt Icon Bar (8 Icons)
        int ibW = 8 * 22 + 7 * 4;
        int ibX = this.width / 2 - ibW / 2;
        int ibY = this.height - 30;
        hoveredIconIndex = -1;

        String[] symbols = {"☾", "👕", "💬", "⚙", "🌐", "⬡", "◀◀", "☰"};
        for (int i = 0; i < 8; i++) {
            int ix = ibX + i * 26;
            boolean iconHovered = mouseX >= ix && mouseX <= ix + 22 && mouseY >= ibY && mouseY <= ibY + 22;
            
            // Draw background fill
            context.fill(ix, ibY, ix + 22, ibY + 22, iconHovered ? 0x60555555 : 0x40000000);
            context.drawBorder(ix, ibY, 22, 22, 0x30FFFFFF);
            
            // Symbol color (Shirt has a green dot if active)
            int symColor = iconHovered ? 0xFFFFFFFF : 0xFFA1A1AA;
            context.drawCenteredTextWithShadow(this.textRenderer, symbols[i], ix + 11, ibY + 7, symColor);
            
            if (i == 1) { // Shirt cosmetic active dot
                context.fill(ix + 18, ibY + 2, ix + 22, ibY + 6, 0xFF22C55E);
            }

            if (iconHovered) {
                hoveredIconIndex = i;
            }
        }

        // Draw tooltips ABOVE the hovered icon if any
        if (hoveredIconIndex != -1 && !themeModalOpen && !accountDropdownOpen) {
            String[] titles = {"Lunar Settings", "Locker", "Satellite", "Minecraft Settings", "Language", "Minecraft Realms", "Rewind Editor", "Fabric Mod Menu"};
            String[] subtitles = {"☾ Lunar", "☾ Lunar", "💬 Satellite", "⚙ Minecraft", "🌐 Language", "⚙ Minecraft", "☾ Lunar", "⬈ External"};
            
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

        // 9. Draw Account Dropdown Panel
        if (accountDropdownOpen) {
            int adX = 10;
            int adY = 32;
            int adW = 160;
            int adH = 95;
            context.fill(adX, adY, adX + adW, adY + adH, 0xF00B0F19);
            context.drawBorder(adX, adY, adW, adH, 0x40FFFFFF);
            
            drawSteveFace(context, adX + 12, adY + 12, 32);
            context.drawTextWithShadow(this.textRenderer, "musbabaff", adX + 50, adY + 14, 0xFFFFFFFF);
            context.drawTextWithShadow(this.textRenderer, "Astronaut", adX + 50, adY + 26, 0xFF64748B);
            context.drawTextWithShadow(this.textRenderer, "since 20 Apr 2021", adX + 50, adY + 36, 0xFF475569);
            
            // Buttons
            int btnY = adY + 52;
            boolean b1Hover = mouseX >= adX + 10 && mouseX <= adX + adW - 10 && mouseY >= btnY && mouseY <= btnY + 16;
            context.fill(adX + 10, btnY, adX + adW - 10, btnY + 16, b1Hover ? 0x60555555 : 0x30555555);
            context.drawBorder(adX + 10, btnY, adW - 20, 16, 0x20FFFFFF);
            context.drawCenteredTextWithShadow(this.textRenderer, "⚙ Account Settings", adX + adW / 2, btnY + 4, 0xFFFFFFFF);
            
            int btn2Y = btnY + 20;
            boolean b2Hover = mouseX >= adX + 10 && mouseX <= adX + adW - 10 && mouseY >= btn2Y && mouseY <= btn2Y + 16;
            context.fill(adX + 10, btn2Y, adX + adW - 10, btn2Y + 16, b2Hover ? 0x60555555 : 0x30555555);
            context.drawBorder(adX + 10, btn2Y, adW - 20, 16, 0x20FFFFFF);
            context.drawCenteredTextWithShadow(this.textRenderer, "👥 Manage Accounts", adX + adW / 2, btn2Y + 4, 0xFFFFFFFF);
        }

        // 10. Draw Theme Selector Modal Popup
        if (themeModalOpen) {
            // Darken main interface further
            context.fill(0, 0, this.width, this.height, 0x50000000);
            
            int tmW = 320;
            int tmH = 180;
            int tmX = this.width / 2 - tmW / 2;
            int tmY = this.height / 2 - tmH / 2;
            
            context.fill(tmX, tmY, tmX + tmW, tmY + tmH, 0xF50B0F19);
            context.drawBorder(tmX, tmY, tmW, tmH, 0xFFBF5BFF); // violet glow
            
            // Header
            context.drawTextWithShadow(this.textRenderer, "🖌 Select Theme", tmX + 12, tmY + 12, 0xFFFFFFFF);
            
            // Close X
            int tmCloseX = tmX + tmW - 20;
            boolean tmCloseHover = mouseX >= tmCloseX && mouseX <= tmCloseX + 10 && mouseY >= tmY + 12 && mouseY <= tmY + 22;
            context.drawTextWithShadow(this.textRenderer, "✖", tmCloseX, tmY + 12, tmCloseHover ? 0xFFEF4444 : 0xFFA1A1AA);
            
            // Search Bar
            int sbX = tmX + 12;
            int sbY = tmY + 28;
            int sbW = tmW - 24;
            int sbH = 16;
            context.fill(sbX, sbY, sbX + sbW, sbY + sbH, themeSearchFocused ? 0x90000000 : 0x50000000);
            context.drawBorder(sbX, sbY, sbW, sbH, themeSearchFocused ? 0xFFBF5BFF : 0x20FFFFFF);
            String displaySearch = themeSearchQuery.isEmpty() ? (themeSearchFocused ? "" : "Search theme...") : themeSearchQuery;
            int searchCol = themeSearchQuery.isEmpty() && !themeSearchFocused ? 0xFF64748B : 0xFFFFFFFF;
            context.drawTextWithShadow(this.textRenderer, displaySearch, sbX + 6, sbY + 4, searchCol);
            
            // Theme choices (4 cards)
            String[] themes = {"classic", "lunar", "spring", "vanilla"};
            String[] themeLabels = {"Classic", "Lunar", "Spring", "Vanilla"};
            int[] themeColors = {0xFF15803D, 0xFF1E1E38, 0xFFF59E0B, 0xFF65A30D};
            
            int cardW = 68;
            int cardH = 48;
            int cardSpacing = 6;
            int cardStartY = tmY + 54;
            
            String currentTheme = OverlayScreen.configStrings.getOrDefault("active_theme", "classic");
            
            for (int i = 0; i < 4; i++) {
                int cx = tmX + 12 + i * (cardW + cardSpacing);
                boolean cardHover = mouseX >= cx && mouseX <= cx + cardW && mouseY >= cardStartY && mouseY <= cardStartY + cardH;
                
                context.fill(cx, cardStartY, cx + cardW, cardStartY + cardH, themeColors[i]);
                
                // Card border
                boolean isActive = themes[i].equalsIgnoreCase(currentTheme);
                int borderColor = isActive ? 0xFFBF5BFF : (cardHover ? 0xFFFFFFFF : 0x20FFFFFF);
                context.drawBorder(cx, cardStartY, cardW, cardH, borderColor);
                
                // Label
                context.drawCenteredTextWithShadow(this.textRenderer, themeLabels[i], cx + cardW / 2, cardStartY + cardH - 12, 0xFFFFFFFF);
                
                // Active indicator dot
                if (isActive) {
                    context.fill(cx + cardW - 10, cardStartY + 4, cx + cardW - 4, cardStartY + 10, 0xFF22C55E);
                }
            }
            
            // Footer status
            context.drawTextWithShadow(this.textRenderer, "Active Theme: " + currentTheme.toUpperCase(), tmX + 12, tmY + tmH - 18, 0xFF94A3B8);
            boolean resetHover = mouseX >= tmX + tmW - 100 && mouseX <= tmX + tmW - 12 && mouseY >= tmY + tmH - 20 && mouseY <= tmY + tmH - 8;
            context.drawTextWithShadow(this.textRenderer, "Reset to default", tmX + tmW - 100, tmY + tmH - 18, resetHover ? 0xFFFFFFFF : 0xFF64748B);
        }

        ci.cancel(); // Prevent standard title screen rendering
    }

    @Override
    public boolean mouseClicked(double mouseX, double mouseY, int button) {
        if (themeModalOpen) {
            int tmW = 320;
            int tmH = 180;
            int tmX = this.width / 2 - tmW / 2;
            int tmY = this.height / 2 - tmH / 2;

            // Close modal click
            int tmCloseX = tmX + tmW - 20;
            if (mouseX >= tmCloseX && mouseX <= tmCloseX + 10 && mouseY >= tmY + 12 && mouseY <= tmY + 22) {
                themeModalOpen = false;
                themeSearchFocused = false;
                return true;
            }

            // Search bar click
            int sbX = tmX + 12;
            int sbY = tmY + 28;
            int sbW = tmW - 24;
            if (mouseX >= sbX && mouseX <= sbX + sbW && mouseY >= sbY && mouseY <= sbY + 16) {
                themeSearchFocused = true;
                return true;
            } else {
                themeSearchFocused = false;
            }

            // Theme card click
            String[] themes = {"classic", "lunar", "spring", "vanilla"};
            int cardW = 68;
            int cardH = 48;
            int cardSpacing = 6;
            int cardStartY = tmY + 54;
            for (int i = 0; i < 4; i++) {
                int cx = tmX + 12 + i * (cardW + cardSpacing);
                if (mouseX >= cx && mouseX <= cx + cardW && mouseY >= cardStartY && mouseY <= cardStartY + cardH) {
                    OverlayScreen.configStrings.put("active_theme", themes[i]);
                    OverlayScreen.saveStringsConfigStatic();
                    return true;
                }
            }

            // Reset to default click
            if (mouseX >= tmX + tmW - 100 && mouseX <= tmX + tmW - 12 && mouseY >= tmY + tmH - 20 && mouseY <= tmY + tmH - 8) {
                OverlayScreen.configStrings.put("active_theme", "classic");
                OverlayScreen.saveStringsConfigStatic();
                return true;
            }

            return true; // Consume all clicks while modal is open
        }

        if (accountDropdownOpen) {
            int adX = 10;
            int adY = 32;
            int adW = 160;
            int adH = 95;

            // Click outside closes dropdown
            if (!(mouseX >= adX && mouseX <= adX + adW && mouseY >= adY && mouseY <= adY + adH)) {
                // Click top-left button also handles toggle below, so only close if not clicking top-left button
                int alX = 10;
                int alY = 10;
                int alW = 85;
                int alH = 20;
                if (!(mouseX >= alX && mouseX <= alX + alW && mouseY >= alY && mouseY <= alY + alH)) {
                    accountDropdownOpen = false;
                }
            } else {
                // Clicking option buttons
                int btnY = adY + 52;
                if (mouseX >= adX + 10 && mouseX <= adX + adW - 10 && mouseY >= btnY && mouseY <= btnY + 16) {
                    // Account Settings click
                    accountDropdownOpen = false;
                    return true;
                }
                int btn2Y = btnY + 20;
                if (mouseX >= adX + 10 && mouseX <= adX + adW - 10 && mouseY >= btn2Y && mouseY <= btn2Y + 16) {
                    // Manage Accounts click
                    accountDropdownOpen = false;
                    return true;
                }
                return true; // Consume clicks inside panel
            }
        }

        // Account Dropdown Toggle Click
        int alX = 10;
        int alY = 10;
        int alW = 85;
        int alH = 20;
        if (mouseX >= alX && mouseX <= alX + alW && mouseY >= alY && mouseY <= alY + alH) {
            accountDropdownOpen = !accountDropdownOpen;
            return true;
        }

        // Link button click
        int linkX = alX + alW + 4;
        if (mouseX >= linkX && mouseX <= linkX + 20 && mouseY >= alY && mouseY <= alY + alH) {
            Util.getOperatingSystem().open("https://marinmc.com");
            return true;
        }

        // Top-Right close button
        int closeX = this.width - 25;
        if (mouseX >= closeX && mouseX <= closeX + 15 && mouseY >= alY && mouseY <= alY + 15) {
            if (this.client != null) {
                this.client.scheduleStop();
            }
            return true;
        }

        // Paintbrush theme modal toggle
        int paintX = closeX - 22;
        if (mouseX >= paintX && mouseX <= paintX + 15 && mouseY >= alY && mouseY <= alY + 15) {
            themeModalOpen = true;
            return true;
        }

        // Gold coin plus click
        int coinX = paintX - 44;
        if (mouseX >= coinX && mouseX <= coinX + 38 && mouseY >= alY && mouseY <= alY + 15) {
            Util.getOperatingSystem().open("https://store.marinmc.com");
            return true;
        }

        // Discord banner click
        int dbX = this.width / 2 - 90;
        int dbY = this.height / 2 + 55;
        int dbW = 180;
        int dbH = 36;
        if (mouseX >= dbX && mouseX <= dbX + dbW && mouseY >= dbY && mouseY <= dbY + dbH) {
            Util.getOperatingSystem().open("https://discord.gg/marinmc");
            return true;
        }

        // Complete Quest button click
        int mqX = 10;
        int mqY = this.height - 105;
        int mqW = 145;
        int mqBtnY = mqY + 62;
        if (mouseX >= mqX + 6 && mouseX <= mqX + mqW - 6 && mouseY >= mqBtnY && mouseY <= mqBtnY + 16) {
            Util.getOperatingSystem().open("https://marinmc.com/quest");
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
            case 2: // Social/Satellite Menu (opens overlay screen or prints chat)
                // For now, toggle social overlay or print mock chat info
                if (this.client.player != null) {
                    this.client.player.sendMessage(Text.literal("§bMarinMC Client §f» §aArkadaş Listesi Yakında!"), true);
                }
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
            case 6: // Reconnect / Join server
                ServerInfo serverInfo = new ServerInfo("MarinMC", "oyna.marinmc.com", ServerInfo.ServerType.OTHER);
                ConnectScreen.connect(
                    this, 
                    this.client, 
                    ServerAddress.parse("oyna.marinmc.com"), 
                    serverInfo, 
                    false, 
                    null
                );
                break;
            case 7: // Hamburger: Fabric mod menu / overlays
                this.client.setScreen(new OverlayScreen());
                break;
        }
    }

    @Override
    public boolean keyPressed(int keyCode, int scanCode, int modifiers) {
        if (themeModalOpen && themeSearchFocused) {
            if (keyCode == 259) { // Backspace
                if (!themeSearchQuery.isEmpty()) {
                    themeSearchQuery = themeSearchQuery.substring(0, themeSearchQuery.length() - 1);
                }
                return true;
            } else if (keyCode == 256 || keyCode == 257) { // Escape or Enter
                themeSearchFocused = false;
                return true;
            }
        }
        return super.keyPressed(keyCode, scanCode, modifiers);
    }

    @Override
    public boolean charTyped(char chr, int modifiers) {
        if (themeModalOpen && themeSearchFocused) {
            themeSearchQuery += chr;
            return true;
        }
        return super.charTyped(chr, modifiers);
    }

    // Helper to draw a pixel-perfect Steve Face
    private void drawSteveFace(DrawContext context, int x, int y, int size) {
        int p = size / 8;
        if (p < 1) p = 1;
        // Row 0: Hair
        context.fill(x, y, x + size, y + p, 0xFF2D1606);
        // Row 1: Hair
        context.fill(x, y + p, x + size, y + p * 2, 0xFF2D1606);
        // Row 2: Hair on sides, forehead in middle
        context.fill(x, y + p * 2, x + p, y + p * 3, 0xFF2D1606);
        context.fill(x + p, y + p * 2, x + p * 7, y + p * 3, 0xFFF6C095);
        context.fill(x + p * 7, y + p * 2, x + size, y + p * 3, 0xFF2D1606);
        // Row 3: Skin, hair L/R
        context.fill(x, y + p * 3, x + p, y + p * 4, 0xFF2D1606);
        context.fill(x + p, y + p * 3, x + size - p, y + p * 4, 0xFFF6C095);
        context.fill(x + size - p, y + p * 3, x + size, y + p * 4, 0xFF2D1606);
        // Row 4: Eyes
        context.fill(x, y + p * 4, x + p, y + p * 5, 0xFFF6C095);
        context.fill(x + p, y + p * 4, x + p * 2, y + p * 5, 0xFFFFFFFF);
        context.fill(x + p * 2, y + p * 4, x + p * 3, y + p * 5, 0xFF2A5AA8);
        context.fill(x + p * 3, y + p * 4, x + p * 5, y + p * 5, 0xFFF6C095);
        context.fill(x + p * 5, y + p * 4, x + p * 6, y + p * 5, 0xFFFFFFFF);
        context.fill(x + p * 6, y + p * 4, x + p * 7, y + p * 5, 0xFF2A5AA8);
        context.fill(x + p * 7, y + p * 4, x + size, y + p * 5, 0xFFF6C095);
        // Row 5: Nose/mouth
        context.fill(x, y + p * 5, x + p * 3, y + p * 6, 0xFFF6C095);
        context.fill(x + p * 3, y + p * 5, x + p * 5, y + p * 6, 0xFF863B2B);
        context.fill(x + p * 5, y + p * 5, x + size, y + p * 6, 0xFFF6C095);
        // Row 6: Mouth
        context.fill(x, y + p * 6, x + p * 2, y + p * 7, 0xFFF6C095);
        context.fill(x + p * 2, y + p * 6, x + p * 6, y + p * 7, 0xFF863B2B);
        context.fill(x + p * 6, y + p * 6, x + size, y + p * 7, 0xFFF6C095);
        // Row 7: Chin
        context.fill(x, y + p * 7, x + size, y + p * 8, 0xFFF6C095);
    }
}
