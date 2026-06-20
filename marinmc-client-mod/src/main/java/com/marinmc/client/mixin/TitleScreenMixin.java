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
import net.minecraft.client.resource.language.I18n;

import net.minecraft.client.gl.RenderPipelines;
import net.minecraft.util.Util;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

@Mixin(TitleScreen.class)
public class TitleScreenMixin extends Screen {
    private static final Identifier LOGO_TEXTURE = Identifier.of("marinmc-client", "textures/gui/logo.png");
    private static final Identifier DISCORD_ICON = Identifier.of("marinmc-client", "textures/gui/discord.png");
    private static final Identifier INSTAGRAM_ICON = Identifier.of("marinmc-client", "textures/gui/instagram.png");
    private static final Identifier TIKTOK_ICON = Identifier.of("marinmc-client", "textures/gui/tiktok.png");
    private static final Identifier YOUTUBE_ICON = Identifier.of("marinmc-client", "textures/gui/youtube.png");

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

        // 2. Central Logo — enlarged and moved higher for premium look
        int logoSize = 96;
        int logoX = this.width / 2 - logoSize / 2;
        int logoY = this.height / 2 - 125;
        context.drawTexture(
            RenderPipelines.GUI_TEXTURED,
            LOGO_TEXTURE,
            logoX, logoY,
            0f, 0f,
            logoSize, logoSize,
            logoSize, logoSize
        );

        // 3. Top-Left Logo + Brand Signature — premium bold glow style
        int logoSizeSmall = 20;
        int logoSmallX = 14;
        int logoSmallY = 10;

        // Subtle glass background behind brand
        context.fill(10, 7, 100, 34, 0x18FFFFFF);

        // Draw the logo icon
        context.drawTexture(
            RenderPipelines.GUI_TEXTURED,
            LOGO_TEXTURE,
            logoSmallX, logoSmallY,
            0f, 0f,
            logoSizeSmall, logoSizeSmall,
            logoSizeSmall, logoSizeSmall
        );

        // Draw bold two-tone brand text with double render for thickness
        int textX = logoSmallX + 24;
        int textY = logoSmallY + 6;
        int marinWidth = this.textRenderer.getWidth("MARIN");
        // Glow layer (offset by 1px for bold effect)
        context.drawTextWithShadow(this.textRenderer, "MARIN", textX + 1, textY, 0x9055FFFF);
        context.drawTextWithShadow(this.textRenderer, "MC", textX + marinWidth + 1, textY, 0x902D7DD2);
        // Main layer
        context.drawTextWithShadow(this.textRenderer, "MARIN", textX, textY, 0xFF55FFFF);
        context.drawTextWithShadow(this.textRenderer, "MC", textX + marinWidth, textY, 0xFF2D7DD2);
        // Subtle glow underline
        int totalTextW = this.textRenderer.getWidth("MARINMC");
        context.fill(textX, textY + 11, textX + totalTextW, textY + 12, 0x3055FFFF);

        // 5. Social Media — clean minimal circular buttons
        int socialBtnSize = 30;
        int socialIconSize = 16;
        int socialGap = 14;
        int totalSocialW = 4 * socialBtnSize + 3 * socialGap;
        int socialStartX = this.width / 2 - totalSocialW / 2;
        int socialStartY = this.height / 2 + 72;

        Identifier[] socialIcons = { DISCORD_ICON, INSTAGRAM_ICON, TIKTOK_ICON, YOUTUBE_ICON };

        for (int i = 0; i < 4; i++) {
            int bx = socialStartX + i * (socialBtnSize + socialGap);
            int by = socialStartY;
            boolean btnHovered = mouseX >= bx && mouseX <= bx + socialBtnSize && mouseY >= by && mouseY <= by + socialBtnSize;

            // Clean circular glass button
            int bgColor = btnHovered ? 0x50FFFFFF : 0x18FFFFFF;
            int borderColor = btnHovered ? 0x80FFFFFF : 0x20FFFFFF;

            // Rounded button shape using layered fills
            context.fill(bx + 3, by, bx + socialBtnSize - 3, by + socialBtnSize, bgColor);
            context.fill(bx, by + 3, bx + socialBtnSize, by + socialBtnSize - 3, bgColor);
            context.fill(bx + 1, by + 1, bx + socialBtnSize - 1, by + socialBtnSize - 1, bgColor);

            // Thin rounded border
            context.fill(bx + 3, by, bx + socialBtnSize - 3, by + 1, borderColor);
            context.fill(bx + 3, by + socialBtnSize - 1, bx + socialBtnSize - 3, by + socialBtnSize, borderColor);
            context.fill(bx, by + 3, bx + 1, by + socialBtnSize - 3, borderColor);
            context.fill(bx + socialBtnSize - 1, by + 3, bx + socialBtnSize, by + socialBtnSize - 3, borderColor);
            context.fill(bx + 1, by + 1, bx + 2, by + 2, borderColor);
            context.fill(bx + socialBtnSize - 2, by + 1, bx + socialBtnSize - 1, by + 2, borderColor);
            context.fill(bx + 1, by + socialBtnSize - 2, bx + 2, by + socialBtnSize - 1, borderColor);
            context.fill(bx + socialBtnSize - 2, by + socialBtnSize - 2, bx + socialBtnSize - 1, by + socialBtnSize - 1, borderColor);

            // Hover: bottom accent glow line
            if (btnHovered) {
                context.fill(bx + 4, by + socialBtnSize, bx + socialBtnSize - 4, by + socialBtnSize + 2, 0x602D7DD2);
            }

            // Draw social icon centered
            int iconOffX = bx + (socialBtnSize - socialIconSize) / 2;
            int iconOffY = by + (socialBtnSize - socialIconSize) / 2;
            context.drawTexture(
                RenderPipelines.GUI_TEXTURED,
                socialIcons[i],
                iconOffX, iconOffY,
                0f, 0f,
                socialIconSize, socialIconSize,
                socialIconSize, socialIconSize
            );
        }

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
            context.fill(ix, ibY, ix + iconSize, ibY + iconSize, iconHovered ? 0x70132247 : 0x40000000);
            context.drawBorder(ix, ibY, iconSize, iconSize, iconHovered ? 0xFFFFD700 : 0x25FFFFFF);

            int symColor = iconHovered ? 0xFFFFFFFF : 0xFFA1A1AA;
            context.drawCenteredTextWithShadow(this.textRenderer, symbols[i], ix + iconSize / 2, ibY + 8, symColor);

            if (iconHovered) {
                hoveredIconIndex = i;
            }
        }

        // Tooltips for bottom icons — i18n
        if (hoveredIconIndex != -1) {
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

            String title = I18n.translate(titleKeys[hoveredIconIndex]);
            String subtitle = I18n.translate(subtitleKeys[hoveredIconIndex]);

            int tw = Math.max(90, this.textRenderer.getWidth(title) + 16);
            int th = 28;
            int tx = ibX + hoveredIconIndex * (iconSize + iconGap) + iconSize / 2 - tw / 2;
            int ty = ibY - th - 8;

            context.fill(tx, ty, tx + tw, ty + th, 0xF0080D1A);
            context.drawBorder(tx, ty, tw, th, 0x802D7DD2);
            context.drawCenteredTextWithShadow(this.textRenderer, title, tx + tw / 2, ty + 4, 0xFFFFFFFF);
            context.drawCenteredTextWithShadow(this.textRenderer, subtitle, tx + tw / 2, ty + 15, 0xFF64748B);
        }

        ci.cancel();
    }

    @Override
    public boolean mouseClicked(double mouseX, double mouseY, int button) {
        // Social Media circular buttons click handlers
        int socialBtnSize = 30;
        int socialGap = 14;
        int totalSocialW = 4 * socialBtnSize + 3 * socialGap;
        int socialStartX = this.width / 2 - totalSocialW / 2;
        int socialStartY = this.height / 2 + 72;
        if (mouseY >= socialStartY && mouseY <= socialStartY + socialBtnSize) {
            for (int i = 0; i < 4; i++) {
                int bx = socialStartX + i * (socialBtnSize + socialGap);
                if (mouseX >= bx && mouseX <= bx + socialBtnSize) {
                    String[] socialUrls = {
                        "https://marinmc.com/discord",
                        "https://instagram.com/marinmc",
                        "https://tiktok.com/@marinmc",
                        "https://youtube.com/@marinmc"
                    };
                    Util.getOperatingSystem().open(socialUrls[i]);
                    return true;
                }
            }
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
}
