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

        // 3. Top-Left Logo + Text (Altın/beyaz çerçeveli küçük logo ve mavi "MarinMC" yazısı)
        int logoSizeSmall = 16;
        int logoSmallX = 14;
        int logoSmallY = 13;

        // Draw gold/white container border
        context.fill(10, 10, 115, 32, 0x50000000);
        context.drawBorder(10, 10, 105, 22, 0xFFFFD700); // Gold border

        // Draw the logo inside it
        context.drawTexture(
            RenderPipelines.GUI_TEXTURED,
            LOGO_TEXTURE,
            logoSmallX, logoSmallY,
            0f, 0f,
            logoSizeSmall, logoSizeSmall,
            logoSizeSmall, logoSizeSmall
        );

        // Draw "MarinMC" text in blue
        context.drawTextWithShadow(this.textRenderer, "MarinMC", logoSmallX + 22, logoSmallY + 4, 0xFF2D7DD2);

        // 5. Horizontal Social Media Bar (Discord, Instagram, TikTok, YouTube)
        int socialBarW = 140;
        int socialBarH = 28;
        int socialBarX = this.width / 2 - socialBarW / 2;
        int socialBarY = this.height / 2 + 68;

        // Deep glass background with theme blue border
        context.fill(socialBarX, socialBarY, socialBarX + socialBarW, socialBarY + socialBarH, 0x60000000);
        context.drawBorder(socialBarX, socialBarY, socialBarW, socialBarH, 0x802D7DD2); // Theme blue border

        int buttonSize = 22;
        int gap = 8;
        int startX = socialBarX + 12;
        int startY = socialBarY + 3;

        for (int i = 0; i < 4; i++) {
            int bx = startX + i * (buttonSize + gap);
            boolean btnHovered = mouseX >= bx && mouseX <= bx + buttonSize && mouseY >= startY && mouseY <= startY + buttonSize;

            // Hover background
            context.fill(bx, startY, bx + buttonSize, startY + buttonSize, btnHovered ? 0x802D7DD2 : 0x20FFFFFF);
            context.drawBorder(bx, startY, buttonSize, buttonSize, btnHovered ? 0xFFFFD700 : 0x30FFFFFF); // Gold on hover

            int color = btnHovered ? 0xFFFFFFFF : 0xFFA1A1AA;
            String letter = "";
            if (i == 0) letter = "D"; // Discord
            else if (i == 1) letter = "I"; // Instagram
            else if (i == 2) letter = "T"; // TikTok
            else if (i == 3) letter = "Y"; // YouTube

            context.drawCenteredTextWithShadow(this.textRenderer, letter, bx + buttonSize / 2, startY + 7, color);
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

            String title = Text.translatable(titleKeys[hoveredIconIndex]).getString();
            String subtitle = Text.translatable(subtitleKeys[hoveredIconIndex]).getString();

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
        // Social Media Bar click handlers
        int socialBarW = 140;
        int socialBarH = 28;
        int socialBarX = this.width / 2 - socialBarW / 2;
        int socialBarY = this.height / 2 + 68;
        if (mouseY >= socialBarY + 3 && mouseY <= socialBarY + 25) {
            int buttonSize = 22;
            int gap = 8;
            int startX = socialBarX + 12;
            for (int i = 0; i < 4; i++) {
                int bx = startX + i * (buttonSize + gap);
                if (mouseX >= bx && mouseX <= bx + buttonSize) {
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
