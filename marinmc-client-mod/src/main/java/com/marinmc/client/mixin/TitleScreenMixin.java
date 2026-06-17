package com.marinmc.client.mixin;

import com.marinmc.client.gui.GlassButtonWidget;
import com.marinmc.client.gui.OverlayScreen;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.gui.screen.Screen;
import net.minecraft.client.gui.screen.TitleScreen;
import net.minecraft.client.gui.screen.multiplayer.MultiplayerScreen;
import net.minecraft.client.gui.screen.option.OptionsScreen;
import net.minecraft.client.gui.screen.option.LanguageOptionsScreen;
import net.minecraft.client.gui.screen.world.SelectWorldScreen;
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

    private boolean accountDropdownOpen = false;
    private int hoveredIconIndex = -1;

    protected TitleScreenMixin(Text title) {
        super(title);
    }

    @Inject(method = "init", at = @At("TAIL"))
    private void onInit(CallbackInfo ci) {
        this.clearChildren();

        int btnW = 200;
        int btnH = 20;
        int btnX = this.width / 2 - btnW / 2;
        int btnY = this.height / 2 - 10;

        // Singleplayer — i18n
        this.addDrawableChild(new GlassButtonWidget(btnX, btnY, btnW, btnH,
            Text.translatable("marinmc.menu.singleplayer"),
            button -> {
                if (this.client != null) this.client.setScreen(new SelectWorldScreen(this));
            }
        ));

        // Multiplayer — i18n
        this.addDrawableChild(new GlassButtonWidget(btnX, btnY + 26, btnW, btnH,
            Text.translatable("marinmc.menu.multiplayer"),
            button -> {
                if (this.client != null) this.client.setScreen(new MultiplayerScreen(this));
            }
        ));

        // Store — i18n
        this.addDrawableChild(new GlassButtonWidget(btnX, btnY + 52, btnW, btnH,
            Text.translatable("marinmc.menu.store"),
            button -> Util.getOperatingSystem().open("https://store.marinmc.com")
        ));
    }

    @Inject(method = "render", at = @At("HEAD"), cancellable = true)
    private void onRender(DrawContext context, int mouseX, int mouseY, float delta, CallbackInfo ci) {
        // 1. Background with proper aspect ratio + blur overlay
        context.drawTexture(
            RenderPipelines.GUI_TEXTURED,
            OverlayScreen.getThemeTexture(),
            0, 0,
            0f, 0f,
            this.width, this.height,
            this.width, this.height
        );
        // Strong dark blur overlay for depth
        context.fill(0, 0, this.width, this.height, 0x88000000);
        // Vignette gradient edges (top+bottom)
        for (int i = 0; i < 40; i++) {
            int alpha = (int)(0x18 * (1.0 - i / 40.0));
            int col = (alpha << 24);
            context.fill(0, i, this.width, i + 1, col);
            context.fill(0, this.height - i - 1, this.width, this.height - i, col);
        }

        // 2. Central Logo ONLY (icon.png, no text below)
        int logoSize = 64;
        int logoX = this.width / 2 - logoSize / 2;
        int logoY = this.height / 2 - 90;
        context.drawTexture(
            RenderPipelines.GUI_TEXTURED,
            LOGO_TEXTURE,
            logoX, logoY,
            0f, 0f,
            logoSize, logoSize,
            logoSize, logoSize
        );

        // 3. Top-Left Account Card — REAL username from session
        String playerName = "Player";
        if (this.client != null && this.client.getSession() != null) {
            playerName = this.client.getSession().getUsername();
        }
        int alX = 10;
        int alY = 10;
        int alW = Math.max(85, this.textRenderer.getWidth(playerName) + 30);
        int alH = 22;
        boolean userCardHovered = mouseX >= alX && mouseX <= alX + alW && mouseY >= alY && mouseY <= alY + alH;
        context.fill(alX, alY, alX + alW, alY + alH, userCardHovered ? 0x70553388 : 0x50000000);
        context.drawBorder(alX, alY, alW, alH, userCardHovered ? 0xA0B180E8 : 0x30FFFFFF);
        drawSteveFace(context, alX + 4, alY + 5, 12);
        context.drawTextWithShadow(this.textRenderer, playerName, alX + 20, alY + 7, 0xFFFFFFFF);
        context.drawTextWithShadow(this.textRenderer, "▼", alX + alW - 12, alY + 7, 0xFFA1A1AA);

        // 4. Top-Right — ONLY close button (no coins, no theme)
        int trY = 10;
        int closeX = this.width - 25;
        boolean closeHovered = mouseX >= closeX && mouseX <= closeX + 15 && mouseY >= trY && mouseY <= trY + 15;
        context.fill(closeX, trY, closeX + 15, trY + 15, closeHovered ? 0x80EF4444 : 0x40000000);
        context.drawBorder(closeX, trY, 15, 15, closeHovered ? 0xC0EF4444 : 0x30FFFFFF);
        context.drawCenteredTextWithShadow(this.textRenderer, "✖", closeX + 7, trY + 4, closeHovered ? 0xFFFFFFFF : 0xFFA1A1AA);

        // 5. Discord Banner — Premium design with pixel-art Discord logo
        int dbX = this.width / 2 - 110;
        int dbY = this.height / 2 + 68;
        int dbW = 220;
        int dbH = 32;
        boolean bannerHovered = mouseX >= dbX && mouseX <= dbX + dbW && mouseY >= dbY && mouseY <= dbY + dbH;
        // Glass background with Discord purple tint
        context.fill(dbX, dbY, dbX + dbW, dbY + dbH, bannerHovered ? 0xD05865F2 : 0xA04752C4);
        context.drawBorder(dbX, dbY, dbW, dbH, bannerHovered ? 0xFF8B9FF2 : 0x805865F2);
        // Pixel-art Discord logo (simplified gamepad shape)
        int dix = dbX + 9;
        int diy = dbY + 8;
        context.fill(dix + 2, diy, dix + 14, diy + 2, 0xFFFFFFFF);       // top bar
        context.fill(dix, diy + 2, dix + 4, diy + 10, 0xFFFFFFFF);       // left side
        context.fill(dix + 12, diy + 2, dix + 16, diy + 10, 0xFFFFFFFF); // right side
        context.fill(dix + 3, diy + 4, dix + 5, diy + 6, 0xFF5865F2);    // left eye
        context.fill(dix + 11, diy + 4, dix + 13, diy + 6, 0xFF5865F2);  // right eye
        context.fill(dix + 2, diy + 10, dix + 6, diy + 14, 0xFFFFFFFF);  // left foot
        context.fill(dix + 10, diy + 10, dix + 14, diy + 14, 0xFFFFFFFF);// right foot
        // i18n text
        String discordTitle = Text.translatable("marinmc.menu.join_discord").getString();
        String discordDesc = Text.translatable("marinmc.menu.discord_desc").getString();
        context.drawTextWithShadow(this.textRenderer, discordTitle, dbX + 32, dbY + 5, 0xFFFFFFFF);
        context.drawTextWithShadow(this.textRenderer, discordDesc, dbX + 32, dbY + 17, 0xFFD0D4FF);

        // Render widgets (3 glass center buttons)
        super.render(context, mouseX, mouseY, delta);

        // 6. Bottom-Center Icon Bar — REDESIGNED, only 5 working icons
        int iconCount = 5;
        int iconSize = 24;
        int iconGap = 6;
        int ibW = iconCount * iconSize + (iconCount - 1) * iconGap;
        int ibX = this.width / 2 - ibW / 2;
        int ibY = this.height - 36;
        hoveredIconIndex = -1;

        String[] symbols = {"☾", "⚙", "🌐", "⬡", "☰"};
        for (int i = 0; i < iconCount; i++) {
            int ix = ibX + i * (iconSize + iconGap);
            boolean iconHovered = mouseX >= ix && mouseX <= ix + iconSize && mouseY >= ibY && mouseY <= ibY + iconSize;

            // Glass background
            context.fill(ix, ibY, ix + iconSize, ibY + iconSize, iconHovered ? 0x70553388 : 0x40000000);
            context.drawBorder(ix, ibY, iconSize, iconSize, iconHovered ? 0xA0B180E8 : 0x25FFFFFF);

            int symColor = iconHovered ? 0xFFFFFFFF : 0xFFA1A1AA;
            context.drawCenteredTextWithShadow(this.textRenderer, symbols[i], ix + iconSize / 2, ibY + 8, symColor);

            if (iconHovered) {
                hoveredIconIndex = i;
            }
        }

        // Tooltips for bottom icons — i18n
        if (hoveredIconIndex != -1 && !accountDropdownOpen) {
            String[] titleKeys = {
                "marinmc.menu.marinmc_settings",
                "marinmc.menu.minecraft_settings",
                "marinmc.menu.language",
                "marinmc.menu.realms",
                "marinmc.menu.fabric_menu"
            };
            String[] subtitleKeys = {
                "marinmc.subtitle.marinmc",
                "marinmc.subtitle.minecraft",
                "marinmc.subtitle.language",
                "marinmc.subtitle.realms",
                "marinmc.subtitle.external"
            };

            String title = Text.translatable(titleKeys[hoveredIconIndex]).getString();
            String subtitle = Text.translatable(subtitleKeys[hoveredIconIndex]).getString();

            int tw = Math.max(90, this.textRenderer.getWidth(title) + 16);
            int th = 28;
            int tx = ibX + hoveredIconIndex * (iconSize + iconGap) + iconSize / 2 - tw / 2;
            int ty = ibY - th - 8;

            context.fill(tx, ty, tx + tw, ty + th, 0xF0070408);
            context.drawBorder(tx, ty, tw, th, 0x60B180E8);
            context.drawCenteredTextWithShadow(this.textRenderer, title, tx + tw / 2, ty + 4, 0xFFFFFFFF);
            context.drawCenteredTextWithShadow(this.textRenderer, subtitle, tx + tw / 2, ty + 15, 0xFF64748B);
        }

        // 7. Account Dropdown Panel (if open) — REAL data + premium/cracked detection
        if (accountDropdownOpen) {
            String dropdownName = "Player";
            boolean isPremium = false;
            if (this.client != null && this.client.getSession() != null) {
                dropdownName = this.client.getSession().getUsername();
                // Detect account type: MSA = premium, anything else = cracked/offline
                try {
                    String accType = this.client.getSession().getAccountType().getName();
                    isPremium = "msa".equalsIgnoreCase(accType);
                } catch (Exception e) {
                    isPremium = false;
                }
            }

            int adX = 10;
            int adY = 34;
            int adW = 170;
            int adH = 80;
            context.fill(adX, adY, adX + adW, adY + adH, 0xF0070408);
            context.drawBorder(adX, adY, adW, adH, 0x60B180E8);

            drawSteveFace(context, adX + 12, adY + 12, 32);
            context.drawTextWithShadow(this.textRenderer, dropdownName, adX + 50, adY + 16, 0xFFFFFFFF);
            // Show Premium or Cracked based on actual account type
            String accLabel = isPremium ? Text.translatable("marinmc.menu.premium").getString() : Text.translatable("marinmc.menu.cracked").getString();
            int accColor = isPremium ? 0xFF22C55E : 0xFFF59E0B;
            context.drawTextWithShadow(this.textRenderer, accLabel, adX + 50, adY + 28, accColor);

            int btnY = adY + 48;
            String accSettingsText = Text.translatable("marinmc.menu.account_settings").getString();
            boolean b1Hover = mouseX >= adX + 10 && mouseX <= adX + adW - 10 && mouseY >= btnY && mouseY <= btnY + 16;
            context.fill(adX + 10, btnY, adX + adW - 10, btnY + 16, b1Hover ? 0x60553388 : 0x30555555);
            context.drawBorder(adX + 10, btnY, adW - 20, 16, b1Hover ? 0xA0B180E8 : 0x20FFFFFF);
            context.drawCenteredTextWithShadow(this.textRenderer, "⚙ " + accSettingsText, adX + adW / 2, btnY + 4, 0xFFFFFFFF);
        }

        ci.cancel();
    }

    @Override
    public boolean mouseClicked(double mouseX, double mouseY, int button) {
        // Close dropdown if open and clicked outside
        if (accountDropdownOpen) {
            int adX = 10;
            int adY = 34;
            int adW = 170;
            int adH = 80;
            if (!(mouseX >= adX && mouseX <= adX + adW && mouseY >= adY && mouseY <= adY + adH)) {
                int alX = 10;
                int alY = 10;
                int alW = 85;
                int alH = 22;
                if (!(mouseX >= alX && mouseX <= alX + alW && mouseY >= alY && mouseY <= alY + alH)) {
                    accountDropdownOpen = false;
                }
            } else {
                int btnY = adY + 48;
                if (mouseX >= adX + 10 && mouseX <= adX + adW - 10 && mouseY >= btnY && mouseY <= btnY + 16) {
                    accountDropdownOpen = false;
                    // Open Minecraft Options as account settings
                    if (this.client != null) {
                        this.client.setScreen(new OptionsScreen(this, this.client.options));
                    }
                    return true;
                }
                return true;
            }
        }

        // Account card toggle
        int alX = 10;
        int alY = 10;
        int alH = 22;
        String playerName = "Player";
        if (this.client != null && this.client.getSession() != null) {
            playerName = this.client.getSession().getUsername();
        }
        int alW = Math.max(85, this.textRenderer.getWidth(playerName) + 30);
        if (mouseX >= alX && mouseX <= alX + alW && mouseY >= alY && mouseY <= alY + alH) {
            accountDropdownOpen = !accountDropdownOpen;
            return true;
        }

        // Close button
        int closeX = this.width - 25;
        if (mouseX >= closeX && mouseX <= closeX + 15 && mouseY >= 10 && mouseY <= 25) {
            if (this.client != null) this.client.scheduleStop();
            return true;
        }

        // Discord banner → marinmc.com/discord
        int dbX = this.width / 2 - 110;
        int dbY = this.height / 2 + 68;
        if (mouseX >= dbX && mouseX <= dbX + 220 && mouseY >= dbY && mouseY <= dbY + 32) {
            Util.getOperatingSystem().open("https://marinmc.com/discord");
            return true;
        }

        // Bottom icon bar
        int iconCount = 5;
        int iconSize = 24;
        int iconGap = 6;
        int ibW = iconCount * iconSize + (iconCount - 1) * iconGap;
        int ibX = this.width / 2 - ibW / 2;
        int ibY = this.height - 36;
        for (int i = 0; i < iconCount; i++) {
            int ix = ibX + i * (iconSize + iconGap);
            if (mouseX >= ix && mouseX <= ix + iconSize && mouseY >= ibY && mouseY <= ibY + iconSize) {
                executeIconAction(i);
                return true;
            }
        }

        return super.mouseClicked(mouseX, mouseY, button);
    }

    private void executeIconAction(int index) {
        if (this.client == null) return;
        switch (index) {
            case 0: // MarinMC Settings → OverlayScreen
                this.client.setScreen(new OverlayScreen());
                break;
            case 1: // Minecraft Settings
                this.client.setScreen(new OptionsScreen(this, this.client.options));
                break;
            case 2: // Language
                this.client.setScreen(new LanguageOptionsScreen(this, this.client.options, this.client.getLanguageManager()));
                break;
            case 3: // Minecraft Realms — actually open Realms
                try {
                    this.client.setScreen(new net.minecraft.client.realms.gui.screen.RealmsMainScreen(this));
                } catch (Exception e) {
                    if (this.client.player != null) {
                        this.client.player.sendMessage(Text.literal("§cRealms is not available."), true);
                    }
                }
                break;
            case 4: // Fabric Mod Menu — open actual Fabric mod menu
                try {
                    Class<?> modMenuClass = Class.forName("com.terraformersmc.modmenu.gui.ModsScreen");
                    Screen modMenuScreen = (Screen) modMenuClass.getConstructor(Screen.class).newInstance(this);
                    this.client.setScreen(modMenuScreen);
                } catch (Exception e) {
                    // Fallback to OverlayScreen if Mod Menu not installed
                    this.client.setScreen(new OverlayScreen());
                }
                break;
        }
    }

    // Helper to draw a pixel-perfect Steve Face
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
